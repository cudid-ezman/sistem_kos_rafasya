from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import HttpResponse
from .models import ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, KategoriKeluhan, Keluhan
from datetime import timedelta
from django.utils.timezone import now
from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from rest_framework import generics

from .serializers import KamarSerializer, PenghuniSerializer, TagihanSerializer, KeluhanSerializer
from .models import Kamar, Penghuni, Tagihan, Keluhan
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# ==========================================
# MODUL AUTENTIKASI
# ==========================================
def login_view(request):
    if request.method == 'POST':
        u = request.POST.get('username')
        p = request.POST.get('password')
        user = authenticate(request, username=u, password=p)
        
        if user is not None:
            login(request, user)
            try:
                role = user.profiluser.role
                if role == 'pemilik':
                    return redirect('laporan_keuangan')
                elif role == 'pengurus':
                    return redirect('data_kamar') # Pengurus langsung diarahkan ke Data Kamar
                elif role == 'penghuni':
                    return redirect('tagihan_saya')
            except ProfilUser.DoesNotExist:
                if user.is_superuser:
                    return redirect('/admin/')
                return HttpResponse("Akun ini belum memiliki role.")
        else:
            messages.error(request, 'Username atau password salah.')
            
    return render(request, 'administrasi/login.html')

def logout_view(request):
    logout(request) # Menghapus sesi (session) user yang sedang aktif
    return redirect('login') # Mengarahkan kembali ke halaman login

# ==========================================
# MODUL PENGURUS
# ==========================================
def data_kamar(request):
    semua_kamar = Kamar.objects.all()
    context = {'kamar_list': semua_kamar}
    return render(request, 'administrasi/data_kamar.html', context)

def tambah_kamar(request):
    if request.method == 'POST':
        nomor = request.POST.get('nomor_kamar')
        tipe = request.POST.get('tipe')
        harga = request.POST.get('harga_sewa')
        fasilitas = request.POST.get('fasilitas')
        
        Kamar.objects.create(
            nomor_kamar=nomor, tipe=tipe, harga_sewa=harga, fasilitas=fasilitas
        )
        return redirect('data_kamar')
        
    return render(request, 'administrasi/tambah_kamar.html')

def data_penghuni(request):
    semua_penghuni = Penghuni.objects.all()
    context = {'penghuni_list': semua_penghuni}
    return render(request, 'administrasi/data_penghuni.html', context)

def tambah_penghuni(request):
    if request.method == 'POST':
        nama = request.POST.get('nama')
        no_identitas = request.POST.get('no_identitas')
        no_kontak = request.POST.get('no_kontak')
        kamar_id = request.POST.get('kamar_id')
        tanggal_masuk = request.POST.get('tanggal_masuk')

        # 1. Buat Akun Login Penghuni Otomatis (Username = NIK, Password = kos12345)
        user_baru = User.objects.create_user(username=no_identitas, password='kos12345', first_name=nama)
        
        # 2. Set Hak Akses (Role) sebagai Penghuni
        ProfilUser.objects.create(user=user_baru, role='penghuni')
        
        # 3. Ubah status kamar menjadi 'terisi'
        kamar = Kamar.objects.get(id=kamar_id)
        kamar.status = 'terisi'
        kamar.save()
        
        # 4. Simpan Data Penghuni
        Penghuni.objects.create(
            user=user_baru,
            kamar=kamar,
            no_identitas=no_identitas,
            no_kontak=no_kontak,
            tanggal_masuk=tanggal_masuk
        )
        return redirect('data_penghuni')
        
    kamar_tersedia = Kamar.objects.filter(status='tersedia')
    return render(request, 'administrasi/tambah_penghuni.html', {'kamar_tersedia': kamar_tersedia})

# ==========================================
# MODUL TAGIHAN (PENGURUS)
# ==========================================
def tagihan_pengurus(request):
    # Mengambil semua tagihan, diurutkan dari yang terbaru
    semua_tagihan = Tagihan.objects.all().order_by('-id')
    return render(request, 'administrasi/tagihan_pengurus.html', {'tagihan_list': semua_tagihan})

def buat_tagihan(request):
    if request.method == 'POST':
        periode = request.POST.get('periode')
        penghuni_aktif = Penghuni.objects.filter(status_aktif=True)

        for p in penghuni_aktif:
            # Aturan Bisnis: Jika kamar berdua, tagihan dibagi rata
            kamar = p.kamar
            if kamar.tipe == 'berdua':
                nominal_tagihan = kamar.harga_sewa / 2
            else:
                nominal_tagihan = kamar.harga_sewa
            
            # Jatuh tempo diset 10 hari dari tanggal pembuatan (sebagai standar prototipe)
            tanggal_jatuh_tempo = now().date() + timedelta(days=10)

            # Buat record Tagihan baru
            Tagihan.objects.create(
                penghuni=p,
                periode=periode,
                nominal=nominal_tagihan,
                jatuh_tempo=tanggal_jatuh_tempo,
                status='belum_dibayar'
            )
        
        return redirect('tagihan_pengurus')
    return redirect('tagihan_pengurus')

@login_required(login_url='/login/')
def tagihan_saya(request):
    # Mengambil tagihan yang HANYA milik penghuni yang sedang login
    try:
        profil_penghuni = request.user.penghuni
        tagihan_pribadi = Tagihan.objects.filter(penghuni=profil_penghuni).order_by('-id')
    except Penghuni.DoesNotExist:
        tagihan_pribadi = []
        
    return render(request, 'administrasi/tagihan_penghuni.html', {'tagihan_list': tagihan_pribadi})

def bayar_tagihan(request, tagihan_id):
    tagihan = Tagihan.objects.get(id=tagihan_id)
    
    if request.method == 'POST':
        tgl_bayar = request.POST.get('tanggal_bayar')
        file_berkas = request.FILES.get('berkas') # Mengambil file gambar
        
        # Simpan ke tabel BuktiPembayaran
        BuktiPembayaran.objects.create(
            tagihan=tagihan,
            berkas=file_berkas,
            tanggal_bayar=tgl_bayar
        )
        
        # Ubah status tagihan menjadi menunggu verifikasi
        tagihan.status = 'menunggu_verifikasi'
        tagihan.save()
        
        return redirect('tagihan_saya')
        
    return render(request, 'administrasi/bayar_tagihan.html', {'tagihan': tagihan})

    # ==========================================
# MODUL VERIFIKASI PEMBAYARAN (PENGURUS)
# ==========================================
def daftar_verifikasi(request):
    # Mengambil data bukti pembayaran yang statusnya masih menunggu
    bukti_list = BuktiPembayaran.objects.filter(status='menunggu_verifikasi').order_by('-waktu_unggah')
    return render(request, 'administrasi/verifikasi_pembayaran.html', {'bukti_list': bukti_list})

def proses_verifikasi(request, bukti_id, aksi):
    bukti = BuktiPembayaran.objects.get(id=bukti_id)
    tagihan = bukti.tagihan
    
    if aksi == 'terima':
        bukti.status = 'diterima'
        tagihan.status = 'lunas'
    elif aksi == 'tolak':
        bukti.status = 'ditolak'
        tagihan.status = 'ditolak'
        
    # Catat siapa pengurus yang melakukan verifikasi
    if request.user.is_authenticated:
        bukti.verifikator = request.user
        
    bukti.save()
    tagihan.save()
    
    return redirect('daftar_verifikasi')

# ==========================================
# MODUL KELUHAN (PENGHUNI & PENGURUS)
# ==========================================
from django.contrib.auth.decorators import login_required

@login_required(login_url='/login/')
def keluhan_penghuni(request):
    try:
        profil_penghuni = request.user.penghuni
    except:
        return redirect('login') # Jaga-jaga jika pengurus nyasar ke halaman ini

    if request.method == 'POST':
        kategori_id = request.POST.get('kategori_id')
        deskripsi = request.POST.get('deskripsi')
        foto = request.FILES.get('foto')
        
        kategori = KategoriKeluhan.objects.get(id=kategori_id)
        Keluhan.objects.create(
            penghuni=profil_penghuni, kategori=kategori, deskripsi=deskripsi, foto=foto
        )
        return redirect('keluhan_penghuni')
        
    keluhan_list = Keluhan.objects.filter(penghuni=profil_penghuni).order_by('-tanggal_kirim')
    kategori_list = KategoriKeluhan.objects.all()
    return render(request, 'administrasi/keluhan_penghuni.html', {
        'keluhan_list': keluhan_list, 'kategori_list': kategori_list
    })

def daftar_keluhan(request):
    semua_keluhan = Keluhan.objects.all().order_by('-tanggal_kirim')
    return render(request, 'administrasi/daftar_keluhan.html', {'keluhan_list': semua_keluhan})

def proses_keluhan(request, keluhan_id, status_baru):
    keluhan = Keluhan.objects.get(id=keluhan_id)
    keluhan.status = status_baru
    keluhan.save()
    return redirect('daftar_keluhan')

# ==========================================
# MODUL PEMILIK KOS
# ==========================================
def laporan_keuangan(request):
    # Proteksi: Pastikan hanya Pemilik yang bisa mengakses data ini
    try:
        if request.user.profiluser.role != 'pemilik':
            return redirect('login')
    except:
        return redirect('login')

    # Mengambil semua tagihan yang sudah LUNAS
    tagihan_lunas = Tagihan.objects.filter(status='lunas').order_by('-id')
    
    # Menghitung total uang masuk menggunakan fungsi agregasi Sum dari Django
    total_pemasukan = tagihan_lunas.aggregate(Sum('nominal'))['nominal__sum'] or 0

    context = {
        'tagihan_lunas': tagihan_lunas,
        'total_pemasukan': total_pemasukan
    }
    return render(request, 'administrasi/laporan_keuangan.html', context)


# ==========================================
# ENDPOINT PROFIL USER (Untuk frontend cek role)
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_diri(request):
    user = request.user
    role = 'unknown'

    # 1. Cek dulu apakah dia ada di tabel ProfilUser (Untuk Pengurus / Pemilik)
    if hasattr(user, 'profiluser'):
        role = user.profiluser.role
        
    # 2. Jika bukan pengurus, cek apakah dia ada di tabel Penghuni (Untuk Anak Kos)
    # Asumsi model Penghuni terhubung ke tabel User
    elif Penghuni.objects.filter(user=user).exists():
        role = 'penghuni'
        
    # 3. Fallback jika dia adalah admin bawaan Django (createsuperuser)
    elif user.is_superuser:
        role = 'superadmin'

    return Response({
        'id': user.id,
        'username': user.username,
        'nama_lengkap': user.first_name,
        'role': role
    })

# ==========================================
# UPDATE API YANG SUDAH ADA DENGAN GEMBOK KEAMANAN
# ==========================================
class TagihanListCreateAPI(generics.ListCreateAPIView):
    serializer_class = TagihanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 1. Jika dia pengurus atau superadmin, berikan semua data tagihan
        if hasattr(user, 'profiluser') or user.is_superuser:
            return Tagihan.objects.all().order_by('-id')
            
        # 2. Jika dia penghuni, filter tagihan khusus untuk dirinya saja
        # Asumsi: model Tagihan memiliki ForeignKey ke Penghuni, dan Penghuni punya ForeignKey ke User
        return Tagihan.objects.filter(penghuni__user=user).order_by('-id')

class KeluhanListCreateAPI(generics.ListCreateAPIView):
    queryset = Keluhan.objects.all().order_by('-tanggal_kirim')
    serializer_class = KeluhanSerializer
    permission_classes = [IsAuthenticated] 

# bisa dilihat publik (misal untuk promosi kos di halaman depan).

class KamarListCreateAPI(generics.ListCreateAPIView):
    queryset = Kamar.objects.all()
    serializer_class = KamarSerializer

class PenghuniListCreateAPI(generics.ListCreateAPIView):
    queryset = Penghuni.objects.all()
    serializer_class = PenghuniSerializer

