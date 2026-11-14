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

from administrasi.models import (
    ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, KategoriKeluhan, Keluhan
)
from .serializers import (
    KamarSerializer, PenghuniSerializer, TagihanSerializer,
    BuktiPembayaranSerializer, KategoriKeluhanSerializer, KeluhanSerializer
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
        nama = request.data.get('nama_lengkap')
        no_identitas = request.data.get('no_identitas')
        no_kontak = request.data.get('no_kontak')
        kamar_id = request.data.get('kamar')
        tanggal_masuk = request.data.get('tanggal_masuk')

        if User.objects.filter(username=no_identitas).exists():
            return Response({'detail': 'NIK / Username sudah terdaftar.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user_baru = User.objects.create_user(username=no_identitas, password='kos12345', first_name=nama)
            ProfilUser.objects.create(user=user_baru, role='penghuni')

            kamar = Kamar.objects.get(id=kamar_id)
            kamar.status = 'terisi'
            kamar.save()

            penghuni = Penghuni.objects.create(
                user=user_baru, kamar=kamar, no_identitas=no_identitas,
                no_kontak=no_kontak, tanggal_masuk=tanggal_masuk
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