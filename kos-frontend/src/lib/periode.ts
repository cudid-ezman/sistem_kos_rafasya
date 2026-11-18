import type { TransaksiLaporan } from '../types/kos';
import { BULAN, BULAN_PENDEK, parseTanggal } from './format';

export type ModePeriode = 'semua' | 'minggu' | 'bulan' | 'tahun';
export const MODE_VALID: ModePeriode[] = ['semua', 'minggu', 'bulan', 'tahun'];

export interface Rentang {
  mulai: Date;
  akhir: Date; // inklusif (hari terakhir)
}

export interface BatangGrafik {
  label: string;
  sub: string;
  nilai: number;
}

export const awalHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const tambahHari = (d: Date, n: number) => {
  const x = awalHari(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Minggu dihitung Senin–Minggu. */
export const awalMinggu = (d: Date) => tambahHari(d, -((d.getDay() + 6) % 7));

export function rentang(mode: ModePeriode, anchor: Date): Rentang | null {
  if (mode === 'semua') return null;
  if (mode === 'minggu') {
    const m = awalMinggu(anchor);
    return { mulai: m, akhir: tambahHari(m, 6) };
  }
  if (mode === 'bulan') {
    return {
      mulai: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      akhir: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0),
    };
  }
  return { mulai: new Date(anchor.getFullYear(), 0, 1), akhir: new Date(anchor.getFullYear(), 11, 31) };
}

export function labelPeriode(mode: ModePeriode, anchor: Date): string {
  const r = rentang(mode, anchor);
  if (!r) return 'Semua waktu';
  if (mode === 'tahun') return String(r.mulai.getFullYear());
  if (mode === 'bulan') return `${BULAN[r.mulai.getMonth()]} ${r.mulai.getFullYear()}`;
  const a = r.mulai;
  const b = r.akhir;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${BULAN_PENDEK[a.getMonth()]} ${a.getFullYear()}`;
  }
  const tahunA = a.getFullYear() === b.getFullYear() ? '' : ` ${a.getFullYear()}`;
  return `${a.getDate()} ${BULAN_PENDEK[a.getMonth()]}${tahunA} – ${b.getDate()} ${BULAN_PENDEK[b.getMonth()]} ${b.getFullYear()}`;
}

export const namaSekarang: Record<ModePeriode, string> = {
  semua: 'sekarang',
  minggu: 'minggu ini',
  bulan: 'bulan ini',
  tahun: 'tahun ini',
};

export function geser(mode: ModePeriode, anchor: Date, arah: -1 | 1): Date {
  if (mode === 'minggu') return tambahHari(anchor, 7 * arah);
  if (mode === 'bulan') return new Date(anchor.getFullYear(), anchor.getMonth() + arah, 1);
  if (mode === 'tahun') return new Date(anchor.getFullYear() + arah, 0, 1);
  return anchor;
}

/** Apakah periode terpilih memuat hari ini (berarti tidak bisa maju lagi). */
export function periodeMemuatHariIni(mode: ModePeriode, anchor: Date): boolean {
  const r = rentang(mode, anchor);
  if (!r) return true;
  const h = awalHari(new Date());
  return h >= r.mulai && h <= r.akhir;
}

/** Tanggal uang masuk: tanggal bayar → tanggal verifikasi → (perkiraan) jatuh tempo. */
export const tanggalTransaksi = (t: TransaksiLaporan) =>
  parseTanggal(t.tanggal_bayar || t.tanggal_verifikasi || t.jatuh_tempo);

export function filterPeriode(list: TransaksiLaporan[], mode: ModePeriode, anchor: Date): TransaksiLaporan[] {
  const r = rentang(mode, anchor);
  if (!r) return list;
  return list.filter((t) => {
    const d = tanggalTransaksi(t);
    return d >= r.mulai && d <= r.akhir;
  });
}

export const totalNominal = (list: TransaksiLaporan[]) => list.reduce((s, t) => s + Number(t.nominal || 0), 0);

/** Persen perubahan; null jika pembanding 0. */
export const persenPerubahan = (sekarang: number, sebelumnya: number) =>
  sebelumnya > 0 ? ((sekarang - sebelumnya) / sebelumnya) * 100 : null;

/** 1.250.000 -> "1,3 jt", 450.000 -> "450 rb" */
export function rpRingkas(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} jt`;
  if (n >= 1000) return `${Math.round(n / 1000)} rb`;
  return String(Math.round(n));
}

/** Data batang grafik sesuai mode: minggu→per hari, bulan→per 7 hari, tahun→per bulan, semua→per bulan. */
export function buatGrafik(list: TransaksiLaporan[], mode: ModePeriode, anchor: Date): BatangGrafik[] {
  const r = rentang(mode, anchor);
  const jumlah = (cocok: (d: Date) => boolean) => totalNominal(list.filter((t) => cocok(tanggalTransaksi(t))));

  if (mode === 'minggu' && r) {
    return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h, i) => {
      const tgl = tambahHari(r.mulai, i);
      return {
        label: h,
        sub: `${tgl.getDate()} ${BULAN_PENDEK[tgl.getMonth()]}`,
        nilai: jumlah((d) => awalHari(d).getTime() === tgl.getTime()),
      };
    });
  }

  if (mode === 'bulan' && r) {
    const hariBulan = r.akhir.getDate();
    const batang: BatangGrafik[] = [];
    for (let mulai = 1; mulai <= hariBulan; mulai += 7) {
      const selesai = Math.min(mulai + 6, hariBulan);
      batang.push({
        label: `${mulai}–${selesai}`,
        sub: `${mulai}–${selesai} ${BULAN[r.mulai.getMonth()]}`,
        nilai: jumlah((d) => d >= r.mulai && d <= r.akhir && d.getDate() >= mulai && d.getDate() <= selesai),
      });
    }
    return batang;
  }

  if (mode === 'tahun' && r) {
    const tahun = r.mulai.getFullYear();
    return BULAN_PENDEK.map((b, i) => ({
      label: b,
      sub: `${BULAN[i]} ${tahun}`,
      nilai: jumlah((d) => d.getFullYear() === tahun && d.getMonth() === i),
    }));
  }

  // semua waktu: per bulan, maksimal 12 bulan terakhir
  if (list.length === 0) return [];
  const waktu = list.map((t) => tanggalTransaksi(t).getTime());
  const min = new Date(Math.min(...waktu));
  const maks = new Date(Math.max(...waktu));
  const bulanBulan: Date[] = [];
  for (let c = new Date(min.getFullYear(), min.getMonth(), 1); c <= maks; c = new Date(c.getFullYear(), c.getMonth() + 1, 1)) {
    bulanBulan.push(c);
  }
  return bulanBulan.slice(-12).map((b) => ({
    label: `${BULAN_PENDEK[b.getMonth()]} ${String(b.getFullYear()).slice(2)}`,
    sub: `${BULAN[b.getMonth()]} ${b.getFullYear()}`,
    nilai: jumlah((d) => d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth()),
  }));
}
