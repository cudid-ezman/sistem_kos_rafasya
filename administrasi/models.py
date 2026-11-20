from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

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
    tipe = models.CharField(max_length=20, choices=TIPE_CHOICES, default='individu')
    harga_individu = models.FloatField(default=550000)
    harga_berdua = models.FloatField(default=800000)
    biaya_fasilitas = models.FloatField(default=0)
    harga_sewa = models.FloatField(default=550000)
    fasilitas = models.TextField(blank=True, default='')
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
    ringkasan = models.CharField(max_length=255, blank=True, default='')
    isi = models.TextField(blank=True, default='')
    ikon = models.CharField(max_length=30, default='aturan-kos')
    tanggal_pembaruan = models.DateField(auto_now=True)

    def __str__(self):
        return self.kategori

class Notifikasi(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pesan = models.TextField()
    sudah_dibaca = models.BooleanField(default=False)
    waktu = models.DateTimeField(auto_now_add=True)

def sinkron_status_kamar(kamar):
    if not kamar:
        return
    if not Kamar.objects.filter(pk=kamar.pk).exists():
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
        kamar.biaya_fasilitas = 200000 if pakai_fasilitas else 0
        kamar.harga_sewa = kamar.harga_individu + kamar.biaya_fasilitas
    else:
        kamar.status = 'terisi'
        kamar.tipe = 'berdua'
        kamar.biaya_fasilitas = 310000 if pakai_fasilitas else 0
        kamar.harga_sewa = kamar.harga_berdua + kamar.biaya_fasilitas

    kamar.save(update_fields=['status', 'tipe', 'biaya_fasilitas', 'harga_sewa'])


@receiver(pre_save, sender=Penghuni)
def _simpan_kamar_lama_penghuni(sender, instance, **kwargs):
    if instance.pk:
        lama = Penghuni.objects.filter(pk=instance.pk).only('kamar').first()
        instance._kamar_lama = lama.kamar if lama else None
    else:
        instance._kamar_lama = None


@receiver(post_save, sender=Penghuni)
def _auto_sinkron_kamar_saat_simpan(sender, instance, **kwargs):
    kamar_lama = getattr(instance, '_kamar_lama', None)
    if kamar_lama and kamar_lama != instance.kamar:
        sinkron_status_kamar(kamar_lama)
    if instance.kamar:
        sinkron_status_kamar(instance.kamar)


@receiver(post_delete, sender=Penghuni)
def _auto_sinkron_kamar_saat_hapus(sender, instance, **kwargs):
    if instance.kamar_id:
        kamar = Kamar.objects.filter(pk=instance.kamar_id).first()
        if kamar:
            sinkron_status_kamar(kamar)