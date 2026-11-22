from datetime import date, timedelta
import re
from django.utils.timezone import now
from django.db import transaction
from django.db.models import Sum, Q
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
import calendar

from administrasi.models import (
    ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, KategoriKeluhan, Keluhan, RiwayatStatusKeluhan, Informasi
)
from .serializers import (
    KamarSerializer, PenghuniSerializer, TagihanSerializer,
    BuktiPembayaranSerializer, KategoriKeluhanSerializer, KeluhanSerializer, 
    CustomTokenObtainPairSerializer, AkunStaffSerializer, InformasiSerializer
)
from .permissions import IsPengurus, IsPemilik

# --- AUTH & PROFILE ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_diri(request):
    user = request.user
    role = 'unknown'
    if hasattr(user, 'profiluser'):
        role = user.profiluser.role
    elif Penghuni.objects.filter(user=user).exists():
        role = 'penghuni'
    elif user.is_superuser:
        role = 'superadmin'

    kamar_data = None
    penghuni = Penghuni.objects.select_related('kamar').filter(user=user).first()
    if penghuni and penghuni.kamar:
        kamar_data = {
            'id': penghuni.kamar.id,
            'nomor_kamar': penghuni.kamar.nomor_kamar,
            'tipe': penghuni.kamar.tipe,
            'harga_sewa': penghuni.kamar.harga_sewa,
            'fasilitas': penghuni.kamar.fasilitas,
            'status': penghuni.kamar.status,
        }

    return Response({
        'id': user.id,
        'username': user.username,
        'nama_lengkap': user.first_name,
        'role': role,
        'kamar': kamar_data,
    })

# --- KAMAR (CRUD Pengurus) ---
class KamarListCreateAPI(generics.ListCreateAPIView):
    queryset = Kamar.objects.all().order_by('nomor_kamar')
    serializer_class = KamarSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        kamar = serializer.save()
        _sinkron_status_kamar(kamar)


class KamarDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Kamar.objects.all()
    serializer_class = KamarSerializer
    permission_classes = [IsPengurus]

    def perform_update(self, serializer):
        kamar = serializer.save()
        _sinkron_status_kamar(kamar)

# --- PENGHUNI (Otomatis Buat User & Update Status Kamar) ---
class PenghuniListCreateAPI(generics.ListCreateAPIView):
    queryset = Penghuni.objects.all().order_by('-id')
    serializer_class = PenghuniSerializer
    permission_classes = [IsPengurus]

    def create(self, request, *args, **kwargs):
        nama = (request.data.get('nama_lengkap') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        no_identitas = (request.data.get('no_identitas') or '').strip()
        no_kontak = (request.data.get('no_kontak') or '').strip()
        kamar_id = request.data.get('kamar')
        tanggal_masuk = request.data.get('tanggal_masuk')

        if not nama or not email or not password:
            return Response(
                {'detail': 'Nama lengkap, email, dan kata sandi awal wajib diisi.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(password) < 8:
            return Response(
                {'detail': 'Kata sandi awal minimal 8 karakter.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
            return Response({'detail': 'Email sudah terdaftar di sistem.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user_baru = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=nama
            )
            ProfilUser.objects.create(user=user_baru, role='penghuni')

            kamar = Kamar.objects.get(id=kamar_id)
            if Penghuni.objects.filter(kamar=kamar, status_aktif=True).count() >= 2:
                return Response({'detail': 'Kamar ini sudah terisi penuh (maksimal 2 orang).'}, status=status.HTTP_400_BAD_REQUEST)

            penghuni = Penghuni.objects.create(
                user=user_baru,
                kamar=kamar,
                no_identitas=no_identitas or '-',
                no_kontak=no_kontak,
                tanggal_masuk=tanggal_masuk
            )
            _sinkron_status_kamar(kamar)
            _pastikan_tagihan_kamar_aktif(kamar, penghuni)

        serializer = self.get_serializer(penghuni)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

def _sinkron_status_kamar(kamar):
    if not kamar:
        return
    jumlah_aktif = Penghuni.objects.filter(kamar=kamar, status_aktif=True).count()
    pakai_fasilitas = (kamar.biaya_fasilitas or 0) > 0

    if jumlah_aktif == 0:
        kamar.status = 'tersedia'
        kamar.tipe = 'individu'
        kamar.biaya_fasilitas = 0
        kamar.harga_sewa = kamar.harga_individu
    elif jumlah_aktif == 1:
        kamar.status = 'terisi'
        kamar.tipe = 'individu'
        if pakai_fasilitas:
            kamar.biaya_fasilitas = 200000
        kamar.harga_sewa = kamar.harga_individu + kamar.biaya_fasilitas
    else:
        kamar.status = 'terisi'
        kamar.tipe = 'berdua'
        if pakai_fasilitas:
            kamar.biaya_fasilitas = 310000
        kamar.harga_sewa = kamar.harga_berdua + kamar.biaya_fasilitas

    kamar.save(update_fields=['status', 'tipe', 'biaya_fasilitas', 'harga_sewa'])

NAMA_BULAN_ID = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

def _pastikan_tagihan_kamar_aktif(kamar, penghuni_referensi=None):
    if not kamar:
        return
    penghuni_utama = (
        Penghuni.objects.filter(kamar=kamar, status_aktif=True)
        .order_by('tanggal_masuk', 'id')
        .first()
    ) or penghuni_referensi
    if not penghuni_utama:
        return

    hari_ini = now().date()
    periode_ini = f"{NAMA_BULAN_ID[hari_ini.month]} {hari_ini.year}"

    tagihan_bulan_ini = Tagihan.objects.filter(
        penghuni__kamar=kamar,
        periode__iexact=periode_ini
    ).first()

    if not tagihan_bulan_ini:
        jatuh_tempo = _jatuh_tempo_siklus_masuk(penghuni_utama.tanggal_masuk, hari_ini)
        Tagihan.objects.create(
            penghuni=penghuni_utama,
            periode=periode_ini,
            nominal=kamar.harga_sewa,
            jatuh_tempo=jatuh_tempo,
            status='belum_dibayar'
        )
    elif tagihan_bulan_ini.status in ['belum_dibayar', 'terlambat', 'ditolak']:
        tagihan_bulan_ini.nominal = kamar.harga_sewa
        tagihan_bulan_ini.save(update_fields=['nominal'])

class PenghuniDetailAPI(generics.RetrieveUpdateAPIView):
    queryset = Penghuni.objects.select_related('user', 'kamar').all()
    serializer_class = PenghuniSerializer
    permission_classes = [IsPengurus]

    def patch(self, request, *args, **kwargs):
        penghuni = self.get_object()
        user = penghuni.user
        kamar_lama = penghuni.kamar

        nama = request.data.get('nama_lengkap')
        email = request.data.get('email')
        no_identitas = request.data.get('no_identitas')
        no_kontak = request.data.get('no_kontak')
        tanggal_masuk = request.data.get('tanggal_masuk')
        aksi = request.data.get('aksi')  # opsional: 'checkout' | 'aktifkan'

        with transaction.atomic():
            # 1. Validasi & update email jika diubah
            if email is not None:
                email_bersih = email.strip().lower()
                if not email_bersih:
                    return Response({'detail': 'Email tidak boleh kosong.'}, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.filter(email__iexact=email_bersih).exclude(pk=user.pk).exists():
                    return Response({'detail': 'Email sudah digunakan oleh akun lain.'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = email_bersih
                user.username = email_bersih

            if nama is not None:
                nama_bersih = nama.strip()
                if not nama_bersih:
                    return Response({'detail': 'Nama lengkap tidak boleh kosong.'}, status=status.HTTP_400_BAD_REQUEST)
                user.first_name = nama_bersih

            # 2. Proses Checkout / Aktifkan kembali / Pindah Kamar
            if aksi == 'checkout':
                penghuni.status_aktif = False
                penghuni.kamar = None
                user.is_active = False
            else:
                if aksi == 'aktifkan':
                    penghuni.status_aktif = True
                    user.is_active = True

                if 'kamar' in request.data:
                    kamar_baru_id = request.data.get('kamar')
                    if kamar_baru_id:
                        try:
                            kamar_baru = Kamar.objects.get(pk=kamar_baru_id)
                        except Kamar.DoesNotExist:
                            return Response({'detail': 'Kamar tujuan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

                        if kamar_lama != kamar_baru and Penghuni.objects.filter(kamar=kamar_baru, status_aktif=True).count() >= 2:
                            return Response({'detail': 'Kamar tujuan sudah terisi penuh (maksimal 2 orang).'}, status=status.HTTP_400_BAD_REQUEST)
                        penghuni.kamar = kamar_baru
                    elif penghuni.status_aktif:
                        return Response({'detail': 'Penghuni aktif harus menempati kamar.'}, status=status.HTTP_400_BAD_REQUEST)

            if no_identitas is not None:
                penghuni.no_identitas = no_identitas.strip() or '-'
            if no_kontak is not None:
                penghuni.no_kontak = no_kontak.strip()
            if tanggal_masuk is not None:
                penghuni.tanggal_masuk = tanggal_masuk

            user.save()
            penghuni.save()

            # 3. Sinkronkan status kamar lama & kamar baru
            _sinkron_status_kamar(kamar_lama)
            if penghuni.kamar and penghuni.kamar != kamar_lama:
             _sinkron_status_kamar(penghuni.kamar)
            if penghuni.status_aktif and penghuni.kamar:
             _pastikan_tagihan_kamar_aktif(penghuni.kamar, penghuni)

        serializer = self.get_serializer(penghuni)
        return Response(serializer.data, status=status.HTTP_200_OK)

# --- TAGIHAN & GENERATE TAGIHAN BULANAN ---
class TagihanListCreateAPI(generics.ListCreateAPIView):
    serializer_class = TagihanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if (hasattr(user, 'profiluser') and user.profiluser.role in ['pengurus', 'pemilik']) or user.is_superuser:
            return Tagihan.objects.all().order_by('-id')
        penghuni = Penghuni.objects.filter(user=user).first()
        if not penghuni:
            return Tagihan.objects.none()
        if penghuni.kamar:
            harga_berdua = penghuni.kamar.harga_berdua or 800000
            return Tagihan.objects.filter(
                Q(penghuni=penghuni) |
                Q(
                    penghuni__kamar=penghuni.kamar,
                    nominal__gte=harga_berdua,
                    jatuh_tempo__gte=penghuni.tanggal_masuk,
                )
            ).distinct().order_by('-id')
        return Tagihan.objects.filter(penghuni=penghuni).order_by('-id')
    
class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ganti_password_api(request):
    password_lama = request.data.get('password_lama', '')
    password_baru = request.data.get('password_baru', '')

    if not request.user.check_password(password_lama):
        return Response({'detail': 'Kata sandi saat ini salah.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password_baru) < 8:
        return Response({'detail': 'Kata sandi baru minimal 8 karakter.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(password_baru)
    request.user.save()
    return Response({'detail': 'Kata sandi berhasil diperbarui.'}, status=status.HTTP_200_OK)

BULAN_MAP = {
    'januari': 1, 'january': 1, 'jan': 1,
    'februari': 2, 'february': 2, 'feb': 2,
    'maret': 3, 'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'mei': 5, 'may': 5,
    'juni': 6, 'june': 6, 'jun': 6,
    'juli': 7, 'july': 7, 'jul': 7,
    'agustus': 8, 'august': 8, 'agu': 8, 'agt': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'october': 10, 'okt': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'desember': 12, 'december': 12, 'des': 12, 'dec': 12,
}


def _parse_bulan_tahun_periode(periode_str, tahun_default):
    teks = (periode_str or '').strip().lower()
    m = re.search(r'([a-z]+)\s*(\d{4})?', teks)
    if not m:
        return None
    bulan = BULAN_MAP.get(m.group(1))
    if not bulan:
        return None
    tahun = int(m.group(2)) if m.group(2) else tahun_default
    return (tahun, bulan)


def _tanggal_siklus_pada_bulan(tanggal_masuk, tahun, bulan):
    hari_maks = calendar.monthrange(tahun, bulan)[1]
    return date(tahun, bulan, min(tanggal_masuk.day, hari_maks))


def _jatuh_tempo_siklus_masuk(tanggal_masuk, tanggal_acuan):
    """Menentukan tanggal jatuh tempo berdasarkan hari dari tanggal_masuk penghuni."""
    tahun = tanggal_acuan.year
    bulan = tanggal_acuan.month
    kandidat = _tanggal_siklus_pada_bulan(tanggal_masuk, tahun, bulan)

    if kandidat < tanggal_acuan - timedelta(days=7):
        if bulan == 12:
            tahun += 1
            bulan = 1
        else:
            bulan += 1
        kandidat = _tanggal_siklus_pada_bulan(tanggal_masuk, tahun, bulan)
    return kandidat


@api_view(['POST'])
@permission_classes([IsPengurus])
def generate_tagihan_bulanan(request):
    periode = (request.data.get('periode') or '').strip()
    if not periode:
        return Response({'detail': 'Periode wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    kamar_terisi = Kamar.objects.filter(penghuni__status_aktif=True).distinct().order_by('nomor_kamar')
    created_count = 0
    skipped_count = 0
    hari_ini = now().date()

    with transaction.atomic():
        for kamar in kamar_terisi:
            # Cegah tagihan ganda untuk kamar & periode yang sama
            sudah_ada = Tagihan.objects.filter(
                penghuni__kamar=kamar,
                periode__iexact=periode
            ).exists()
            if sudah_ada:
                skipped_count += 1
                continue

            # Ambil penghuni utama (pertama masuk) sebagai perwakilan tagihan kamar
            penghuni_utama = (
                Penghuni.objects.filter(kamar=kamar, status_aktif=True)
                .order_by('tanggal_masuk', 'id')
                .first()
            )
            if not penghuni_utama:
                continue

            nominal = kamar.harga_sewa
            parsed_periode = _parse_bulan_tahun_periode(periode, hari_ini.year)
            if parsed_periode:
                jatuh_tempo = _tanggal_siklus_pada_bulan(
                    penghuni_utama.tanggal_masuk,
                    parsed_periode[0],
                    parsed_periode[1],
                )
            else:
                tagihan_terakhir = (
                    Tagihan.objects.filter(penghuni__kamar=kamar)
                    .order_by('-jatuh_tempo', '-id')
                    .first()
                )
                if tagihan_terakhir:
                    t_prev = tagihan_terakhir.jatuh_tempo
                    thn_next = t_prev.year + (1 if t_prev.month == 12 else 0)
                    bln_next = 1 if t_prev.month == 12 else t_prev.month + 1
                    jatuh_tempo = _tanggal_siklus_pada_bulan(
                        penghuni_utama.tanggal_masuk, thn_next, bln_next
                    )
                else:
                    jatuh_tempo = _jatuh_tempo_siklus_masuk(penghuni_utama.tanggal_masuk, hari_ini)
            Tagihan.objects.create(
                penghuni=penghuni_utama,
                periode=periode,
                nominal=nominal,
                jatuh_tempo=jatuh_tempo,
                status='belum_dibayar'
            )
            created_count += 1

    pesan = f'{created_count} tagihan kamar berhasil dibuat untuk periode {periode}.'
    if skipped_count:
        pesan += f' ({skipped_count} kamar dilewati karena sudah memiliki tagihan periode ini.)'
    return Response({'detail': pesan})

# --- BUKTI PEMBAYARAN & VERIFIKASI PENGURUS ---
class BuktiPembayaranListCreateAPI(generics.ListCreateAPIView):
    serializer_class = BuktiPembayaranSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if (hasattr(user, 'profiluser') and user.profiluser.role.lower() == 'pengurus') or user.is_superuser:
            return BuktiPembayaran.objects.all().order_by('-waktu_unggah')
        penghuni = Penghuni.objects.filter(user=user).first()
        if penghuni and penghuni.kamar:
            return BuktiPembayaran.objects.filter(
                Q(tagihan__penghuni__kamar=penghuni.kamar) | Q(diunggah_oleh__user=user)
            ).distinct().order_by('-waktu_unggah')
        return BuktiPembayaran.objects.filter(
            Q(tagihan__penghuni__user=user) | Q(diunggah_oleh__user=user)
        ).distinct().order_by('-waktu_unggah')

    def perform_create(self, serializer):
        with transaction.atomic():
            pengunggah = Penghuni.objects.filter(user=self.request.user).first()
            bukti = serializer.save(status='menunggu_verifikasi', diunggah_oleh=pengunggah)
            tagihan = bukti.tagihan
            tagihan.status = 'menunggu_verifikasi'
            tagihan.save()

@api_view(['POST'])
@permission_classes([IsPengurus])
def proses_verifikasi_api(request, bukti_id):
    aksi = request.data.get('aksi') # 'terima' atau 'tolak'
    catatan = request.data.get('catatan_penolakan', '')

    try:
        bukti = BuktiPembayaran.objects.get(id=bukti_id)
    except BuktiPembayaran.DoesNotExist:
        return Response({'detail': 'Bukti pembayaran tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    with transaction.atomic():
        tagihan = bukti.tagihan
        if aksi == 'terima':
            bukti.status = 'diterima'
            tagihan.status = 'lunas'
        elif aksi == 'tolak':
            bukti.status = 'ditolak'
            bukti.catatan_penolakan = catatan
            tagihan.status = 'ditolak'
        else:
            return Response({'detail': 'Aksi tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

        bukti.tanggal_verifikasi = now().date()
        bukti.verifikator = request.user
        bukti.save()
        tagihan.save()

    return Response({'detail': f'Pembayaran berhasil di-{aksi}.'})

# --- KELUHAN & PROSES KELUHAN ---
class KategoriKeluhanListAPI(generics.ListAPIView):
    queryset = KategoriKeluhan.objects.all()
    serializer_class = KategoriKeluhanSerializer
    permission_classes = [IsAuthenticated]

class KeluhanListCreateAPI(generics.ListCreateAPIView):
    serializer_class = KeluhanSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if (hasattr(user, 'profiluser') and user.profiluser.role in ['pengurus', 'pemilik']) or user.is_superuser:
            return Keluhan.objects.all().order_by('-tanggal_kirim')
        penghuni = Penghuni.objects.filter(user=user).first()
        if not penghuni:
            return Keluhan.objects.none()
        if penghuni.kamar:
            return Keluhan.objects.filter(penghuni__kamar=penghuni.kamar).order_by('-tanggal_kirim')
        return Keluhan.objects.filter(penghuni=penghuni).order_by('-tanggal_kirim')

    def perform_create(self, serializer):
        penghuni = Penghuni.objects.get(user=self.request.user)
        keluhan = serializer.save(penghuni=penghuni)
        RiwayatStatusKeluhan.objects.create(
            keluhan=keluhan,
            status=keluhan.status,
            catatan='Keluhan dikirim oleh penghuni.'
        )


class KeluhanUpdateAPI(generics.UpdateAPIView):
    queryset = Keluhan.objects.all()
    serializer_class = KeluhanSerializer
    permission_classes = [IsPengurus]

    def perform_update(self, serializer):
        keluhan = serializer.save()
        RiwayatStatusKeluhan.objects.create(
            keluhan=keluhan,
            status=keluhan.status,
            catatan=(keluhan.catatan_tindak_lanjut or '').strip() or None
        )

# --- LAPORAN KEUANGAN (PEMILIK) ---
@api_view(['GET'])
@permission_classes([IsPemilik])
def laporan_keuangan_api(request):
    tagihan_lunas = Tagihan.objects.filter(status='lunas').order_by('-id')
    total_pemasukan = tagihan_lunas.aggregate(Sum('nominal'))['nominal__sum'] or 0

    # Tanggal pembayaran diambil dari bukti yang diterima (jika ada beberapa, yang terbaru dipakai)
    bukti_diterima = {}
    for b in BuktiPembayaran.objects.filter(tagihan__in=tagihan_lunas, status='diterima').order_by('id'):
        bukti_diterima[b.tagihan_id] = b

    transaksi = TagihanSerializer(tagihan_lunas, many=True).data
    for item in transaksi:
        b = bukti_diterima.get(item['id'])
        item['tanggal_bayar'] = b.tanggal_bayar if b else None
        item['tanggal_verifikasi'] = b.tanggal_verifikasi if b else None

    return Response({
        'total_pemasukan': total_pemasukan,
        'transaksi': transaksi
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset_api(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'detail': 'Email wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    user = (
        User.objects.filter(email__iexact=email).first()
        or User.objects.filter(username__iexact=email).first()
    )
    if not user:
        return Response({'detail': 'Email tidak terdaftar.'}, status=status.HTTP_404_NOT_FOUND)
    if not user.is_active:
        return Response({'detail': 'Akun ini sudah dinonaktifkan (checkout). Hubungi pengurus.'}, status=status.HTTP_400_BAD_REQUEST)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/atur-ulang-kata-sandi/{uid}/{token}"

    send_mail(
        subject='Atur Ulang Kata Sandi - Kos Rafasya',
        message=(
            f"Halo {user.first_name or user.username},\n\n"
            f"Kami menerima permintaan untuk mengatur ulang kata sandi akun Kos Rafasya Anda.\n"
            f"Silakan buka tautan berikut untuk membuat kata sandi baru:\n\n"
            f"{reset_link}\n\n"
            f"Jika Anda tidak merasa meminta perubahan ini, abaikan pesan ini."
        ),
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'admin@kosrafasya.id'),
        recipient_list=[user.email],
        fail_silently=False,
    )

    return Response({'detail': 'Tautan atur ulang telah dikirim ke email Anda.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset_api(request):
    uidb64 = request.data.get('uid', '')
    token = request.data.get('token', '')
    password = request.data.get('password', '')

    if len(password) < 8:
        return Response({'password': ['Kata sandi minimal 8 karakter.']}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'detail': 'Tautan tidak valid atau sudah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Tautan tidak valid atau sudah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.save()

    return Response({'detail': 'Kata sandi berhasil diperbarui.'}, status=status.HTTP_200_OK)

# --- KELOLA AKUN BERJENJANG (SUPERADMIN -> PEMILIK, PEMILIK -> PENGURUS) ---
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def kelola_akun_staff_api(request):
    user = request.user
    profil_role = getattr(getattr(user, 'profiluser', None), 'role', '')
    role_pembuat = profil_role if profil_role else ('superadmin' if user.is_superuser else '')

    if role_pembuat == 'superadmin':
        target_role = 'pemilik'
    elif role_pembuat == 'pemilik':
        target_role = 'pengurus'
    else:
        return Response({'detail': 'Anda tidak memiliki izin mengelola akun.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        users = User.objects.filter(profiluser__role=target_role).order_by('-date_joined')
        return Response({
            'target_role': target_role,
            'akun': AkunStaffSerializer(users, many=True).data
        })

    # POST: Buat akun baru
    nama = (request.data.get('nama_lengkap') or '').strip()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not nama or not email or not password:
        return Response({'detail': 'Nama lengkap, email, dan kata sandi awal wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({'detail': 'Kata sandi awal minimal 8 karakter.'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return Response({'detail': 'Email sudah digunakan oleh akun lain.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        akun_baru = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nama
        )
        ProfilUser.objects.create(user=akun_baru, role=target_role)

    return Response(AkunStaffSerializer(akun_baru).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def hapus_akun_staff_api(request, user_id):
    user = request.user
    profil_role = getattr(getattr(user, 'profiluser', None), 'role', '')
    role_pembuat = profil_role if profil_role else ('superadmin' if user.is_superuser else '')
    target_role = 'pemilik' if role_pembuat == 'superadmin' else ('pengurus' if role_pembuat == 'pemilik' else '')

    if not target_role:
        return Response({'detail': 'Akses ditolak.'}, status=status.HTTP_403_FORBIDDEN)

    target_user = User.objects.filter(id=user_id, profiluser__role=target_role).first()
    if not target_user:
        return Response({'detail': 'Akun tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    target_user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

class InformasiListCreateAPI(generics.ListCreateAPIView):
    queryset = Informasi.objects.all().order_by('id')
    serializer_class = InformasiSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsPengurus()]
        return [IsAuthenticated()]


class InformasiDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Informasi.objects.all()
    serializer_class = InformasiSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsPengurus()]
        return [IsAuthenticated()]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ajukan_perpanjangan_api(request, pk):
    from datetime import date, timedelta
    tagihan = Tagihan.objects.select_related('penghuni__kamar', 'penghuni__user').filter(pk=pk).first()
    if not tagihan:
        return Response({'detail': 'Tagihan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    penghuni = Penghuni.objects.filter(user=request.user).first()
    if not penghuni:
        return Response({'detail': 'Hanya penghuni yang dapat mengajukan perpanjangan.'}, status=status.HTTP_403_FORBIDDEN)

    punya_akses = (tagihan.penghuni_id == penghuni.id) or (
        penghuni.kamar_id and tagihan.penghuni and tagihan.penghuni.kamar_id == penghuni.kamar_id
    )
    if not punya_akses:
        return Response({'detail': 'Anda tidak memiliki akses ke tagihan ini.'}, status=status.HTTP_403_FORBIDDEN)

    if tagihan.status in ['lunas', 'menunggu_verifikasi']:
        return Response({'detail': 'Tagihan yang sudah dibayar atau sedang diverifikasi tidak dapat diperpanjang.'}, status=status.HTTP_400_BAD_REQUEST)

    # Pagar 1: Maksimal 1x pengajuan per tagihan
    if tagihan.status_perpanjangan != 'tidak_ada':
        return Response({'detail': 'Pengajuan perpanjangan hanya dapat dilakukan 1 kali per tagihan.'}, status=status.HTTP_400_BAD_REQUEST)

    # Pagar 2: Wajib diajukan paling lambat H+1 dari jatuh tempo asli
    hari_ini = date.today()
    if hari_ini > tagihan.jatuh_tempo + timedelta(days=1):
        return Response(
            {'detail': 'Batas pengajuan perpanjangan sudah lewat (maksimal H+1 dari tanggal jatuh tempo).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Pagar 3: Kuota maksimal 2x disetujui dalam 180 hari terakhir agar tidak disalahgunakan tiap bulan
    batas_riwayat = hari_ini - timedelta(days=180)
    filter_riwayat = Q(penghuni=penghuni)
    if penghuni.kamar_id:
        filter_riwayat |= Q(penghuni__kamar_id=penghuni.kamar_id)
    jumlah_disetujui = Tagihan.objects.filter(
        filter_riwayat,
        status_perpanjangan='disetujui',
        jatuh_tempo__gte=batas_riwayat,
    ).count()
    if jumlah_disetujui >= 2:
        return Response(
            {'detail': 'Kuota dispensasi sudah mencapai batas maksimal (2 kali dalam 6 bulan terakhir).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tgl_str = str(request.data.get('tanggal_perpanjangan', '')).strip()
    alasan = str(request.data.get('alasan_perpanjangan', '')).strip()

    if not tgl_str:
        return Response({'detail': 'Tanggal perpanjangan wajib dipilih.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        tgl_baru = date.fromisoformat(tgl_str)
    except ValueError:
        return Response({'detail': 'Format tanggal tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

    # Pagar 4: Rentang 1 s/d maksimal 7 hari setelah jatuh tempo asli
    min_tgl = tagihan.jatuh_tempo + timedelta(days=1)
    maks_tgl = tagihan.jatuh_tempo + timedelta(days=7)
    if tgl_baru < min_tgl or tgl_baru > maks_tgl:
        return Response(
            {'detail': f'Tanggal perpanjangan harus antara {min_tgl.isoformat()} sampai {maks_tgl.isoformat()} (maksimal 7 hari).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(alasan) < 5:
        return Response({'detail': 'Tuliskan alasan pengunduran pembayaran minimal 5 karakter.'}, status=status.HTTP_400_BAD_REQUEST)

    tagihan.tanggal_perpanjangan = tgl_baru
    tagihan.alasan_perpanjangan = alasan
    tagihan.status_perpanjangan = 'menunggu'
    tagihan.save(update_fields=['tanggal_perpanjangan', 'alasan_perpanjangan', 'status_perpanjangan'])

    return Response(TagihanSerializer(tagihan).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respon_perpanjangan_api(request, pk):
    user = request.user
    is_staff_kos = (hasattr(user, 'profiluser') and user.profiluser.role in ['pengurus', 'pemilik']) or user.is_superuser
    if not is_staff_kos:
        return Response({'detail': 'Hanya pengurus atau pemilik yang dapat memproses pengajuan ini.'}, status=status.HTTP_403_FORBIDDEN)

    tagihan = Tagihan.objects.filter(pk=pk).first()
    if not tagihan:
        return Response({'detail': 'Tagihan tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    if tagihan.status_perpanjangan != 'menunggu':
        return Response({'detail': 'Tidak ada pengajuan perpanjangan yang menunggu persetujuan pada tagihan ini.'}, status=status.HTTP_400_BAD_REQUEST)

    aksi = str(request.data.get('aksi', '')).strip().lower()
    if aksi not in ['setujui', 'tolak']:
        return Response({'detail': 'Aksi harus berupa "setujui" atau "tolak".'}, status=status.HTTP_400_BAD_REQUEST)

    tagihan.status_perpanjangan = 'disetujui' if aksi == 'setujui' else 'ditolak'
    tagihan.save(update_fields=['status_perpanjangan'])

    return Response(TagihanSerializer(tagihan).data)
