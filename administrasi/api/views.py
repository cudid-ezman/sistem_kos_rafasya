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

from administrasi.models import (
    ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, KategoriKeluhan, Keluhan
)
from .serializers import (
    KamarSerializer, PenghuniSerializer, TagihanSerializer,
    BuktiPembayaranSerializer, KategoriKeluhanSerializer, KeluhanSerializer, 
    CustomTokenObtainPairSerializer, AkunStaffSerializer
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

    return Response({
        'id': user.id,
        'username': user.username,
        'nama_lengkap': user.first_name,
        'role': role
    })

# --- KAMAR (CRUD Pengurus) ---
class KamarListCreateAPI(generics.ListCreateAPIView):
    queryset = Kamar.objects.all().order_by('nomor_kamar')
    serializer_class = KamarSerializer
    permission_classes = [IsAuthenticated]

class KamarDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Kamar.objects.all()
    serializer_class = KamarSerializer
    permission_classes = [IsPengurus]

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
            kamar.status = 'terisi'
            kamar.save()

            penghuni = Penghuni.objects.create(
                user=user_baru,
                kamar=kamar,
                no_identitas=no_identitas or '-',
                no_kontak=no_kontak,
                tanggal_masuk=tanggal_masuk
            )

        serializer = self.get_serializer(penghuni)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# --- TAGIHAN & GENERATE TAGIHAN BULANAN ---
class TagihanListCreateAPI(generics.ListCreateAPIView):
    serializer_class = TagihanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if (hasattr(user, 'profiluser') and user.profiluser.role in ['pengurus', 'pemilik']) or user.is_superuser:
            return Tagihan.objects.all().order_by('-id')
        return Tagihan.objects.filter(penghuni__user=user).order_by('-id')
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

@api_view(['POST'])
@permission_classes([IsPengurus])
def generate_tagihan_bulanan(request):
    periode = request.data.get('periode')
    if not periode:
        return Response({'detail': 'Periode wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    penghuni_aktif = Penghuni.objects.filter(status_aktif=True, kamar__isnull=False)
    created_count = 0

    with transaction.atomic():
        for p in penghuni_aktif:
            nominal = p.kamar.harga_sewa / 2 if p.kamar.tipe == 'berdua' else p.kamar.harga_sewa
            jatuh_tempo = now().date() + timedelta(days=10)
            Tagihan.objects.create(
                penghuni=p, periode=periode, nominal=nominal,
                jatuh_tempo=jatuh_tempo, status='belum_dibayar'
            )
            created_count += 1

    return Response({'detail': f'{created_count} tagihan berhasil dibuat untuk periode {periode}.'})

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
        if (hasattr(user, 'profiluser') and user.profiluser.role == 'pengurus') or user.is_superuser:
            return Keluhan.objects.all().order_by('-tanggal_kirim')
        return Keluhan.objects.filter(penghuni__user=user).order_by('-tanggal_kirim')

    def perform_create(self, serializer):
        penghuni = Penghuni.objects.get(user=self.request.user)
        serializer.save(penghuni=penghuni)

class KeluhanUpdateAPI(generics.UpdateAPIView):
    queryset = Keluhan.objects.all()
    serializer_class = KeluhanSerializer
    permission_classes = [IsPengurus]

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
    email = (request.data.get('email') or '').strip()
    if not email:
        return Response({'detail': 'Email wajib diisi.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response({'detail': 'Email tidak terdaftar.'}, status=status.HTTP_404_NOT_FOUND)

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