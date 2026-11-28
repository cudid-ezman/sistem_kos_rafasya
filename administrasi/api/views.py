from administrasi.models import PasswordResetOTP
from datetime import timedelta
from django.utils.timezone import now
from django.db import transaction
from django.db.models import Sum, Q, F
from django.contrib.auth.models import User
from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import date
import calendar
import re

from administrasi.models import (
    ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, Denda, KategoriKeluhan, Keluhan, RiwayatStatusKeluhan, Informasi
)
from .serializers import (
    KamarSerializer, PenghuniSerializer, TagihanSerializer,
    BuktiPembayaranSerializer, KategoriKeluhanSerializer, KeluhanSerializer, 
    CustomTokenObtainPairSerializer, AkunStaffSerializer, InformasiSerializer
)
from .permissions import IsPengurus, IsPemilik
from administrasi.whatsapp import (
    wa_bukti_diunggah,
    wa_verifikasi_pembayaran,
    wa_ajukan_perpanjangan,
    wa_respon_perpanjangan,
    wa_keluhan_baru,
    wa_keluhan_update_pengurus,
    wa_keluhan_respon_pemilik,
)

# --- AUTH & PROFILE ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# ============================================================================
# 1. PROFIL PENGGUNA & DATA DIRI
# ============================================================================

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
# ============================================================================
# 2. MANAJEMEN KAMAR & PENGHUNI
# ============================================================================

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
        kamar.biaya_fasilitas = 200000 if pakai_fasilitas else 0
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

def _label_penghuni_kamar(kamar, fallback_penghuni=None, nominal=None):
    if not kamar:
        if fallback_penghuni and fallback_penghuni.user:
            return (fallback_penghuni.user.first_name or fallback_penghuni.user.username).strip()
        return "-"
    harga_berdua = getattr(kamar, 'harga_berdua', 800000) or 800000
    is_berdua = (nominal >= harga_berdua) if nominal is not None else (kamar.tipe == 'berdua')
    if is_berdua:
        penghuni_aktif = list(
            Penghuni.objects.filter(kamar=kamar, status_aktif=True)
            .select_related('user')
            .order_by('tanggal_masuk', 'id')
        )
        if len(penghuni_aktif) > 1:
            return " & ".join(
                (p.user.first_name or p.user.username).strip() for p in penghuni_aktif
            )
    if fallback_penghuni and fallback_penghuni.user:
        return (fallback_penghuni.user.first_name or fallback_penghuni.user.username).strip()
    penghuni_pertama = (
        Penghuni.objects.filter(kamar=kamar, status_aktif=True)
        .select_related('user')
        .order_by('tanggal_masuk', 'id')
        .first()
    )
    if penghuni_pertama and penghuni_pertama.user:
        return (penghuni_pertama.user.first_name or penghuni_pertama.user.username).strip()
    return "-"


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

    nominal = kamar.harga_sewa
    if not tagihan_bulan_ini:
        jatuh_tempo = _jatuh_tempo_siklus_masuk(penghuni_utama.tanggal_masuk, hari_ini)
        Tagihan.objects.create(
            penghuni=penghuni_utama,
            kamar=kamar,
            nama_penghuni_snapshot=_label_penghuni_kamar(kamar, penghuni_utama, nominal),
            periode=periode_ini,
            nominal=nominal,
            jatuh_tempo=jatuh_tempo,
            status='belum_dibayar'
        )
    elif tagihan_bulan_ini.status in ['belum_dibayar', 'terlambat', 'ditolak']:
        tagihan_bulan_ini.nominal = nominal
        tagihan_bulan_ini.kamar = kamar
        tagihan_bulan_ini.nama_penghuni_snapshot = _label_penghuni_kamar(kamar, penghuni_utama, nominal)
        tagihan_bulan_ini.save(update_fields=['nominal', 'kamar', 'nama_penghuni_snapshot'])
    elif tagihan_bulan_ini.status == 'lunas' and penghuni_referensi and penghuni_referensi.pk != tagihan_bulan_ini.penghuni_id:
        selisih = max(0, nominal - (tagihan_bulan_ini.nominal or 0))
        if selisih > 0 and not Tagihan.objects.filter(penghuni=penghuni_referensi, kamar=kamar, periode__iexact=periode_ini).exists():
            jatuh_tempo = _jatuh_tempo_siklus_masuk(penghuni_referensi.tanggal_masuk, hari_ini)
            Tagihan.objects.create(
                penghuni=penghuni_referensi,
                kamar=kamar,
                nama_penghuni_snapshot=f"{(penghuni_referensi.user.first_name or penghuni_referensi.user.username).strip()} (Tambahan Berdua)",
                periode=periode_ini,
                nominal=selisih,
                jatuh_tempo=jatuh_tempo,
                status='belum_dibayar'
            )

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

                        # Aturan pindah kamar (Fasilitas vs Non-Fasilitas, atau Berdua -> Sendiri) — skema bayar di muka (prepaid)
                        if kamar_lama and kamar_lama != kamar_baru:
                            lama_fasilitas = (kamar_lama.biaya_fasilitas or 0) > 0
                            baru_fasilitas = (kamar_baru.biaya_fasilitas or 0) > 0
                            penghuni_lama_aktif = Penghuni.objects.filter(kamar=kamar_lama, status_aktif=True).count()
                            penghuni_baru_aktif = Penghuni.objects.filter(kamar=kamar_baru, status_aktif=True).count()
                            pindah_berdua_ke_sendiri = (penghuni_lama_aktif >= 2 and penghuni_baru_aktif == 0)

                            if lama_fasilitas != baru_fasilitas or pindah_berdua_ke_sendiri:
                                hari_ini = now().date()
                                filter_tagihan_kamar = (
                                    Q(penghuni=penghuni, kamar=kamar_lama)
                                    | Q(penghuni=penghuni, kamar__isnull=True)
                                    | Q(kamar=kamar_lama)
                                )
                                batas_pindah = None

                                # 1. Cek tagihan LUNAS terakhir: pembayaran di muka memberi hak huni 1 bulan penuh ke depan
                                tagihan_lunas_terakhir = (
                                    Tagihan.objects.filter(filter_tagihan_kamar, status='lunas')
                                    .order_by('-jatuh_tempo', '-id')
                                    .first()
                                )
                                if tagihan_lunas_terakhir:
                                    jt = tagihan_lunas_terakhir.jatuh_tempo
                                    thn_akhir = jt.year + (1 if jt.month == 12 else 0)
                                    bln_akhir = 1 if jt.month == 12 else jt.month + 1
                                    akhir_masa_inap = _tanggal_siklus_pada_bulan(
                                        penghuni.tanggal_masuk or jt, thn_akhir, bln_akhir
                                    )
                                    if akhir_masa_inap > hari_ini:
                                        batas_pindah = akhir_masa_inap

                                # 2. Cek tagihan aktif belum lunas yang sudah terbit (H-7 sebelum jatuh tempo) dan jatuh temponya masih di depan
                                from datetime import timedelta
                                tagihan_mendatang = (
                                    Tagihan.objects.filter(
                                        filter_tagihan_kamar,
                                        jatuh_tempo__gt=hari_ini,
                                        jatuh_tempo__lte=hari_ini + timedelta(days=7),
                                    )
                                    .exclude(status='lunas')
                                    .order_by('-jatuh_tempo', '-id')
                                    .first()
                                )
                                if tagihan_mendatang and (
                                    batas_pindah is None or tagihan_mendatang.jatuh_tempo > batas_pindah
                                ):
                                    batas_pindah = tagihan_mendatang.jatuh_tempo

                                if batas_pindah:
                                    tgl_jt = batas_pindah.strftime('%d-%m-%Y')
                                    if lama_fasilitas != baru_fasilitas:
                                        asal_txt = 'Fasilitas' if lama_fasilitas else 'Non-Fasilitas'
                                        tujuan_txt = 'Fasilitas' if baru_fasilitas else 'Non-Fasilitas'
                                        alasan = f'Perpindahan silang dari kamar {asal_txt} ke {tujuan_txt}'
                                    else:
                                        alasan = 'Perpindahan dari kamar Berdua ke kamar Sendiri'
                                    return Response(
                                        {
                                            'detail': (
                                                f'{alasan} tidak dapat dilakukan karena masa sewa aktif hingga {tgl_jt}. '
                                                f'Perpindahan baru diizinkan pada atau setelah {tgl_jt}.'
                                            )
                                        },
                                        status=status.HTTP_400_BAD_REQUEST,
                                    )

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

            # 4. Penanganan tagihan saat pindah kamar / checkout:
            pindah_kamar = bool(kamar_lama and penghuni.kamar and kamar_lama != penghuni.kamar)
            keluar_kamar_lama = bool(kamar_lama and kamar_lama != penghuni.kamar)
            if keluar_kamar_lama:
                penghuni_sisa = (
                    Penghuni.objects.filter(kamar=kamar_lama, status_aktif=True)
                    .order_by('tanggal_masuk', 'id')
                    .first()
                )
                hari_ini = now().date()
                periode_ini = f"{NAMA_BULAN_ID[hari_ini.month]} {hari_ini.year}"

                if penghuni_sisa:
                    # Kamar lama masih dihuni 1 orang tersisa: perbarui tagihan belum lunas menjadi tarif & nama 1 orang
                    tagihan_sisa_aktif = Tagihan.objects.filter(
                        Q(kamar=kamar_lama) | Q(kamar__isnull=True, penghuni__kamar=kamar_lama) | Q(kamar=kamar_lama, penghuni=penghuni),
                        status__in=['belum_dibayar', 'ditolak', 'terlambat'],
                    )
                    for t in tagihan_sisa_aktif:
                        t.kamar = kamar_lama
                        t.penghuni = penghuni_sisa
                        t.nama_penghuni_snapshot = _label_penghuni_kamar(kamar_lama, penghuni_sisa, kamar_lama.harga_sewa)
                        t.nominal = kamar_lama.harga_sewa
                        t.save(update_fields=['kamar', 'penghuni', 'nama_penghuni_snapshot', 'nominal'])
                elif pindah_kamar:
                    # Kamar lama kosong total: gabungkan jika kamar tujuan sudah punya tagihan di periode sama, atau pindahkan jika belum ada
                    tagihan_lama_aktif = Tagihan.objects.filter(
                        Q(kamar=kamar_lama) | Q(kamar__isnull=True, penghuni=penghuni),
                        status__in=['belum_dibayar', 'ditolak', 'terlambat'],
                    )
                    penghuni_utama_baru = (
                        Penghuni.objects.filter(kamar=penghuni.kamar, status_aktif=True)
                        .order_by('tanggal_masuk', 'id')
                        .first()
                    ) or penghuni
                    for t in tagihan_lama_aktif:
                        tagihan_tujuan_ada = Tagihan.objects.filter(
                            Q(kamar=penghuni.kamar) | Q(kamar__isnull=True, penghuni__kamar=penghuni.kamar),
                            periode__iexact=t.periode,
                        ).exclude(pk=t.pk).first()

                        if tagihan_tujuan_ada:
                            if tagihan_tujuan_ada.status in ['belum_dibayar', 'ditolak', 'terlambat']:
                                tagihan_tujuan_ada.kamar = penghuni.kamar
                                tagihan_tujuan_ada.penghuni = penghuni_utama_baru
                                tagihan_tujuan_ada.nama_penghuni_snapshot = _label_penghuni_kamar(
                                    penghuni.kamar, penghuni_utama_baru, penghuni.kamar.harga_sewa
                                )
                                tagihan_tujuan_ada.nominal = penghuni.kamar.harga_sewa
                                tagihan_tujuan_ada.save(
                                    update_fields=['kamar', 'penghuni', 'nama_penghuni_snapshot', 'nominal']
                                )
                                t.delete()
                            elif tagihan_tujuan_ada.status == 'lunas':
                                selisih = max(0, (penghuni.kamar.harga_sewa or 0) - (tagihan_tujuan_ada.nominal or 0))
                                if selisih > 0:
                                    t.kamar = penghuni.kamar
                                    t.penghuni = penghuni
                                    t.nama_penghuni_snapshot = f"{(penghuni.user.first_name or penghuni.user.username).strip()} (Tambahan Berdua)"
                                    t.nominal = selisih
                                    t.save(update_fields=['kamar', 'penghuni', 'nama_penghuni_snapshot', 'nominal'])
                                else:
                                    t.delete()
                            else:
                                t.delete()
                        else:
                            t.kamar = penghuni.kamar
                            t.penghuni = penghuni_utama_baru
                            t.nama_penghuni_snapshot = _label_penghuni_kamar(
                                penghuni.kamar, penghuni_utama_baru, penghuni.kamar.harga_sewa
                            )
                            t.nominal = penghuni.kamar.harga_sewa
                            t.save(update_fields=['kamar', 'penghuni', 'nama_penghuni_snapshot', 'nominal'])

                # Pastikan seluruh tagihan belum lunas di kamar tujuan ikut tersinkron (misal berubah dari 1 orang -> 2 orang)
                if penghuni.status_aktif and penghuni.kamar:
                    penghuni_utama_tujuan = (
                        Penghuni.objects.filter(kamar=penghuni.kamar, status_aktif=True)
                        .order_by('tanggal_masuk', 'id')
                        .first()
                    ) or penghuni
                    for t_tujuan in Tagihan.objects.filter(
                        kamar=penghuni.kamar,
                        status__in=['belum_dibayar', 'ditolak', 'terlambat'],
                    ):
                        t_tujuan.penghuni = penghuni_utama_tujuan
                        t_tujuan.nominal = penghuni.kamar.harga_sewa
                        t_tujuan.nama_penghuni_snapshot = _label_penghuni_kamar(
                            penghuni.kamar, penghuni_utama_tujuan, penghuni.kamar.harga_sewa
                        )
                        t_tujuan.save(update_fields=['penghuni', 'nominal', 'nama_penghuni_snapshot'])

                if pindah_kamar:
                    sudah_lunas_berjalan = Tagihan.objects.filter(
                        Q(penghuni=penghuni) | Q(kamar=kamar_lama) | Q(kamar=penghuni.kamar),
                        periode__iexact=periode_ini,
                        status='lunas',
                    ).exists()
                    if penghuni.status_aktif and penghuni.kamar and not sudah_lunas_berjalan:
                        _pastikan_tagihan_kamar_aktif(penghuni.kamar, penghuni)
            elif penghuni.status_aktif and penghuni.kamar:
                _pastikan_tagihan_kamar_aktif(penghuni.kamar, penghuni)

        serializer = self.get_serializer(penghuni)
        return Response(serializer.data, status=status.HTTP_200_OK)

# --- TAGIHAN & GENERATE TAGIHAN BULANAN ---
# ============================================================================
# 3. TAGIHAN, SIKLUS SEWA & DISPENSASI JATUH TEMPO
# ============================================================================

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
    
# ============================================================================
# 4. AUTENTIKASI, GANTI SANDI & OTP RESET PASSWORD
# ============================================================================

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


NAMA_BULAN_ID = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]


def _parse_bulan_tahun_periode(periode_str, tahun_default, bulan_sekarang=None):
    teks = (periode_str or '').strip().lower()
    # Format YYYY-MM atau YYYY/MM
    m_iso = re.match(r'^(\d{4})[-/](\d{1,2})$', teks)
    if m_iso:
        thn, bln = int(m_iso.group(1)), int(m_iso.group(2))
        return (thn, bln) if 1 <= bln <= 12 else None

    # Format angka bulan: "1 2026", "01/2026", "1"
    m_num = re.match(r'^(\d{1,2})(?:[\s/-]+(\d{4}))?$', teks)
    if m_num:
        bln = int(m_num.group(1))
        if not (1 <= bln <= 12):
            return None
        if m_num.group(2):
            thn = int(m_num.group(2))
        else:
            thn = tahun_default + 1 if (bulan_sekarang and bln < bulan_sekarang) else tahun_default
        return (thn, bln)

    # Format nama bulan: "Januari 2027", "Jan 2027", "Januari"
    m = re.search(r'([a-z]+)\s*(\d{4})?', teks)
    if not m:
        return None
    bulan = BULAN_MAP.get(m.group(1))
    if not bulan:
        return None
    if m.group(2):
        tahun = int(m.group(2))
    else:
        tahun = tahun_default + 1 if (bulan_sekarang and bulan < bulan_sekarang) else tahun_default
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
            tagihan_terakhir = (
                Tagihan.objects.filter(penghuni__kamar=kamar)
                .order_by('-jatuh_tempo', '-id')
                .first()
            )
            parsed_periode = _parse_bulan_tahun_periode(periode, hari_ini.year, hari_ini.month)
            if parsed_periode:
                jatuh_tempo = _tanggal_siklus_pada_bulan(
                    penghuni_utama.tanggal_masuk,
                    parsed_periode[0],
                    parsed_periode[1],
                )
            elif tagihan_terakhir:
                t_prev = tagihan_terakhir.jatuh_tempo
                thn_next = t_prev.year + (1 if t_prev.month == 12 else 0)
                bln_next = 1 if t_prev.month == 12 else t_prev.month + 1
                jatuh_tempo = _tanggal_siklus_pada_bulan(
                    penghuni_utama.tanggal_masuk, thn_next, bln_next
                )
            else:
                jatuh_tempo = _jatuh_tempo_siklus_masuk(penghuni_utama.tanggal_masuk, hari_ini)

            # Cegah duplikat di bulan & tahun jatuh tempo yang sama (meski penulisan teks berbeda)
            sudah_ada_bulan_ini = Tagihan.objects.filter(
                penghuni__kamar=kamar,
                jatuh_tempo__year=jatuh_tempo.year,
                jatuh_tempo__month=jatuh_tempo.month,
            ).exists()
            if sudah_ada_bulan_ini:
                skipped_count += 1
                continue

            # Cegah tagihan dibuat untuk tanggal sebelum penghuni masuk atau sebelum/sama dengan tagihan terakhir
            if jatuh_tempo < penghuni_utama.tanggal_masuk or (
                tagihan_terakhir and jatuh_tempo <= tagihan_terakhir.jatuh_tempo
            ):
                skipped_count += 1
                continue

            periode_rapi = f"{NAMA_BULAN_ID[jatuh_tempo.month]} {jatuh_tempo.year}"
            Tagihan.objects.create(
                penghuni=penghuni_utama,
                kamar=kamar,
                nama_penghuni_snapshot=_label_penghuni_kamar(kamar, penghuni_utama, nominal),
                periode=periode_rapi,
                nominal=nominal,
                jatuh_tempo=jatuh_tempo,
                status='belum_dibayar',
                status_perpanjangan='tidak_ada'
            )
            created_count += 1

    pesan = f'{created_count} tagihan kamar berhasil dibuat untuk periode {periode}.'
    if skipped_count:
        pesan += f' ({skipped_count} kamar dilewati karena sudah memiliki tagihan periode ini.)'
    return Response({'detail': pesan})

# --- BUKTI PEMBAYARAN & VERIFIKASI PENGURUS ---
# ============================================================================
# 5. BUKTI PEMBAYARAN QRIS & VERIFIKASI
# ============================================================================

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
            hari_telat, nominal_denda = tagihan.hitung_denda_pada(bukti.tanggal_bayar)
            tagihan.hari_terlambat = hari_telat
            tagihan.denda = nominal_denda
            tagihan.status = 'menunggu_verifikasi'
            tagihan.save(update_fields=['hari_terlambat', 'denda', 'status'])
            if nominal_denda > 0:
                Denda.objects.update_or_create(
                    tagihan=tagihan,
                    defaults={'jumlah_hari': hari_telat, 'nominal': nominal_denda},
                )
            transaction.on_commit(lambda: wa_bukti_diunggah(bukti))

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
            hari_telat, nominal_denda = tagihan.hitung_denda_pada(bukti.tanggal_bayar)
            if (tagihan.denda or 0) > nominal_denda:
                hari_telat = int(tagihan.hari_terlambat or hari_telat)
                nominal_denda = float(tagihan.denda or 0)
            tagihan.hari_terlambat = hari_telat
            tagihan.denda = nominal_denda
            tagihan.status = 'lunas'
            if nominal_denda > 0:
                Denda.objects.update_or_create(
                    tagihan=tagihan,
                    defaults={'jumlah_hari': hari_telat, 'nominal': nominal_denda},
                )
        elif aksi == 'tolak':
            bukti.status = 'ditolak'
            bukti.catatan_penolakan = catatan
            hari_telat, nominal_denda = tagihan.hitung_denda_pada()
            tagihan.hari_terlambat = hari_telat
            tagihan.denda = nominal_denda
            tagihan.status = 'ditolak'
        else:
            return Response({'detail': 'Aksi tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

        bukti.tanggal_verifikasi = now().date()
        bukti.verifikator = request.user
        bukti.save()
        tagihan.save()

    wa_verifikasi_pembayaran(bukti, aksi, catatan)
    return Response({'detail': f'Pembayaran berhasil di-{aksi}.'})

# --- KELUHAN & PROSES KELUHAN ---
# ============================================================================
# 6. KELUHAN FASILITAS & ESKALASI PEMILIK
# ============================================================================

def _rapikan_nama_kategori(raw: str) -> str:
    bersih = re.sub(r'\s+', ' ', (raw or '').strip())
    if not bersih:
        return ''
    return ' '.join(w if w.isupper() and len(w) <= 4 else w.capitalize() for w in bersih.split(' '))


class KategoriKeluhanListAPI(generics.ListCreateAPIView):
    queryset = KategoriKeluhan.objects.all().order_by('nama')
    serializer_class = KategoriKeluhanSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        nama = _rapikan_nama_kategori(request.data.get('nama') or '')
        if not nama:
            return Response({'detail': 'Nama kategori wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
        kategori = KategoriKeluhan.objects.filter(nama__iexact=nama).first()
        if not kategori:
            kategori = KategoriKeluhan.objects.create(nama=nama)
        return Response(KategoriKeluhanSerializer(kategori).data, status=status.HTTP_201_CREATED)


class KategoriKeluhanDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = KategoriKeluhan.objects.all()
    serializer_class = KategoriKeluhanSerializer
    permission_classes = [IsPengurus]

    def perform_update(self, serializer):
        nama = _rapikan_nama_kategori(self.request.data.get('nama') or serializer.instance.nama)
        if not nama:
            raise serializers.ValidationError({'nama': 'Nama kategori tidak boleh kosong.'})
        serializer.save(nama=nama)


class KeluhanListCreateAPI(generics.ListCreateAPIView):
    serializer_class = KeluhanSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        role = user.profiluser.role.lower() if hasattr(user, 'profiluser') else ''
        if role == 'pemilik':
            return Keluhan.objects.filter(dieskalasi_pemilik=True).order_by('-tanggal_kirim')
        if role == 'pengurus' or user.is_superuser:
            return Keluhan.objects.all().order_by('-tanggal_kirim')
        penghuni = Penghuni.objects.filter(user=user).first()
        if not penghuni:
            return Keluhan.objects.none()
        if penghuni.kamar:
            return Keluhan.objects.filter(penghuni__kamar=penghuni.kamar).order_by('-tanggal_kirim')
        return Keluhan.objects.filter(penghuni=penghuni).order_by('-tanggal_kirim')

    def perform_create(self, serializer):
        penghuni = Penghuni.objects.get(user=self.request.user)
        kategori_custom = _rapikan_nama_kategori(serializer.validated_data.pop('kategori_custom', '') or '')
        kategori = serializer.validated_data.get('kategori')
        if kategori_custom:
            kategori = (
                KategoriKeluhan.objects.filter(nama__iexact=kategori_custom).first()
                or KategoriKeluhan.objects.create(nama=kategori_custom)
            )
        if not kategori:
            raise serializers.ValidationError({'kategori': 'Kategori keluhan wajib dipilih atau dibuat.'})
        keluhan = serializer.save(penghuni=penghuni, kategori=kategori)
        RiwayatStatusKeluhan.objects.create(
            keluhan=keluhan,
            status=keluhan.status,
            catatan='Keluhan dikirim oleh penghuni.'
        )
        wa_keluhan_baru(keluhan)


class KeluhanUpdateAPI(generics.UpdateAPIView):
    queryset = Keluhan.objects.all()
    serializer_class = KeluhanSerializer
    permission_classes = [IsPengurus]

    def perform_update(self, serializer):
        kategori_custom = _rapikan_nama_kategori(serializer.validated_data.pop('kategori_custom', '') or '')
        kategori = serializer.validated_data.get('kategori', serializer.instance.kategori)
        if kategori_custom:
            kategori = (
                KategoriKeluhan.objects.filter(nama__iexact=kategori_custom).first()
                or KategoriKeluhan.objects.create(nama=kategori_custom)
            )

        status_sebelumnya = serializer.instance.status
        eskalasi_sebelumnya = bool(serializer.instance.dieskalasi_pemilik)
        status_baru = serializer.validated_data.get('status', serializer.instance.status)
        catatan_baru = (serializer.validated_data.get('catatan_tindak_lanjut', serializer.instance.catatan_tindak_lanjut) or '').strip()

        sudah_direspon_pemilik = serializer.instance.status_pemilik in [
            'dicairkan',
            'dicairkan_sebagian',
            'ditolak',
        ]

        if status_baru == 'selesai' or sudah_direspon_pemilik:
            # Kunci histori eskalasi, nominal pengajuan, dan keputusan pemilik agar tidak hilang/ter-reset
            dieskalasi = serializer.instance.dieskalasi_pemilik
            nominal_ajuan = float(serializer.instance.nominal_pengajuan or 0)
            status_pemilik = serializer.instance.status_pemilik
            if status_baru == 'selesai' and (
                not catatan_baru or catatan_baru.lower() in ['sedang proses', 'sedang diproses', 'sudah diajukan']
            ):
                catatan_baru = 'Kendala telah selesai ditangani.'
        else:
            dieskalasi = serializer.validated_data.get('dieskalasi_pemilik', serializer.instance.dieskalasi_pemilik)
            nominal_ajuan = float(serializer.validated_data.get('nominal_pengajuan', serializer.instance.nominal_pengajuan) or 0)
            if nominal_ajuan < 0:
                nominal_ajuan = 0
            status_pemilik = serializer.instance.status_pemilik
            if dieskalasi:
                if status_pemilik == 'tidak_diajukan':
                    status_pemilik = 'menunggu'
            else:
                status_pemilik = 'tidak_diajukan'
                nominal_ajuan = 0

        keluhan = serializer.save(
            kategori=kategori,
            catatan_tindak_lanjut=catatan_baru,
            dieskalasi_pemilik=dieskalasi,
            nominal_pengajuan=nominal_ajuan,
            status_pemilik=status_pemilik,
        )

        wa_keluhan_update_pengurus(keluhan, status_sebelumnya, eskalasi_sebelumnya)

        # Catatan publik untuk penghuni (bersih dari info dana internal)
        RiwayatStatusKeluhan.objects.create(
            keluhan=keluhan,
            status=keluhan.status,
            catatan=catatan_baru or None,
        )

        # Catatan internal eskalasi pemilik (hanya saat belum selesai & baru/berubah eskalasi)
        if status_baru != 'selesai' and not sudah_direspon_pemilik and keluhan.dieskalasi_pemilik:
            info_ajuan = (
                f"[Internal Pemilik] Diteruskan ke Pemilik (pengajuan dana Rp {int(keluhan.nominal_pengajuan):,}).".replace(',', '.')
                if keluhan.nominal_pengajuan > 0
                else "[Internal Pemilik] Diteruskan ke Pemilik untuk ditinjau (tanpa pengajuan dana)."
            )
            RiwayatStatusKeluhan.objects.create(
                keluhan=keluhan,
                status=keluhan.status,
                catatan=info_ajuan,
            )


@api_view(['POST'])
@permission_classes([IsPemilik])
def respon_keluhan_pemilik_api(request, pk):
    try:
        keluhan = Keluhan.objects.get(pk=pk, dieskalasi_pemilik=True)
    except Keluhan.DoesNotExist:
        return Response({'detail': 'Keluhan eskalasi tidak ditemukan.'}, status=status.HTTP_404_NOT_FOUND)

    status_pemilik = (request.data.get('status_pemilik') or '').strip()
    catatan_pemilik = (request.data.get('catatan_pemilik') or '').strip()
    try:
        nominal_pencairan = float(request.data.get('nominal_pencairan') or 0)
    except (TypeError, ValueError):
        return Response({'detail': 'Nominal pencairan tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

    if nominal_pencairan < 0:
        return Response({'detail': 'Nominal pencairan tidak boleh negatif.'}, status=status.HTTP_400_BAD_REQUEST)

    if status_pemilik not in ['dicairkan', 'dicairkan_sebagian', 'ditolak']:
        return Response({'detail': 'Status respon pemilik tidak valid.'}, status=status.HTTP_400_BAD_REQUEST)

    if status_pemilik == 'ditolak':
        nominal_pencairan = 0
    elif keluhan.nominal_pengajuan > 0 and nominal_pencairan > 0 and nominal_pencairan < keluhan.nominal_pengajuan:
        status_pemilik = 'dicairkan_sebagian'

    keluhan.status_pemilik = status_pemilik
    keluhan.nominal_pencairan = nominal_pencairan
    keluhan.catatan_pemilik = catatan_pemilik
    keluhan.tanggal_pencairan = now()
    keluhan.save(update_fields=['status_pemilik', 'nominal_pencairan', 'catatan_pemilik', 'tanggal_pencairan'])

    label_respon = {
        'dicairkan': f"Pemilik menyetujui & mencairkan dana Rp {int(nominal_pencairan):,}".replace(',', '.') if nominal_pencairan > 0 else "Pemilik menyetujui tindak lanjut keluhan",
        'dicairkan_sebagian': f"Pemilik mencairkan dana sebagian Rp {int(nominal_pencairan):,}".replace(',', '.'),
        'ditolak': "Pemilik menolak / menunda pengajuan keluhan",
    }[status_pemilik]
    detail_riwayat = f"[Internal Pemilik] {label_respon}{f' ({catatan_pemilik})' if catatan_pemilik else ''}."
    RiwayatStatusKeluhan.objects.create(
        keluhan=keluhan,
        status=keluhan.status,
        catatan=detail_riwayat,
    )

    wa_keluhan_respon_pemilik(keluhan)
    return Response(KeluhanSerializer(keluhan, context={'request': request}).data)

# --- LAPORAN KEUANGAN (PEMILIK) ---
@api_view(['GET'])
@permission_classes([IsPemilik])
# ============================================================================
# 7. LAPORAN KEUANGAN, KELOLA STAF, INFORMASI & TEMPLATE WA
# ============================================================================

def laporan_keuangan_api(request):
    tagihan_lunas = Tagihan.objects.filter(status='lunas').order_by('-id')
    total_pemasukan = (
        tagihan_lunas.aggregate(total=Sum(F('nominal') + F('denda')))['total'] or 0
    )

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

@api_view(['GET'])
@permission_classes([AllowAny])
def kontak_pengurus_api(request):
    from administrasi.whatsapp import normalisasi_nomor_wa
    raw = getattr(settings, 'WA_PENGURUS', '') or ''
    if not raw:
        env_file = settings.BASE_DIR / '.env'
        if env_file.exists():
            for line in env_file.read_text(encoding='utf-8').splitlines():
                line = line.strip()
                if line.startswith('WA_PENGURUS='):
                    raw = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    wa = normalisasi_nomor_wa(raw)
    return Response({'wa_pengurus': wa})


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset_api(request):
    import secrets
    from datetime import timedelta
    from django.utils.timezone import now

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

    # Nonaktifkan kode OTP lama milik user ini
    PasswordResetOTP.objects.filter(user=user, sudah_dipakai=False).update(sudah_dipakai=True)

    kode_otp = f"{secrets.randbelow(1000000):06d}"
    PasswordResetOTP.objects.create(
        user=user,
        kode=kode_otp,
        kedaluwarsa_pada=now() + timedelta(minutes=10),
    )

    nama_sapaan = user.first_name or user.username
    pesan_teks = (
        f"Halo {nama_sapaan},\n\n"
        f"Kode verifikasi (OTP) untuk mengatur ulang kata sandi akun Kost Putra Raffasya Anda adalah:\n\n"
        f"{kode_otp}\n\n"
        f"Kode ini berlaku selama 10 menit. Demi keamanan akun, jangan bagikan kode ini kepada siapa pun.\n"
        f"Jika Anda tidak merasa meminta pengaturan ulang kata sandi, abaikan email ini."
    )
    pesan_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 20px; color: #064e3b;">Kost Putra Raffasya</h2>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">Halo <strong>{nama_sapaan}</strong>,</p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
        Gunakan kode verifikasi (OTP) berikut untuk mengatur ulang kata sandi akun Anda:
      </p>
      <div style="margin: 20px 0; padding: 16px; background-color: #f0fdf4; border: 1px dashed #10b981; border-radius: 12px; text-align: center;">
        <span style="font-size: 30px; font-weight: bold; letter-spacing: 8px; color: #065f46;">{kode_otp}</span>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #475569;">
        Kode berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapa pun.
      </p>
      <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
        Jika Anda tidak merasa mengajukan permintaan ini, silakan abaikan email ini.
      </p>
    </div>
    """

    send_mail(
        subject=f"{kode_otp} adalah kode verifikasi akun Kost Putra Raffasya Anda",
        message=pesan_teks,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'admin@kosrafasya.id'),
        recipient_list=[user.email],
        html_message=pesan_html,
        fail_silently=False,
    )

    return Response({'detail': 'Kode OTP 6 digit telah dikirim ke email Anda.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_otp_api(request):
    from django.utils.timezone import now

    email = (request.data.get('email') or '').strip().lower()
    kode = re.sub(r'\D', '', str(request.data.get('otp') or ''))

    if not email:
        return Response({'detail': 'Email wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(kode) != 6:
        return Response({'detail': 'Masukkan 6 digit kode OTP yang dikirim ke email.'}, status=status.HTTP_400_BAD_REQUEST)

    user = (
        User.objects.filter(email__iexact=email).first()
        or User.objects.filter(username__iexact=email).first()
    )
    if not user:
        return Response({'detail': 'Kode OTP tidak valid atau sudah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_obj = PasswordResetOTP.objects.filter(user=user, sudah_dipakai=False).order_by('-dibuat_pada').first()
    if not otp_obj:
        return Response({'detail': 'Kode OTP tidak ditemukan atau sudah digunakan. Silakan minta kode baru.'}, status=status.HTTP_400_BAD_REQUEST)

    if now() > otp_obj.kedaluwarsa_pada:
        otp_obj.sudah_dipakai = True
        otp_obj.save(update_fields=['sudah_dipakai'])
        return Response({'detail': 'Kode OTP sudah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru.'}, status=status.HTTP_400_BAD_REQUEST)

    if otp_obj.kode != kode:
        otp_obj.percobaan_gagal += 1
        if otp_obj.percobaan_gagal >= 5:
            otp_obj.sudah_dipakai = True
            otp_obj.save(update_fields=['percobaan_gagal', 'sudah_dipakai'])
            return Response({'detail': 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.'}, status=status.HTTP_400_BAD_REQUEST)
        otp_obj.save(update_fields=['percobaan_gagal'])
        return Response({'detail': 'Kode OTP tidak sesuai. Periksa kembali email Anda.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'detail': 'Kode OTP terverifikasi.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset_api(request):
    from django.utils.timezone import now

    email = (request.data.get('email') or '').strip().lower()
    kode = re.sub(r'\D', '', str(request.data.get('otp') or ''))
    password = request.data.get('password', '')

    if not email:
        return Response({'detail': 'Email wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(kode) != 6:
        return Response({'detail': 'Masukkan 6 digit kode OTP yang dikirim ke email.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 8:
        return Response({'password': ['Kata sandi minimal 8 karakter.']}, status=status.HTTP_400_BAD_REQUEST)

    user = (
        User.objects.filter(email__iexact=email).first()
        or User.objects.filter(username__iexact=email).first()
    )
    if not user:
        return Response({'detail': 'Kode OTP tidak valid atau sudah kedaluwarsa.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_obj = PasswordResetOTP.objects.filter(user=user, sudah_dipakai=False).order_by('-dibuat_pada').first()
    if not otp_obj:
        return Response({'detail': 'Kode OTP tidak ditemukan atau sudah digunakan. Silakan minta kode baru.'}, status=status.HTTP_400_BAD_REQUEST)

    if now() > otp_obj.kedaluwarsa_pada:
        otp_obj.sudah_dipakai = True
        otp_obj.save(update_fields=['sudah_dipakai'])
        return Response({'detail': 'Kode OTP sudah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru.'}, status=status.HTTP_400_BAD_REQUEST)

    if otp_obj.kode != kode:
        otp_obj.percobaan_gagal += 1
        if otp_obj.percobaan_gagal >= 5:
            otp_obj.sudah_dipakai = True
            otp_obj.save(update_fields=['percobaan_gagal', 'sudah_dipakai'])
            return Response({'detail': 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.'}, status=status.HTTP_400_BAD_REQUEST)
        otp_obj.save(update_fields=['percobaan_gagal'])
        return Response({'detail': 'Kode OTP tidak sesuai. Periksa kembali email Anda.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_obj.sudah_dipakai = True
    otp_obj.save(update_fields=['sudah_dipakai'])

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
    wa_ajukan_perpanjangan(tagihan)

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
    wa_respon_perpanjangan(tagihan, aksi)

    return Response(TagihanSerializer(tagihan).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def template_wa_list_api(request):
    from administrasi.models import DEFAULT_TEMPLATE_WA, TemplatePesanWA
    items = TemplatePesanWA.pastikan_default()
    data = []
    for item in items:
        meta = DEFAULT_TEMPLATE_WA.get(item.kode, {})
        data.append({
            'kode': item.kode,
            'judul': item.judul,
            'deskripsi': meta.get('deskripsi', ''),
            'variabel': meta.get('variabel', ''),
            'isi': item.isi,
            'isi_default': meta.get('isi', ''),
            'diperbarui_pada': item.diperbarui_pada,
        })
    return Response(data)


@api_view(['PUT', 'PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def template_wa_detail_api(request, kode):
    from administrasi.models import DEFAULT_TEMPLATE_WA, TemplatePesanWA
    if kode not in DEFAULT_TEMPLATE_WA:
        return Response({'detail': 'Kode template tidak dikenali.'}, status=404)
    profil = ProfilUser.objects.filter(user=request.user).first()
    role_user = 'superadmin' if request.user.is_superuser else (profil.role if profil else '')
    if role_user not in ('pengurus', 'pemilik', 'superadmin'):
        return Response({'detail': 'Akses ditolak.'}, status=403)

    TemplatePesanWA.pastikan_default()
    obj = TemplatePesanWA.objects.get(kode=kode)
    meta = DEFAULT_TEMPLATE_WA[kode]

    if request.data.get('reset'):
        obj.judul = meta['judul']
        obj.isi = meta['isi']
        obj.save()
    else:
        isi_baru = str(request.data.get('isi', '')).strip()
        if not isi_baru:
            return Response({'detail': 'Isi template pesan tidak boleh kosong.'}, status=400)
        obj.isi = isi_baru
        obj.save()

    return Response({
        'kode': obj.kode,
        'judul': obj.judul,
        'deskripsi': meta.get('deskripsi', ''),
        'variabel': meta.get('variabel', ''),
        'isi': obj.isi,
        'isi_default': meta.get('isi', ''),
        'diperbarui_pada': obj.diperbarui_pada,
    })
