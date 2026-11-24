import json
import logging
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
from django.conf import settings
from django.db import close_old_connections
from .models import LogNotifikasiWA, Penghuni

logger = logging.getLogger(__name__)


def normalisasi_nomor_wa(nomor: str) -> str:
    digits = re.sub(r"\D", "", str(nomor or ""))
    if not digits:
        return ""
    if digits.startswith("0"):
        return "62" + digits[1:]
    if digits.startswith("8"):
        return "62" + digits
    return digits


def _rp(nominal) -> str:
    return f"Rp {int(round(float(nominal or 0))):,}".replace(",", ".")


def _penerima_kamar(tagihan):
    """Kembalikan list penghuni aktif yang terkait dengan tagihan (1 atau 2 orang jika kamar berdua)."""
    if tagihan.kamar_id:
        qs = Penghuni.objects.select_related("user", "kamar").filter(
            kamar_id=tagihan.kamar_id, status_aktif=True
        )
        if qs.exists():
            return list(qs)
    if tagihan.penghuni_id:
        return [tagihan.penghuni]
    return []


def _eksekusi_kirim(tujuan_role: str, nomor_wa: str, jenis_event: str, pesan: str, referensi_kode: str = ""):
    close_old_connections()
    url = getattr(settings, "WA_GATEWAY_URL", "").strip()
    token = getattr(settings, "WA_GATEWAY_TOKEN", "").strip()

    if not token or not url:
        LogNotifikasiWA.objects.create(
            tujuan_role=tujuan_role,
            nomor_tujuan=nomor_wa,
            jenis_event=jenis_event,
            referensi_kode=referensi_kode,
            pesan=pesan,
            status_kirim="simulasi",
            respons_gateway="WA_GATEWAY_TOKEN belum diisi di .env (mode simulasi).",
        )
        print(f"[WA SIMULASI -> {tujuan_role.upper()} {nomor_wa}] ({jenis_event})\n{pesan}\n")
        return

    try:
        if "fonnte.com" in url.lower():
            payload = urllib.parse.urlencode({"target": nomor_wa, "message": pesan}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Authorization": token},
                method="POST",
            )
        else:
            # Kompatibel dengan WAHA (/api/sendText) & webhook JSON umum
            body = json.dumps({"chatId": f"{nomor_wa}@c.us", "phone": nomor_wa, "text": pesan, "message": pesan}).encode("utf-8")
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}", "X-Api-Key": token}
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_text = resp.read().decode("utf-8", errors="ignore")[:1000]
            status_kirim = "terkirim" if 200 <= resp.status < 300 else "gagal"
    except Exception as exc:
        resp_text = str(exc)[:1000]
        status_kirim = "gagal"
        logger.warning("Gagal mengirim WA ke %s: %s", nomor_wa, exc)

    LogNotifikasiWA.objects.create(
        tujuan_role=tujuan_role,
        nomor_tujuan=nomor_wa,
        jenis_event=jenis_event,
        referensi_kode=referensi_kode,
        pesan=pesan,
        status_kirim=status_kirim,
        respons_gateway=resp_text,
    )


def kirim_wa_async(tujuan_role: str, nomor_raw: str, jenis_event: str, pesan: str, referensi_kode: str = "", sync: bool = False):
    nomor_wa = normalisasi_nomor_wa(nomor_raw)
    if not nomor_wa:
        return
    if referensi_kode and LogNotifikasiWA.objects.filter(
        nomor_tujuan=nomor_wa, referensi_kode=referensi_kode, status_kirim__in=["simulasi", "terkirim"]
    ).exists():
        return
    if sync:
        _eksekusi_kirim(tujuan_role, nomor_wa, jenis_event, pesan, referensi_kode)
    else:
        t = threading.Thread(
            target=_eksekusi_kirim,
            args=(tujuan_role, nomor_wa, jenis_event, pesan, referensi_kode),
            daemon=True,
        )
        t.start()


# === TEMPLATE EVENT NOTIFIKASI ===

def wa_bukti_diunggah(bukti):
    no_pengurus = getattr(settings, "WA_PENGURUS", "")
    if not no_pengurus:
        return
    t = bukti.tagihan
    kamar = t.kamar.nomor_kamar if t.kamar else (t.penghuni.kamar.nomor_kamar if t.penghuni and t.penghuni.kamar else "-")
    pengaju = (
        (bukti.diunggah_oleh.user.first_name or bukti.diunggah_oleh.user.username)
        if bukti.diunggah_oleh and bukti.diunggah_oleh.user
        else (t.nama_penghuni_snapshot or "Penghuni")
    )
    total = float(t.nominal or 0) + float(t.denda or 0)
    pesan = (
        f"*[Kos Putra Raffasya]*\n"
        f"Bukti pembayaran baru diunggah:\n"
        f"• Kamar: {kamar} ({pengaju})\n"
        f"• Periode: {t.periode}\n"
        f"• Total Tagihan: {_rp(total)}\n"
        f"Silakan cek & verifikasi di panel pengurus."
    )
    kirim_wa_async("pengurus", no_pengurus, "bukti_pembayaran_baru", pesan)


def wa_verifikasi_pembayaran(bukti, aksi: str, catatan: str = ""):
    t = bukti.tagihan
    kamar = t.kamar.nomor_kamar if t.kamar else "-"
    total = float(t.nominal or 0) + float(t.denda or 0)
    for p in _penerima_kamar(t):
        nama = p.user.first_name or p.user.username
        if aksi == "terima":
            pesan = (
                f"*[Kos Putra Raffasya]*\n"
                f"Halo {nama}, pembayaran sewa *Kamar {kamar}* periode *{t.periode}* sebesar *{_rp(total)}* telah *DIVERIFIKASI & LUNAS*.\n"
                f"Terima kasih."
            )
            kirim_wa_async("penghuni", p.no_kontak, "pembayaran_lunas", pesan)
        else:
            alasan = f"\nCatatan: {catatan}" if catatan else ""
            pesan = (
                f"*[Kos Putra Raffasya]*\n"
                f"Halo {nama}, bukti pembayaran *Kamar {kamar}* periode *{t.periode}* *DITOLAK* pengurus.{alasan}\n"
                f"Silakan unggah ulang bukti pembayaran yang sesuai di portal penghuni."
            )
            kirim_wa_async("penghuni", p.no_kontak, "pembayaran_ditolak", pesan)


def wa_ajukan_perpanjangan(tagihan):
    no_pengurus = getattr(settings, "WA_PENGURUS", "")
    if not no_pengurus:
        return
    kamar = tagihan.kamar.nomor_kamar if tagihan.kamar else "-"
    nama = tagihan.penghuni.user.first_name or tagihan.penghuni.user.username
    pesan = (
        f"*[Kos Putra Raffasya]*\n"
        f"Pengajuan perpanjangan jatuh tempo:\n"
        f"• Kamar: {kamar} ({nama})\n"
        f"• Periode: {tagihan.periode}\n"
        f"• Minta undur s/d: {tagihan.tanggal_perpanjangan}\n"
        f"• Alasan: {tagihan.alasan_perpanjangan}"
    )
    kirim_wa_async("pengurus", no_pengurus, "ajukan_dispensasi", pesan)


def wa_respon_perpanjangan(tagihan, aksi: str):
    kamar = tagihan.kamar.nomor_kamar if tagihan.kamar else "-"
    for p in _penerima_kamar(tagihan):
        nama = p.user.first_name or p.user.username
        if aksi == "setujui":
            pesan = (
                f"*[Kos Putra Raffasya]*\n"
                f"Halo {nama}, pengajuan perpanjangan jatuh tempo *Kamar {kamar}* ({tagihan.periode}) *DISETUJUI* hingga *{tagihan.jatuh_tempo}*."
            )
            kirim_wa_async("penghuni", p.no_kontak, "dispensasi_disetujui", pesan)
        else:
            pesan = (
                f"*[Kos Putra Raffasya]*\n"
                f"Halo {nama}, pengajuan perpanjangan jatuh tempo *Kamar {kamar}* ({tagihan.periode}) *BELUM DAPAT DISETUJUI*. Jatuh tempo tetap *{tagihan.jatuh_tempo}*."
            )
            kirim_wa_async("penghuni", p.no_kontak, "dispensasi_ditolak", pesan)


def wa_keluhan_baru(keluhan):
    no_pengurus = getattr(settings, "WA_PENGURUS", "")
    if not no_pengurus:
        return
    nama = keluhan.penghuni.user.first_name or keluhan.penghuni.user.username
    kamar = keluhan.penghuni.kamar.nomor_kamar if keluhan.penghuni.kamar else "-"
    kat = keluhan.kategori.nama if keluhan.kategori else "Umum"
    pesan = (
        f"*[Kos Putra Raffasya]*\n"
        f"Keluhan baru masuk:\n"
        f"• Kamar: {kamar} ({nama})\n"
        f"• Kategori: {kat}\n"
        f"• Kendala: {keluhan.deskripsi}"
    )
    kirim_wa_async("pengurus", no_pengurus, "keluhan_baru", pesan)


def wa_keluhan_update_pengurus(keluhan, status_sebelumnya: str, eskalasi_sebelumnya: bool):
    nama = keluhan.penghuni.user.first_name or keluhan.penghuni.user.username
    kamar = keluhan.penghuni.kamar.nomor_kamar if keluhan.penghuni.kamar else "-"
    kat = keluhan.kategori.nama if keluhan.kategori else "Umum"

    # 1. Notifikasi ke penghuni jika status berubah ke diproses atau selesai
    if keluhan.status != status_sebelumnya and keluhan.status in ["diproses", "selesai"]:
        label = "SEDANG DIPROSES" if keluhan.status == "diproses" else "SELESAI DITANGANI"
        catatan = f"\nCatatan pengurus: {keluhan.catatan_tindak_lanjut}" if keluhan.catatan_tindak_lanjut else ""
        pesan_penghuni = (
            f"*[Kos Putra Raffasya]*\n"
            f"Halo {nama}, laporan keluhan *{kat}* (Kamar {kamar}) saat ini berstatus *{label}*.{catatan}"
        )
        kirim_wa_async("penghuni", keluhan.penghuni.no_kontak, f"keluhan_{keluhan.status}", pesan_penghuni)

    # 2. Notifikasi ke pemilik jika baru diteruskan ke pemilik
    no_pemilik = getattr(settings, "WA_PEMILIK", "")
    if no_pemilik and keluhan.dieskalasi_pemilik and not eskalasi_sebelumnya and keluhan.status != "selesai":
        ajuan_txt = f"• Pengajuan Dana: *{_rp(keluhan.nominal_pengajuan)}*\n" if float(keluhan.nominal_pengajuan or 0) > 0 else "• Pengajuan Dana: Tidak mengajukan dana\n"
        cat_ajuan = f"• Rincian: {keluhan.catatan_pengajuan}\n" if keluhan.catatan_pengajuan else ""
        pesan_pemilik = (
            f"*[Kos Putra Raffasya]*\n"
            f"Pengurus meneruskan laporan kerusakan fasilitas:\n"
            f"• Kamar: {kamar} ({nama})\n"
            f"• Kategori: {kat}\n"
            f"• Deskripsi: {keluhan.deskripsi}\n"
            f"{ajuan_txt}{cat_ajuan}"
            f"Silakan tinjau & beri feedback di panel pemilik."
        )
        kirim_wa_async("pemilik", no_pemilik, "eskalasi_keluhan_pemilik", pesan_pemilik)


def wa_keluhan_respon_pemilik(keluhan):
    no_pengurus = getattr(settings, "WA_PENGURUS", "")
    if not no_pengurus:
        return
    kamar = keluhan.penghuni.kamar.nomor_kamar if keluhan.penghuni.kamar else "-"
    kat = keluhan.kategori.nama if keluhan.kategori else "Umum"
    cair = float(keluhan.nominal_pencairan or 0)
    status_label = {
        "dicairkan": f"DISETUJUI & DICAIRKAN ({_rp(cair)})" if cair > 0 else "DISETUJUI PEMILIK",
        "dicairkan_sebagian": f"DICAIRKAN SEBAGIAN ({_rp(cair)})",
        "ditolak": "DITOLAK / DITUNDA PEMILIK",
    }.get(keluhan.status_pemilik, keluhan.status_pemilik)
    catatan = f"\nCatatan pemilik: {keluhan.catatan_pemilik}" if keluhan.catatan_pemilik else ""
    pesan = (
        f"*[Kos Putra Raffasya]*\n"
        f"Respon pemilik untuk keluhan *Kamar {kamar}* ({kat}):\n"
        f"• Keputusan: *{status_label}*{catatan}"
    )
    kirim_wa_async("pengurus", no_pengurus, "respon_keluhan_pemilik", pesan)
