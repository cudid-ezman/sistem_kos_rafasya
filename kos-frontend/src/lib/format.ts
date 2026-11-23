import type { Tagihan } from '../types/kos';

/** Denda keterlambatan per hari (Rp). Sesuaikan jika aturan kos berubah. */
export const DENDA_PER_HARI = 10000;

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

/** Hari terlambat & denda. Jika dispensasi disetujui, patokan bergeser ke tanggal_perpanjangan. */
export function hitungDenda(
  t: Pick<Tagihan, 'jatuh_tempo' | 'status' | 'tanggal_perpanjangan' | 'status_perpanjangan' | 'denda' | 'hari_terlambat'>,
) {
  if (t.status === 'lunas' || t.status === 'menunggu_verifikasi') {
    const dendaTersimpan = Number(t.denda || 0);
    const hariTersimpan = Number(t.hari_terlambat || (dendaTersimpan > 0 ? Math.round(dendaTersimpan / DENDA_PER_HARI) : 0));
    return { hari: hariTersimpan, denda: dendaTersimpan };
  }
  const patokan =
    t.status_perpanjangan === 'disetujui' && t.tanggal_perpanjangan
      ? t.tanggal_perpanjangan
      : t.jatuh_tempo;
  const hari = Math.max(0, hariSelisih(parseTanggal(patokan), new Date()));
  const dendaHitung = hari * DENDA_PER_HARI;
  const dendaTersimpan = Number(t.denda || 0);
  if (dendaTersimpan > dendaHitung) {
    return { hari: Number(t.hari_terlambat || Math.round(dendaTersimpan / DENDA_PER_HARI)), denda: dendaTersimpan };
  }
  return { hari, denda: dendaHitung };
}

export const totalTagihan = (t: Tagihan) => Number(t.nominal || 0) + hitungDenda(t).denda;

/** Siklus sewa 1 bulan penuh mengikuti tanggal jatuh tempo (mis. 20 Nov 2026 - 20 Des 2026) */
export function rentangPeriode(periode: string, jatuhTempo?: string) {
  if (jatuhTempo) {
    const awal = parseTanggal(jatuhTempo);
    if (!Number.isNaN(awal.getTime())) {
      const tahunBerikut = awal.getMonth() === 11 ? awal.getFullYear() + 1 : awal.getFullYear();
      const bulanBerikut = (awal.getMonth() + 1) % 12;
      const hariMaks = new Date(tahunBerikut, bulanBerikut + 1, 0).getDate();
      const selesai = new Date(tahunBerikut, bulanBerikut, Math.min(awal.getDate(), hariMaks));
      return {
        mulai: `${dua(awal.getDate())} ${BULAN_PENDEK[awal.getMonth()]} ${awal.getFullYear()}`,
        selesai: `${dua(selesai.getDate())} ${BULAN_PENDEK[selesai.getMonth()]} ${selesai.getFullYear()}`,
      };
    }
  }
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

/** Tanggal mulai tagihan muncul aktif ke penghuni (H-7 sebelum jatuh tempo). */
export function tanggalTerbitH7(jatuhTempo: string): string {
  const d = parseTanggal(jatuhTempo);
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/** True jika tagihan sudah masuk jendela H-7 (atau bukan belum_dibayar). */
export function sudahTerbitH7(
  t: Pick<Tagihan, 'jatuh_tempo' | 'status'>,
  isTagihanPertama = false,
): boolean {
  if (t.status !== 'belum_dibayar') return true;
  if (isTagihanPertama) return true;
  return hariIniISO() >= tanggalTerbitH7(t.jatuh_tempo);
}

/** Status tampilan untuk admin: belum dibayar yang sudah lewat jatuh tempo dianggap "terlambat". */
export function statusTampil(
  t: Pick<Tagihan, 'jatuh_tempo' | 'status' | 'tanggal_perpanjangan' | 'status_perpanjangan'>,
): Tagihan['status'] {
  if (t.status === 'belum_dibayar' && hitungDenda(t).hari > 0) return 'terlambat';
  return t.status;
}

/** Nama periode bulan ini, mis. "November 2026". */
export function periodeSekarang() {
  const d = new Date();
  return `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "A12" / "A-01" -> { blok: "A", nomor: 12 } ; selain itu blok null. */
export function pecahKamar(nomorKamar: string) {
  const m = nomorKamar.trim().match(/^([A-Za-z]+)[\s-]*(\d+)$/);
  if (!m) return { blok: null as string | null, nomor: 0 };
  return { blok: m[1].toUpperCase(), nomor: Number(m[2]) };
}

/** Date -> "YYYY-MM-DD" (waktu lokal). */
export function keISO(d: Date) {
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
