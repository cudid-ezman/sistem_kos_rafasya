from django.core.management.base import BaseCommand
from django.utils.timezone import now
from administrasi.models import Tagihan
from administrasi.whatsapp import _penerima_kamar, _rp, kirim_wa_async


class Command(BaseCommand):
    help = "Mengirim pengingat jatuh tempo (H-3) dan peringatan denda keterlambatan via WhatsApp"

    def handle(self, *args, **options):
        hari_ini = now().date()
        tagihan_aktif = Tagihan.objects.select_related("kamar", "penghuni__user", "penghuni__kamar").filter(
            status__in=["belum_dibayar", "terlambat", "ditolak"]
        )

        terproses = 0
        for t in tagihan_aktif:
            selisih = (t.jatuh_tempo - hari_ini).days
            kamar = t.kamar.nomor_kamar if t.kamar else "-"
            penerima = _penerima_kamar(t)
            if not penerima:
                continue

            # 1. Pengingat H-3 sebelum jatuh tempo
            if selisih == 3:
                ref = f"h3-{t.id}-{hari_ini.isoformat()}"
                for p in penerima:
                    nama = p.user.first_name or p.user.username
                    pesan = (
                        f"*[Kos Putra Raffasya]*\n"
                        f"Halo {nama}, pengingat tagihan sewa *Kamar {kamar}* periode *{t.periode}* sebesar *{_rp(t.nominal)}* "
                        f"akan jatuh tempo pada *{t.jatuh_tempo}* (3 hari lagi).\n"
                        f"Mohon melakukan pembayaran tepat waktu agar terhindar dari denda keterlambatan."
                    )
                    kirim_wa_async("penghuni", p.no_kontak, "pengingat_h3", pesan, referensi_kode=ref, sync=True)
                    terproses += 1

            # 2. Peringatan denda keterlambatan (H+1 dan setiap kelipatan 3 hari keterlambatan)
            elif selisih < 0:
                hari_telat, nominal_denda = t.hitung_denda_pada(hari_ini)
                if hari_telat == 1 or hari_telat % 3 == 0:
                    total = float(t.nominal or 0) + nominal_denda
                    ref = f"denda-{t.id}-{hari_ini.isoformat()}"
                    for p in penerima:
                        nama = p.user.first_name or p.user.username
                        pesan = (
                            f"*[Kos Putra Raffasya]*\n"
                            f"Halo {nama}, tagihan sewa *Kamar {kamar}* periode *{t.periode}* telah melewati jatuh tempo (*{t.jatuh_tempo}*).\n"
                            f"• Keterlambatan: *{hari_telat} hari*\n"
                            f"• Pokok Sewa: {_rp(t.nominal)}\n"
                            f"• Denda Berjalan: *{_rp(nominal_denda)}*\n"
                            f"• Total Tagihan: *{_rp(total)}*\n"
                            f"Segera lakukan pembayaran & unggah bukti transfer di portal penghuni."
                        )
                        kirim_wa_async("penghuni", p.no_kontak, "peringatan_denda", pesan, referensi_kode=ref, sync=True)
                        terproses += 1

        self.stdout.write(self.style.SUCCESS(f"Selesai memproses pengingat WA ({terproses} pesan diproses)."))
