import type { BuktiPembayaran, Keluhan, Tagihan } from '../types/kos';
import { hariSelisih, hitungDenda, parseTanggal, rupiah, tglAngka } from './format';

export type NotifTone = 'danger' | 'warning' | 'info' | 'success' | 'violet';

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
export function buatNotifikasi(tagihan: Tagihan[], bukti: BuktiPembayaran[], keluhan: Keluhan[]): Notifikasi[] {
  const out: Notifikasi[] = [];

  // Pembayaran ditolak (bukti terbaru per tagihan)
  const sudahDitolak = new Set<number>();
  for (const b of bukti) {
    const t = tagihan.find((x) => x.id === b.tagihan);
    if (b.status === 'ditolak' && t?.status === 'ditolak' && !sudahDitolak.has(b.tagihan)) {
      sudahDitolak.add(b.tagihan);
      out.push({
        id: `tolak-${b.id}`,
        tone: 'danger',
        title: 'Pembayaran ditolak',
        text: b.catatan_penolakan || `Bukti pembayaran ${t.periode} tidak sesuai. Unggah ulang bukti.`,
        time: tglAngka(b.tanggal_verifikasi),
        to: `/dashboard/tagihan-saya/${t.id}/upload`,
        linkLabel: 'Upload Bukti Pembayaran',
      });
    }
  }

  // Denda berjalan
  for (const t of tagihan) {
    const { hari, denda } = hitungDenda(t);
    if (denda > 0 && t.status !== 'menunggu_verifikasi') {
      out.push({
        id: `denda-${t.id}`,
        tone: 'warning',
        title: 'Denda berjalan',
        text: `Tagihan ${t.periode} terlambat ${hari} hari. Denda ${rupiah(denda)}.`,
        time: tglAngka(t.jatuh_tempo),
        to: `/dashboard/tagihan-saya/${t.id}`,
        linkLabel: 'Lihat Rincian Tagihan',
      });
    }
  }

  // Keluhan diproses / selesai
  for (const k of keluhan) {
    if (k.status === 'diproses' || k.status === 'selesai') {
      out.push({
        id: `keluhan-${k.id}-${k.status}`,
        tone: k.status === 'selesai' ? 'success' : 'violet',
        title: k.status === 'selesai' ? 'Keluhan selesai' : 'Keluhan diproses',
        text: `Keluhan ${k.nama_kategori ?? ''}${k.nomor_kamar ? ` kamar ${k.nomor_kamar}` : ''} ${
          k.status === 'selesai' ? 'sudah selesai ditangani.' : 'sedang ditangani pengurus.'
        }`.replace(/\s+/g, ' '),
        time: tglAngka(k.tanggal_kirim),
        to: `/dashboard/keluhan-saya/${k.id}`,
        linkLabel: 'Detail Keluhan',
      });
    }
  }

  // Pengingat jatuh tempo (0-7 hari lagi)
  for (const t of tagihan) {
    if (t.status === 'belum_dibayar') {
      const sisa = hariSelisih(new Date(), parseTanggal(t.jatuh_tempo));
      if (sisa >= 0 && sisa <= 7) {
        out.push({
          id: `ingat-${t.id}`,
          tone: 'info',
          title: 'Pengingat jatuh tempo',
          text: `Tagihan ${t.periode} jatuh tempo ${tglAngka(t.jatuh_tempo)}.`,
          to: `/dashboard/tagihan-saya/${t.id}`,
          linkLabel: 'Lihat Rincian Tagihan',
        });
      }
    }
  }

  // Pembayaran terakhir yang disetujui
  const lunas = tagihan.filter((t) => t.status === 'lunas').sort((a, b) => b.id - a.id)[0];
  if (lunas) {
    const bk = bukti.find((b) => b.tagihan === lunas.id && b.status === 'diterima');
    out.push({
      id: `lunas-${lunas.id}`,
      tone: 'success',
      title: 'Pembayaran disetujui',
      text: `Bukti pembayaran ${lunas.periode} telah diverifikasi dan lunas.`,
      time: tglAngka(bk?.tanggal_verifikasi),
      to: `/dashboard/tagihan-saya/${lunas.id}`,
      linkLabel: `Rincian Tagihan (${lunas.periode})`,
    });
  }

  return out;
}
