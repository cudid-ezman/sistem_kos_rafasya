from django.contrib import admin
from .models import (
    ProfilUser, Kamar, Penghuni, Tagihan, BuktiPembayaran, 
    Denda, KategoriKeluhan, Keluhan, RiwayatStatusKeluhan, 
    Informasi, Notifikasi
)

# Mendaftarkan semua tabel agar muncul di halaman admin
admin.site.register(ProfilUser)
admin.site.register(Kamar)
admin.site.register(Penghuni)
admin.site.register(Tagihan)
admin.site.register(BuktiPembayaran)
admin.site.register(Denda)
admin.site.register(KategoriKeluhan)
admin.site.register(Keluhan)
admin.site.register(RiwayatStatusKeluhan)
admin.site.register(Informasi)
admin.site.register(Notifikasi)

from .models import LogNotifikasiWA

@admin.register(LogNotifikasiWA)
class LogNotifikasiWAAdmin(admin.ModelAdmin):
    list_display = ('waktu_kirim', 'tujuan_role', 'nomor_tujuan', 'jenis_event', 'status_kirim')
    list_filter = ('status_kirim', 'tujuan_role', 'jenis_event')
    search_fields = ('nomor_tujuan', 'pesan', 'referensi_kode')
    readonly_fields = ('waktu_kirim',)
