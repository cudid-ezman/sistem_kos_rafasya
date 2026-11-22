import type { BuktiPembayaran, Keluhan, Tagihan } from "../types/kos";
import {
  hitungDenda,
  rupiah,
  sudahTerbitH7,
  tglAngka,
} from "./format";

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

/**
 * Notifikasi dihitung dari data tagihan, bukti pembayaran, dan keluhan milik penghuni.
 * (Belum ada endpoint notifikasi di backend; model Notifikasi bisa dipakai nanti.)
 */
export function buatNotifikasi(
  tagihan: Tagihan[],
  bukti: BuktiPembayaran[],
  keluhan: Keluhan[],
): Notifikasi[] {
  const out: Notifikasi[] = [];

  // Pembayaran ditolak (bukti terbaru per tagihan)
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
          `Bukti pembayaran ${t.periode} tidak sesuai. Unggah ulang bukti.`,
        time: tglAngka(b.tanggal_verifikasi),
        to: `/dashboard/tagihan-saya/${t.id}/upload`,
        linkLabel: "Upload Bukti Pembayaran",
      });
    }
  }

  // Denda berjalan
  for (const t of tagihan) {
    const { hari, denda } = hitungDenda(t);
    if (denda > 0 && t.status !== "menunggu_verifikasi") {
      out.push({
        id: `denda-${t.id}`,
        tone: "warning",
        title: "Denda berjalan",
        text: `Tagihan ${t.periode} terlambat ${hari} hari. Denda ${rupiah(denda)}.`,
        time: tglAngka(t.jatuh_tempo),
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    }
  }

  // Keluhan diproses / selesai
  for (const k of keluhan) {
    if (k.status === "diproses" || k.status === "selesai") {
      out.push({
        id: `keluhan-${k.id}-${k.status}`,
        tone: k.status === "selesai" ? "success" : "violet",
        title: k.status === "selesai" ? "Keluhan selesai" : "Keluhan diproses",
        text: `Keluhan ${k.nama_kategori ?? ""}${k.nomor_kamar ? ` kamar ${k.nomor_kamar}` : ""} ${
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

  // Pengingat jatuh tempo (mulai H-7 sebelum jatuh tempo, belum terlambat)
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
        text: `Tagihan ${t.periode} jatuh tempo ${tglAngka(t.jatuh_tempo)}.`,
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: "Lihat Rincian Tagihan",
      });
    }
  }

  // Pembayaran terakhir yang disetujui
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
      text: `Bukti pembayaran ${lunas.periode} telah diverifikasi dan lunas.`,
      time: tglAngka(bk?.tanggal_verifikasi),
      to: `/dashboard/tagihan-saya/${lunas.id}`,
      linkLabel: `Rincian Tagihan (${lunas.periode})`,
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
      text: `${b.nama_penghuni ?? "Penghuni"}${b.nomor_kamar ? ` (Kamar ${b.nomor_kamar})` : ""} mengunggah bukti pembayaran ${b.periode_tagihan ?? ""}.`.replace(
        /\s+/g,
        " ",
      ),
      time: tglAngka(b.tanggal_bayar),
      to: "/dashboard/verifikasi",
      linkLabel: "Verifikasi Pembayaran",
    });
  }

  // 2. Keluhan baru masuk (status 'diterima')
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

  // 3. Tagihan menunggak / denda berjalan
  for (const t of tagihan) {
    const { hari, denda } = hitungDenda(t);
    if (denda > 0 && t.status !== "menunggu_verifikasi") {
      out.push({
        id: `pengurus-telat-${t.id}`,
        tone: "danger",
        title: "Tagihan melewati jatuh tempo",
        text: `Kamar ${t.nomor_kamar ?? "-"} (${t.nama_penghuni ?? "Penghuni"}) terlambat ${hari} hari untuk periode ${t.periode}.`,
        time: tglAngka(t.jatuh_tempo),
        to: "/dashboard/tagihan",
        linkLabel: "Lihat Data Tagihan",
      });
    }
  }

  return out;
}

/**
 * Notifikasi ringkasan finansial & operasional untuk Pemilik:
 * - Pembayaran lunas terbaru masuk ke kas
 * - Ringkasan tagihan menunggak / jatuh tempo
 * - Keluhan aktif yang belum selesai
 */
export function buatNotifikasiPemilik(
  tagihan: Tagihan[],
  bukti: BuktiPembayaran[],
  keluhan: Keluhan[],
): Notifikasi[] {
  const out: Notifikasi[] = [];

  // 1. Pemasukan lunas terbaru (maksimal 5 terakhir)
  const lunasTerbaru = tagihan
    .filter((t) => t.status === "lunas")
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  for (const t of lunasTerbaru) {
    const bk = bukti.find((b) => b.tagihan === t.id && b.status === "diterima");
    out.push({
      id: `pemilik-lunas-${t.id}`,
      tone: "success",
      title: "Pemasukan sewa terverifikasi",
      text: `Kamar ${t.nomor_kamar ?? "-"} (${t.periode}) lunas sebesar ${rupiah(t.nominal)}.`,
      time: tglAngka(bk?.tanggal_verifikasi),
      to: "/dashboard/laporan",
      linkLabel: "Buka Laporan Keuangan",
    });
  }

  // 2. Ringkasan tunggakan aktif
  const menunggak = tagihan.filter((t) =>
    ["belum_dibayar", "terlambat", "ditolak"].includes(t.status),
  );
  if (menunggak.length > 0) {
    const totalTunggakan = menunggak.reduce((acc, t) => acc + t.nominal, 0);
    out.push({
      id: `pemilik-tunggakan-${menunggak.length}-${totalTunggakan}`,
      tone: "warning",
      title: `${menunggak.length} tagihan belum lunas`,
      text: `Total piutang sewa berjalan sebesar ${rupiah(totalTunggakan)}.`,
      to: "/dashboard/laporan",
      linkLabel: "Cek Ringkasan Keuangan",
    });
  }

  // 3. Keluhan fasilitas yang masih aktif
  const keluhanAktif = keluhan.filter((k) => k.status !== "selesai");
  if (keluhanAktif.length > 0) {
    out.push({
      id: `pemilik-keluhan-${keluhanAktif.length}`,
      tone: "info",
      title: `${keluhanAktif.length} keluhan dalam penanganan`,
      text: "Terdapat laporan fasilitas kamar yang sedang ditangani pengurus.",
      to: "/dashboard",
      linkLabel: "Lihat Ringkasan Beranda",
    });
  }

  return out;
}
