from datetime import timedelta
from django.utils.timezone import now
from django.db import transaction
from django.db.models import Sum
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
            return Tagihan.objects.filter(penghuni__kamar=penghuni.kamar).order_by('-id')
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

def _jatuh_tempo_siklus_masuk(tanggal_masuk, tanggal_acuan):
    """Menentukan tanggal jatuh tempo berdasarkan hari dari tanggal_masuk penghuni."""
    tahun = tanggal_acuan.year
    bulan = tanggal_acuan.month
    hari_maks_bulan_ini = calendar.monthrange(tahun, bulan)[1]
    hari_target = min(tanggal_masuk.day, hari_maks_bulan_ini)
    kandidat = tanggal_acuan.replace(day=hari_target)

    if kandidat < tanggal_acuan - timedelta(days=7):
        if bulan == 12:
            tahun += 1
            bulan = 1
        else:
            bulan += 1
        hari_maks_berikut = calendar.monthrange(tahun, bulan)[1]
        kandidat = kandidat.replace(year=tahun, month=bulan, day=min(tanggal_masuk.day, hari_maks_berikut))

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
        return BuktiPembayaran.objects.filter(tagihan__penghuni__user=user).order_by('-waktu_unggah')

    def perform_create(self, serializer):
        with transaction.atomic():
            bukti = serializer.save(status='menunggu_verifikasi')
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
    serializer = TagihanSerializer(tagihan_lunas, many=True)
    return Response({
        'total_pemasukan': total_pemasukan,
        'transaksi': serializer.data
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