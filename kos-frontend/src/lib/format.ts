import type { Tagihan } from '../types/kos';

/** Denda keterlambatan per hari (Rp). Sesuaikan jika aturan kos berubah. */
export const DENDA_PER_HARI = 20000;

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const rupiah = (n: number | string | null | undefined) =>
  'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

/** Parse "YYYY-MM-DD" (atau ISO datetime) sebagai tanggal lokal, tanpa geser zona waktu. */
export function parseTanggal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const dua = (n: number) => String(n).padStart(2, '0');

/** 15 Des 2026 */
export function tglPendek(iso?: string | null) {
  if (!iso) return '-';
  const d = parseTanggal(iso);
  return `${dua(d.getDate())} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

/** 16/12/2026 */
export function tglAngka(iso?: string | null) {
  if (!iso) return '-';
  const d = parseTanggal(iso);
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 16/12/2026 14:20 (dari ISO datetime) */
export function tglWaktu(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()} ${dua(d.getHours())}:${dua(d.getMinutes())}`;
}

export function hariSelisih(dari: Date, ke: Date) {
  const a = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate()).getTime();
  const b = new Date(ke.getFullYear(), ke.getMonth(), ke.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Hari terlambat & denda. Tagihan lunas tidak kena denda. */
export function hitungDenda(t: Pick<Tagihan, 'jatuh_tempo' | 'status'>) {
  if (t.status === 'lunas') return { hari: 0, denda: 0 };
  const hari = Math.max(0, hariSelisih(parseTanggal(t.jatuh_tempo), new Date()));
  return { hari, denda: hari * DENDA_PER_HARI };
}

export const totalTagihan = (t: Tagihan) => Number(t.nominal || 0) + hitungDenda(t).denda;

/** "Desember 2026" -> { mulai: "01 Des 2026", selesai: "31 Des 2026" } (null jika tidak terbaca) */
export function rentangPeriode(periode: string) {
  const m = periode.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const idx = BULAN.findIndex((b) => b.toLowerCase() === m[1].toLowerCase());
  if (idx < 0) return null;
  const tahun = Number(m[2]);
  const akhir = new Date(tahun, idx + 1, 0).getDate();
  return {
    mulai: `01 ${BULAN_PENDEK[idx]} ${tahun}`,
    selesai: `${dua(akhir)} ${BULAN_PENDEK[idx]} ${tahun}`,
  };
}

export const inisial = (nama: string) =>
  nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join('') || '?';

export const namaBerkas = (url?: string | null) => {
  if (!url) return '-';
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || '-');
  } catch {
    return url.split('/').pop() || '-';
  }
};

export const hariIniISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
};

export const BATAS_BERKAS_MB = 2;

/** Validasi gambar JPG/PNG maks 2 MB. Mengembalikan pesan error atau null. */
export function validasiGambar(file: File): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Format berkas harus JPG atau PNG.';
  if (file.size > BATAS_BERKAS_MB * 1024 * 1024) return `Ukuran berkas melebihi ${BATAS_BERKAS_MB} MB.`;
  return null;
}

export const ukuranBerkas = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
