import type { BuktiPembayaran, Keluhan, Tagihan } from "../types/kos";
import {
  hitungDenda,
  rupiah,
  sudahTerbitH7,
  tglAngka,
} from "./format";

/** Huruf awal tiap kata kapital, untuk periode seperti "desember 2026". */
const kap = (s: string) => s.replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

export type NotifTone = "danger" | "warning" | "info" | "success" | "violet";

export interface Notifikasi {
  id: string;
  tone: NotifTone;
  title: string;
  text: string;
  time?: string;
  to: string;
  linkLabel: string;
}

export function buatNotifikasi(
  tagihan: Tagihan[],
  bukti: BuktiPembayaran[],
  keluhan: Keluhan[],
): Notifikasi[] {
  const out: Notifikasi[] = [];

  // 1. Pembayaran ditolak (bukti terbaru per tagihan)
  const sudahDitolak = new Set<number>();
  for (const b of bukti) {
    const t = tagihan.find((x) => x.id === b.tagihan);
    if (
      b.status === "ditolak" &&
      t?.status === "ditolak" &&
      !sudahDitolak.has(b.tagihan)
    ) {
      sudahDitolak.add(b.tagihan);
      out.push({
        id: `tolak-${b.id}`,
        tone: "danger",
        title: "Pembayaran ditolak",
        text:
          b.catatan_penolakan ||
          `Bukti pembayaran ${kap(t.periode)} tidak sesuai. Unggah ulang bukti.`,
        time: tglAngka(b.tanggal_verifikasi),
        to: `/dashboard/tagihan-saya/${t.id}/upload`,
        linkLabel: "Upload Bukti Pembayaran",
      });
    }
  }

  // 2. Respon pengajuan perpanjangan jatuh tempo (dispensasi)
  for (const t of tagihan) {
    if (t.status !== "lunas" && t.status_perpanjangan === "disetujui" && t.tanggal_perpanjangan) {
      out.push({
        id: `dispensasi-ok-${t.id}-${t.tanggal_perpanjangan}`,
        tone: "success",
        title: "Perpanjangan jatuh tempo disetujui",
        text: `Tenggat pembayaran ${kap(t.periode)} diperpanjang hingga ${tglAngka(t.tanggal_perpanjangan)}.`,
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    } else if (t.status !== "lunas" && t.status_perpanjangan === "ditolak") {
      out.push({
        id: `dispensasi-no-${t.id}`,
        tone: "danger",
        title: "Perpanjangan jatuh tempo ditolak",
        text: `Pengajuan dispensasi untuk ${kap(t.periode)} belum dapat disetujui pengurus.`,
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    }
  }

  // 3. Denda berjalan
  for (const t of tagihan) {
    const { hari, denda } = hitungDenda(t);
    if (denda > 0 && t.status !== "menunggu_verifikasi" && t.status !== "lunas") {
      out.push({
        id: `denda-${t.id}`,
        tone: "warning",
        title: "Denda berjalan",
        text: `Tagihan ${kap(t.periode)} terlambat ${hari} hari. Denda ${rupiah(denda)}.`,
        time: tglAngka(t.jatuh_tempo),
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    }
  }

  // 4. Keluhan diproses / selesai (sertakan catatan pengurus bila ada)
  for (const k of keluhan) {
    if (k.status === "diproses" || k.status === "selesai") {
      const catatan = (k.catatan_tindak_lanjut || "").trim();
      out.push({
        id: `keluhan-${k.id}-${k.status}-${catatan.slice(0, 20)}`,
        tone: k.status === "selesai" ? "success" : "violet",
        title: k.status === "selesai" ? "Keluhan selesai" : "Keluhan diproses",
        text: catatan && k.status === "diproses"
          ? `Keluhan ${k.nama_kategori ?? ""}: ${catatan}`.replace(/\s+/g, " ")
          : `Keluhan ${k.nama_kategori ?? ""}${k.nomor_kamar ? ` kamar ${k.nomor_kamar}` : ""} ${
              k.status === "selesai"
                ? "sudah selesai ditangani."
                : "sedang ditangani pengurus."
            }`.replace(/\s+/g, " "),
        time: tglAngka(k.tanggal_kirim),
        to: `/dashboard/keluhan-saya/${k.id}`,
        linkLabel: "Detail Keluhan",
      });
    }
  }

  // 5. Pengingat jatuh tempo (mulai H-7 sebelum jatuh tempo, belum terlambat)
  for (const t of tagihan) {
    if (
      t.status === "belum_dibayar" &&
      hitungDenda(t).hari === 0 &&
      sudahTerbitH7(t, tagihan.length === 1)
    ) {
      out.push({
        id: `ingat-${t.id}`,
        tone: "info",
        title: "Pengingat jatuh tempo",
        text: `Tagihan ${kap(t.periode)} jatuh tempo ${tglAngka(t.jatuh_tempo)}.`,
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    }
  }

  // 6. Pembayaran terakhir yang disetujui
  const lunas = tagihan
    .filter((t) => t.status === "lunas")
    .sort((a, b) => b.id - a.id)[0];
  if (lunas) {
    const bk = bukti.find(
      (b) => b.tagihan === lunas.id && b.status === "diterima",
    );
    out.push({
      id: `lunas-${lunas.id}`,
      tone: "success",
      title: "Pembayaran disetujui",
      text: `Bukti pembayaran ${kap(lunas.periode)} telah diverifikasi dan lunas.`,
      time: tglAngka(bk?.tanggal_verifikasi),
      to: `/dashboard/tagihan-saya/${lunas.id}`,
      linkLabel: `Rincian Tagihan (${kap(lunas.periode)})`,
    });
  }

  return out;
}

export function buatNotifikasiPengurus(
  tagihan: Tagihan[],
  bukti: BuktiPembayaran[],
  keluhan: Keluhan[],
): Notifikasi[] {
  const out: Notifikasi[] = [];

  // 1. Pembayaran baru menunggu verifikasi
  const menunggu = bukti
    .filter((b) => b.status === "menunggu_verifikasi")
    .sort((a, b) => b.id - a.id);

  for (const b of menunggu) {
    out.push({
      id: `pengurus-verif-${b.id}`,
      tone: "warning",
      title: "Bukti pembayaran baru",
      text: `${b.nama_penghuni ?? "Penghuni"}${b.nomor_kamar ? ` (Kamar ${b.nomor_kamar})` : ""} mengunggah bukti pembayaran ${kap(b.periode_tagihan ?? "")}.`.replace(
        /\s+/g,
        " ",
      ),
      time: tglAngka(b.tanggal_bayar),
      to: "/dashboard/verifikasi",
      linkLabel: "Verifikasi Pembayaran",
    });
  }

  // 2. Pengajuan perpanjangan jatuh tempo (dispensasi) menunggu respon pengurus
  const dispensasiMenunggu = tagihan.filter(
    (t) => t.status !== "lunas" && t.status_perpanjangan === "menunggu",
  );
  for (const t of dispensasiMenunggu) {
    out.push({
      id: `pengurus-dispensasi-${t.id}`,
      tone: "info",
      title: "Pengajuan perpanjangan jatuh tempo",
      text: `${t.nama_penghuni ?? "Penghuni"} (Kamar ${t.nomor_kamar ?? "-"}) mengajukan dispensasi periode ${kap(t.periode)}${t.tanggal_perpanjangan ? ` s/d ${tglAngka(t.tanggal_perpanjangan)}` : ""}.`,
      to: "/dashboard/tagihan",
      linkLabel: "Tinjau Pengajuan",
    });
  }

  // 3. Feedback / Pencairan dana keluhan dari Pemilik
  const responPemilik = keluhan
    .filter(
      (k) =>
        k.dieskalasi_pemilik &&
        k.status !== "selesai" &&
        k.status_pemilik &&
        k.status_pemilik !== "tidak_diajukan" &&
        k.status_pemilik !== "menunggu",
    )
    .sort((a, b) => b.id - a.id);

  for (const k of responPemilik) {
    const cair = Number(k.nominal_pencairan || 0);
    const ditolak = k.status_pemilik === "ditolak";
    out.push({
      id: `pengurus-respon-pemilik-${k.id}-${k.status_pemilik}-${cair}`,
      tone: ditolak ? "danger" : "success",
      title: ditolak
        ? "Pengajuan keluhan ditolak Pemilik"
        : cair > 0
          ? `Dana keluhan dicairkan (${rupiah(cair)})`
          : "Keluhan disetujui Pemilik",
      text: `Kamar ${k.nomor_kamar ?? "-"} (${k.nama_kategori ?? "Keluhan"})${k.catatan_pemilik ? `: ${k.catatan_pemilik}` : "."}`,
      time: k.tanggal_pencairan ? tglAngka(k.tanggal_pencairan) : undefined,
      to: "/dashboard/keluhan",
      linkLabel: "Lihat Keluhan",
    });
  }

  // 4. Keluhan baru masuk (status 'diterima')
  const keluhanBaru = keluhan
    .filter((k) => k.status === "diterima")
    .sort((a, b) => b.id - a.id);

  for (const k of keluhanBaru) {
    out.push({
      id: `pengurus-keluhan-baru-${k.id}`,
      tone: "violet",
      title: "Keluhan baru dari penghuni",
      text: `${k.nama_penghuni ?? "Penghuni"}${k.nomor_kamar ? ` (Kamar ${k.nomor_kamar})` : ""} melaporkan kendala ${k.nama_kategori ?? "fasilitas"}.`,
      time: tglAngka(k.tanggal_kirim),
      to: "/dashboard/keluhan",
      linkLabel: "Tindak Lanjuti Keluhan",
    });
  }

  // 5. Tagihan menunggak / denda berjalan
  for (const t of tagihan) {
    const { hari, denda } = hitungDenda(t);
    if (denda > 0 && t.status !== "menunggu_verifikasi" && t.status !== "lunas") {
      out.push({
        id: `pengurus-telat-${t.id}`,
        tone: "danger",
        title: "Tagihan melewati jatuh tempo",
        text: `Kamar ${t.nomor_kamar ?? "-"} (${t.nama_penghuni ?? "Penghuni"}) terlambat ${hari} hari untuk periode ${kap(t.periode)}.`,
        time: tglAngka(t.jatuh_tempo),
        to: "/dashboard/tagihan",
        linkLabel: "Lihat Data Tagihan",
      });
    }
  }

  return out;
}

export function buatNotifikasiPemilik(
  tagihan: Tagihan[],
  bukti: BuktiPembayaran[],
  keluhan: Keluhan[],
): Notifikasi[] {
  const out: Notifikasi[] = [];

  // 1. Keluhan eskalasi dari pengurus yang menunggu respon / pencairan dana pemilik
  const eskalasiMenunggu = keluhan
    .filter((k) => k.dieskalasi_pemilik && k.status_pemilik === "menunggu")
    .sort((a, b) => b.id - a.id);

  for (const k of eskalasiMenunggu) {
    const ajuan = Number(k.nominal_pengajuan || 0);
    out.push({
      id: `pemilik-eskalasi-${k.id}-${ajuan}`,
      tone: "violet",
      title:
        ajuan > 0
          ? `Pengajuan dana perbaikan (${rupiah(ajuan)})`
          : "Keluhan kerusakan diteruskan pengurus",
      text: `Kamar ${k.nomor_kamar ?? "-"} • ${k.nama_kategori ?? "Fasilitas"}: ${k.deskripsi}`,
      time: tglAngka(k.tanggal_kirim),
      to: "/dashboard/keluhan-pemilik",
      linkLabel: "Tinjau & Beri Feedback",
    });
  }

  // 2. Pemasukan lunas terbaru (maksimal 5 terakhir, sudah termasuk denda)
  const lunasTerbaru = tagihan
    .filter((t) => t.status === "lunas")
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  for (const t of lunasTerbaru) {
    const bk = bukti.find((b) => b.tagihan === t.id && b.status === "diterima");
    const totalMasuk = Number(t.nominal || 0) + Number(t.denda || 0);
    out.push({
      id: `pemilik-lunas-${t.id}-${totalMasuk}`,
      tone: "success",
      title: "Pemasukan sewa terverifikasi",
      text: `Kamar ${t.nomor_kamar ?? "-"} (${kap(t.periode)}) lunas sebesar ${rupiah(totalMasuk)}.`,
      time: tglAngka(bk?.tanggal_verifikasi),
      to: "/dashboard/laporan",
      linkLabel: "Buka Laporan Keuangan",
    });
  }

  // 3. Ringkasan tunggakan aktif (termasuk denda berjalan)
  const menunggak = tagihan.filter((t) =>
    ["belum_dibayar", "terlambat", "ditolak"].includes(t.status),
  );
  if (menunggak.length > 0) {
    const totalTunggakan = menunggak.reduce(
      (acc, t) => acc + Number(t.nominal || 0) + hitungDenda(t).denda,
      0,
    );
    out.push({
      id: `pemilik-tunggakan-${menunggak.length}-${totalTunggakan}`,
      tone: "warning",
      title: `${menunggak.length} tagihan belum lunas`,
      text: `Total piutang sewa berjalan sebesar ${rupiah(totalTunggakan)}.`,
      to: "/dashboard/laporan",
      linkLabel: "Cek Ringkasan Keuangan",
    });
  }

  return out;
}
