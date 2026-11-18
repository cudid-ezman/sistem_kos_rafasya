"""
Mengisi 45 kamar sesuai denah: Blok A (13), B (14), C (14), D (4).
Aman dijalankan berulang: kamar yang sudah ada tidak diubah.

    python manage.py seed_kamar

Semua kamar berstatus "tersedia". Kamar A12 dibuat bertipe berdua (Rp 750.000)
agar cocok dengan penghuni demo; kamar lain bertipe individu (Rp 550.000).
Ubah tipe/harga lewat menu Data Kamar atau edit konstanta di bawah.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from administrasi.models import Kamar

BLOK = {"A": 13, "B": 14, "C": 14, "D": 4}

TIPE_DEFAULT = "individu"
HARGA_DEFAULT = 550000
FASILITAS = "Kasur, lemari, kamar mandi dalam"

# Pengecualian per kamar: nomor -> (tipe, harga)
KHUSUS = {"A12": ("berdua", 750000)}


class Command(BaseCommand):
    help = "Buat 45 kamar (Blok A 13, B 14, C 14, D 4) dengan status tersedia."

    @transaction.atomic
    def handle(self, *args, **options):
        dibuat = 0
        for blok, jumlah in BLOK.items():
            for n in range(1, jumlah + 1):
                nomor = f"{blok}{n:02d}"
                tipe, harga = KHUSUS.get(nomor, (TIPE_DEFAULT, HARGA_DEFAULT))
                _, baru = Kamar.objects.get_or_create(
                    nomor_kamar=nomor,
                    defaults={
                        "tipe": tipe,
                        "harga_sewa": harga,
                        "fasilitas": FASILITAS,
                        "status": "tersedia",
                    },
                )
                dibuat += int(baru)

        total = Kamar.objects.count()
        tersedia = Kamar.objects.filter(status="tersedia").count()
        self.stdout.write(self.style.SUCCESS(f"Selesai: {dibuat} kamar baru dibuat."))
        self.stdout.write(f"  Total kamar  : {total}")
        self.stdout.write(f"  Tersedia     : {tersedia}")
        self.stdout.write(f"  Terisi       : {total - tersedia}")