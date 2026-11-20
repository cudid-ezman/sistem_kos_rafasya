"""
Membuat 1 akun penghuni contoh beserta tagihan & keluhan, khusus untuk melihat
tampilan portal penghuni. Aman dijalankan berulang (data demo di-reset).

    python manage.py seed_demo_penghuni

Login:  username = demo   |   password = demo12345
"""
import base64
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from administrasi.models import (
    BuktiPembayaran, Kamar, KategoriKeluhan, Keluhan, Penghuni, ProfilUser, Tagihan,
)

BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

# PNG 1x1 piksel (sekadar berkas contoh untuk bukti pembayaran)
PNG_KECIL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

USERNAME = "demo"
PASSWORD = "demo12345"
NO_IDENTITAS = "1471010101010001"


def geser_bulan(d: date, selisih: int) -> date:
    """Geser tanggal d sebanyak `selisih` bulan, ambil tanggal 15."""
    total = d.year * 12 + (d.month - 1) + selisih
    return date(total // 12, total % 12 + 1, 15)


class Command(BaseCommand):
    help = "Buat penghuni demo (username: demo, password: demo12345) lengkap dengan tagihan & keluhan."

    @transaction.atomic
    def handle(self, *args, **options):
        hari_ini = date.today()

        # Kamar berdua A12 (pakai yang sudah ada jika nomor sama)
        kamar, _ = Kamar.objects.get_or_create(
            nomor_kamar="A12",
            defaults={"tipe": "berdua", "harga_sewa": 750000, "fasilitas": "Kasur, lemari, kamar mandi dalam"},
        )
        kamar.status = "terisi"
        kamar.save()

        # Akun + profil + penghuni
        user, _ = User.objects.get_or_create(username=USERNAME)
        user.first_name = "Muhammad Fajar Pratama"
        user.set_password(PASSWORD)
        user.save()
        ProfilUser.objects.update_or_create(user=user, defaults={"role": "penghuni"})
        penghuni, _ = Penghuni.objects.update_or_create(
            user=user,
            defaults={
                "kamar": kamar,
                "no_identitas": NO_IDENTITAS,
                "no_kontak": "081234567890",
                "tanggal_masuk": hari_ini - timedelta(days=150),
                "status_aktif": True,
            },
        )

        # Reset data demo sebelumnya
        Tagihan.objects.filter(penghuni=penghuni).delete()
        Keluhan.objects.filter(penghuni=penghuni).delete()

        nominal = kamar.harga_sewa / 2 if kamar.tipe == "berdua" else kamar.harga_sewa

        # 3 tagihan lunas sebelumnya
        for selisih in (-3, -2, -1):
            tgl = geser_bulan(hari_ini, selisih)
            t = Tagihan.objects.create(
                penghuni=penghuni, periode=f"{BULAN[tgl.month - 1]} {tgl.year}",
                nominal=nominal, jatuh_tempo=tgl, status="lunas",
            )
            b = BuktiPembayaran(
                tagihan=t, tanggal_bayar=tgl - timedelta(days=5), status="diterima",
                tanggal_verifikasi=tgl - timedelta(days=4),
            )
            b.berkas.save("bukti_demo.png", ContentFile(PNG_KECIL), save=False)
            b.save()

        # Tagihan terbaru: ditolak & sudah lewat jatuh tempo 4 hari (denda Rp 40.000)
        tempo = hari_ini - timedelta(days=4)
        t = Tagihan.objects.create(
            penghuni=penghuni, periode=f"{BULAN[tempo.month - 1]} {tempo.year}",
            nominal=nominal, jatuh_tempo=tempo, status="ditolak",
        )
        b = BuktiPembayaran(
            tagihan=t, tanggal_bayar=tempo + timedelta(days=1), status="ditolak",
            catatan_penolakan=(
                "Bukti pembayaran buram dan nominal tidak sesuai. "
                "Silakan bayar ulang sesuai total tagihan dan unggah bukti yang jelas."
            ),
            tanggal_verifikasi=hari_ini,
        )
        b.berkas.save("bukti_pembayaran_demo.png", ContentFile(PNG_KECIL), save=False)
        b.save()

        # Keluhan contoh (diterima / diproses / selesai)
        kat = {n: KategoriKeluhan.objects.get_or_create(nama=n)[0] for n in ("Air", "Wi-Fi", "Listrik", "Lainnya")}
        Keluhan.objects.create(
            penghuni=penghuni, kategori=kat["Lainnya"], status="diterima",
            deskripsi="Lampu koridor blok A padam sejak semalam.",
        )
        Keluhan.objects.create(
            penghuni=penghuni, kategori=kat["Air"], status="diproses",
            deskripsi="Kran air kamar mandi bocor dan menetes terus.",
            catatan_tindak_lanjut="Teknisi akan memeriksa kran dalam waktu dekat. Mohon pastikan kamar dapat diakses.",
        )
        Keluhan.objects.create(
            penghuni=penghuni, kategori=kat["Wi-Fi"], status="selesai",
            deskripsi="Wi-Fi sering terputus di malam hari.",
            catatan_tindak_lanjut="Router sudah diganti dan jaringan kembali stabil.",
        )

        self.stdout.write(self.style.SUCCESS("Penghuni demo siap."))
        self.stdout.write(f"  Username : {USERNAME}")
        self.stdout.write(f"  Password : {PASSWORD}")
        self.stdout.write("  Isi      : 3 tagihan lunas, 1 tagihan ditolak (+denda), 3 keluhan")