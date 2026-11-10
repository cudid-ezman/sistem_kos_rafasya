from django.db import models
from django.contrib.auth.models import User

# Menggunakan User bawaan Django dan menambahkan Role
class ProfilUser(models.Model):
    ROLE_CHOICES = (
        ('penghuni', 'Penghuni'),
        ('pengurus', 'Pengurus'),
        ('pemilik', 'Pemilik'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Kamar(models.Model):
    TIPE_CHOICES = (('individu', 'Individu'), ('berdua', 'Berdua'))
    STATUS_CHOICES = (('tersedia', 'Tersedia'), ('terisi', 'Terisi'))

    nomor_kamar = models.CharField(max_length=10, unique=True)
    tipe = models.CharField(max_length=20, choices=TIPE_CHOICES)
    harga_sewa = models.FloatField()
    fasilitas = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='tersedia')

class Penghuni(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    kamar = models.ForeignKey(Kamar, on_delete=models.SET_NULL, null=True, blank=True)
    no_identitas = models.CharField(max_length=50)
    no_kontak = models.CharField(max_length=20)
    tanggal_masuk = models.DateField()
    status_aktif = models.BooleanField(default=True)

class Tagihan(models.Model):
    STATUS_CHOICES = (
        ('belum_dibayar', 'Belum Dibayar'),
        ('menunggu_verifikasi', 'Menunggu Verifikasi'),
        ('lunas', 'Lunas'),
        ('ditolak', 'Ditolak'),
        ('terlambat', 'Terlambat'),
    )
    penghuni = models.ForeignKey(Penghuni, on_delete=models.CASCADE)
    periode = models.CharField(max_length=50)
    nominal = models.FloatField()
    jatuh_tempo = models.DateField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='belum_dibayar')
    catatan = models.TextField(blank=True, null=True)

class BuktiPembayaran(models.Model):
    tagihan = models.ForeignKey(Tagihan, on_delete=models.CASCADE)
    berkas = models.ImageField(upload_to='bukti_pembayaran/')
    tanggal_bayar = models.DateField()
    waktu_unggah = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=30, default='menunggu_verifikasi')
    catatan_penolakan = models.TextField(blank=True, null=True)
    tanggal_verifikasi = models.DateField(blank=True, null=True)
    verifikator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

class Denda(models.Model):
    tagihan = models.ForeignKey(Tagihan, on_delete=models.CASCADE)
    jumlah_hari = models.IntegerField()
    nominal = models.FloatField()
    tanggal_hitung = models.DateField(auto_now=True)

class KategoriKeluhan(models.Model):
    nama = models.CharField(max_length=100)

class Keluhan(models.Model):
    STATUS_CHOICES = (('diterima', 'Diterima'), ('diproses', 'Diproses'), ('selesai', 'Selesai'))
    penghuni = models.ForeignKey(Penghuni, on_delete=models.CASCADE)
    kategori = models.ForeignKey(KategoriKeluhan, on_delete=models.SET_NULL, null=True)
    deskripsi = models.TextField()
    foto = models.ImageField(upload_to='keluhan/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='diterima')
    catatan_tindak_lanjut = models.TextField(blank=True, null=True)
    tanggal_kirim = models.DateTimeField(auto_now_add=True)

class RiwayatStatusKeluhan(models.Model):
    keluhan = models.ForeignKey(Keluhan, on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    catatan = models.TextField(blank=True, null=True)
    waktu = models.DateTimeField(auto_now_add=True)

class Informasi(models.Model):
    kategori = models.CharField(max_length=100)
    isi = models.TextField()
    tanggal_pembaruan = models.DateField(auto_now=True)

class Notifikasi(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pesan = models.TextField()
    sudah_dibaca = models.BooleanField(default=False)
    waktu = models.DateTimeField(auto_now_add=True)