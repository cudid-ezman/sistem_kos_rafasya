import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { kamarService } from '../../services/kamarService';
import { tagihanService } from '../../services/tagihanService';
import { keluhanService } from '../../services/keluhanService';
import type { Kamar, Keluhan, Penghuni, Tagihan } from '../../types/kos';
import { DENDA_PER_HARI, hitungDenda, inisial, pecahKamar, rupiah, statusTampil, tglAngka } from '../../lib/format';
import { Skeleton } from '../../components/portal/Skeleton';
import { btnPrimary } from '../../components/portal/buttons';
import { CalendarIcon, DoorIcon, EyeIcon, InfoCircleIcon, PlusIcon, WarningIcon } from '../../components/portal/icons';

type StatusDenah = 'kosong' | 'lunas' | 'menunggu' | 'belum' | 'terlambat' | 'tanpa_tagihan';
type Rata = 'atas' | 'bawah';

interface KamarDenah {
  kamar: Kamar;
  blok: string;
  nomor: number;
  status: StatusDenah;
  penghuni: Penghuni[];
  tagihan: Tagihan[]; // tagihan pada periode terpilih
  keluhanAktif: Keluhan[];
}

/* ───────────── Konfigurasi denah (sesuai desain) ───────────── */

/** Jumlah slot per blok & perataan. Blok A-C rata bawah (nomor 01 di dasar), D rata atas. */
const KONFIG_BLOK: { blok: string; jumlah: number; rata: Rata }[] = [
  { blok: 'A', jumlah: 13, rata: 'bawah' },
  { blok: 'B', jumlah: 14, rata: 'bawah' },
  { blok: 'C', jumlah: 14, rata: 'bawah' },
  { blok: 'D', jumlah: 4, rata: 'atas' },
];

type Elemen =
  | { tipe: 'grup'; bloks: string[]; catatan?: string }
  | { tipe: 'lorong'; nama: 'KIRI' | 'KANAN'; atas: '↑' | '↓'; pintu?: boolean };

/** Urutan elemen dari kiri ke kanan. */
const SUSUNAN: Elemen[] = [
  { tipe: 'grup', bloks: ['A'] },
  { tipe: 'lorong', nama: 'KIRI', atas: '↑', pintu: true },
  { tipe: 'grup', bloks: ['B', 'C'], catatan: 'B dan C berdempetan' },
  { tipe: 'lorong', nama: 'KANAN', atas: '↓' },
  { tipe: 'grup', bloks: ['D'] },
];

const TINGGI_SEL = 44;
const JARAK_SEL = 4;
const LEBAR_SEL = 84;
const TINGGI_CATATAN = 28;
const TINGGI_HEADER = 30;
const JARAK_HEADER = 12;

/* ───────────── Gaya status ───────────── */

const CELL: Record<StatusDenah, { label: string; box: string; teks: string; dot: string }> = {
  lunas: { label: 'Lunas', box: 'border-emerald-300 bg-emerald-50', teks: 'text-emerald-600', dot: 'bg-emerald-500' },
  menunggu: { label: 'Menunggu', box: 'border-blue-200 bg-blue-50', teks: 'text-blue-600', dot: 'bg-blue-500' },
  belum: { label: 'Belum Bayar', box: 'border-amber-300 bg-amber-50', teks: 'text-amber-600', dot: 'bg-amber-500' },
  terlambat: { label: 'Terlambat', box: 'border-orange-300 bg-orange-50', teks: 'text-orange-600', dot: 'bg-orange-500' },
  tanpa_tagihan: { label: 'Tanpa Tagihan', box: 'border-slate-300 bg-white', teks: 'text-slate-500', dot: 'bg-slate-400' },
  kosong: { label: 'Kosong', box: 'border-dashed border-slate-300 bg-slate-100/70', teks: 'text-slate-400', dot: 'bg-slate-400' },
};

const LEGENDA: { key: StatusDenah; label: string }[] = [
  { key: 'lunas', label: 'Lunas' },
  { key: 'menunggu', label: 'Menunggu Verifikasi' },
  { key: 'belum', label: 'Belum Dibayar' },
  { key: 'terlambat', label: 'Terlambat' },
  { key: 'kosong', label: 'Kosong' },
];

const PERINGKAT: Record<StatusDenah, number> = { terlambat: 5, belum: 4, menunggu: 3, lunas: 2, tanpa_tagihan: 1, kosong: 0 };

type Nada = 'green' | 'blue' | 'amber' | 'orange' | 'gray' | 'violet';
const NADA: Record<Nada, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
};
const NADA_STATUS: Record<StatusDenah, { nada: Nada; label: string }> = {
  lunas: { nada: 'green', label: 'Lunas' },
  menunggu: { nada: 'blue', label: 'Menunggu' },
  belum: { nada: 'amber', label: 'Belum Bayar' },
  terlambat: { nada: 'orange', label: 'Terlambat' },
  tanpa_tagihan: { nada: 'gray', label: 'Belum Ada Tagihan' },
  kosong: { nada: 'gray', label: 'Kosong' },
};

function Pill({ nada, children }: { nada: Nada; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${NADA[nada]}`}>{children}</span>;
}

function statusDariTagihan(t: Tagihan): StatusDenah {
  const s = statusTampil(t);
  if (s === 'lunas') return 'lunas';
  if (s === 'menunggu_verifikasi') return 'menunggu';
  if (s === 'terlambat') return 'terlambat';
  return 'belum';
}

const RUMAH_ISI: Record<StatusDenah, string> = {
  lunas: 'fill-emerald-50',
  menunggu: 'fill-blue-50',
  belum: 'fill-amber-50',
  terlambat: 'fill-orange-50',
  tanpa_tagihan: 'fill-white',
  kosong: 'fill-slate-100',
};
const RUMAH_GARIS: Record<StatusDenah, string> = {
  lunas: 'stroke-emerald-400',
  menunggu: 'stroke-blue-300',
  belum: 'stroke-amber-400',
  terlambat: 'stroke-orange-400',
  tanpa_tagihan: 'stroke-slate-300',
  kosong: 'stroke-slate-300',
};

/** Siluet rumah (atap segitiga + badan) sebagai pengganti kotak kamar. */
function RumahShape({ tone, dashed = false, tebal = false }: { tone: string; dashed?: boolean; tebal?: boolean }) {
  return (
    <svg
      viewBox="0 0 84 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${tone}`}
    >
      <path
        d="M3 18 42 3l39 15v23H3Z"
        strokeWidth={tebal ? 2.5 : 1.5}
        strokeLinejoin="round"
        strokeDasharray={dashed ? '3 3' : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ───────────── Komponen ───────────── */

export default function DenahKamar() {
  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [penghuni, setPenghuni] = useState<Penghuni[]>([]);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [keluhan, setKeluhan] = useState<Keluhan[]>([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState(false);
  const [terpilih, setTerpilih] = useState<number | null>(null);
  const [filter, setFilter] = useState<StatusDenah | null>(null);
  const [periodePilihan, setPeriodePilihan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    Promise.all([kamarService.getAllKamar(), kamarService.getAllPenghuni(), tagihanService.getAll(), keluhanService.getAll()])
      .then(([k, p, t, kl]) => {
        if (batal) return;
        setKamar(k.data);
        setPenghuni(p.data);
        setTagihan(t.data);
        setKeluhan(kl.data);
      })
      .catch(() => !batal && setGalat(true))
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
  }, []);

  // Daftar periode (terbaru dulu)
  const daftarPeriode = useMemo(() => {
    const terakhir = new Map<string, string>();
    tagihan.forEach((t) => {
      if (!terakhir.has(t.periode) || t.jatuh_tempo > (terakhir.get(t.periode) as string)) terakhir.set(t.periode, t.jatuh_tempo);
    });
    return [...terakhir.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([p]) => p);
  }, [tagihan]);
  const periode = periodePilihan && daftarPeriode.includes(periodePilihan) ? periodePilihan : (daftarPeriode[0] ?? null);

  const items = useMemo<KamarDenah[]>(() => {
    const dasar = kamar.map((k) => {
      const { blok, nomor } = pecahKamar(k.nomor_kamar);
      return { k, blok: blok ?? 'Lainnya', nomor };
    });
    // Nomor tanpa huruf blok: urutkan lalu beri nomor slot berurutan
    dasar
      .filter((d) => d.blok === 'Lainnya')
      .sort((a, b) => a.k.nomor_kamar.localeCompare(b.k.nomor_kamar, undefined, { numeric: true }))
      .forEach((d, i) => {
        d.nomor = i + 1;
      });

    return dasar.map(({ k, blok, nomor }) => {
      const huni = penghuni.filter((p) => p.nomor_kamar === k.nomor_kamar && p.status_aktif);
      const tgKamar = tagihan.filter((t) => t.nomor_kamar === k.nomor_kamar && t.periode === periode);

      const per = new Map<string, Tagihan>();
      [...tgKamar]
        .sort((a, b) => b.id - a.id)
        .forEach((t) => {
          const kunci = t.nama_penghuni || `t${t.id}`;
          if (!per.has(kunci)) per.set(kunci, t);
        });
      const tg = [...per.values()];

      let status: StatusDenah;
      if (huni.length === 0 && k.status === 'tersedia') status = 'kosong';
      else if (tg.length === 0) status = 'tanpa_tagihan';
      else status = tg.map(statusDariTagihan).sort((a, b) => PERINGKAT[b] - PERINGKAT[a])[0];

      return {
        kamar: k,
        blok,
        nomor,
        status,
        penghuni: huni,
        tagihan: tg,
        keluhanAktif: keluhan.filter((x) => x.nomor_kamar === k.nomor_kamar && x.status !== 'selesai'),
      };
    });
  }, [kamar, penghuni, tagihan, keluhan, periode]);

  // Susun kolom per blok (konfigurasi + blok tambahan dari data)
  const { kolom, barisMaks, susunan } = useMemo(() => {
    const maksPerBlok = new Map<string, number>();
    items.forEach((i) => maksPerBlok.set(i.blok, Math.max(maksPerBlok.get(i.blok) ?? 0, i.nomor)));

    const konfig = KONFIG_BLOK.map((c) => ({ ...c, jumlah: Math.max(c.jumlah, maksPerBlok.get(c.blok) ?? 0) }));
    const tambahan = [...maksPerBlok.keys()]
      .filter((b) => !KONFIG_BLOK.some((c) => c.blok === b))
      .sort((a, b) => (a === 'Lainnya' ? 1 : b === 'Lainnya' ? -1 : a.localeCompare(b)))
      .map((b) => ({ blok: b, jumlah: maksPerBlok.get(b) ?? 0, rata: 'bawah' as Rata }));
    const semua = [...konfig, ...tambahan];
    const baris = Math.max(1, ...semua.map((c) => c.jumlah));

    const peta = new Map<string, KamarDenah>();
    items.forEach((i) => peta.set(`${i.blok}-${i.nomor}`, i));

    const hasil = new Map<string, { blok: string; jumlah: number; rata: Rata; slots: { nomor: number | null; item?: KamarDenah }[] }>();
    semua.forEach((c) => {
      const slots: { nomor: number | null; item?: KamarDenah }[] = [];
      for (let r = baris; r >= 1; r--) {
        const nomor = c.rata === 'bawah' ? (r <= c.jumlah ? r : null) : r - (baris - c.jumlah) >= 1 ? r - (baris - c.jumlah) : null;
        slots.push({ nomor, item: nomor ? peta.get(`${c.blok}-${nomor}`) : undefined });
      }
      hasil.set(c.blok, { ...c, slots });
    });

    const susunanAkhir: Elemen[] = [...SUSUNAN, ...tambahan.map((t) => ({ tipe: 'grup' as const, bloks: [t.blok] }))];
    return { kolom: hasil, barisMaks: baris, susunan: susunanAkhir };
  }, [items]);

  const hitung = useMemo(() => {
    const m: Record<StatusDenah, number> = { lunas: 0, menunggu: 0, belum: 0, terlambat: 0, tanpa_tagihan: 0, kosong: 0 };
    items.forEach((i) => (m[i.status] += 1));
    return m;
  }, [items]);

  const dipilih =
    items.find((i) => i.kamar.id === terpilih) ??
    [...items].sort((a, b) => a.blok.localeCompare(b.blok) || a.nomor - b.nomor).find((i) => i.status !== 'kosong') ??
    items[0];

  const tinggiBaris = barisMaks * TINGGI_SEL + (barisMaks - 1) * JARAK_SEL;
  const offsetAtas = TINGGI_CATATAN + TINGGI_HEADER + JARAK_HEADER;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <Skeleton className="h-[640px]" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (galat) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <WarningIcon size={28} className="mx-auto text-rose-500" />
        <p className="mt-3 font-semibold text-ink">Denah belum bisa dimuat</p>
        <p className="mt-1 text-sm text-ink-soft">Periksa koneksi atau pastikan server menyala, lalu muat ulang halaman.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <DoorIcon size={30} className="mx-auto text-slate-300" />
        <p className="mt-3 font-semibold text-ink">Belum ada kamar untuk digambar</p>
        <p className="mt-1 text-sm text-ink-soft">Tambahkan kamar di tab “Daftar Kamar”. Nomor seperti A12 atau A-01 otomatis masuk Blok A.</p>
      </div>
    );
  }

  const legendaTampil = hitung.tanpa_tagihan > 0 ? [...LEGENDA, { key: 'tanpa_tagihan' as StatusDenah, label: 'Belum Ada Tagihan' }] : LEGENDA;

  return (
    <div className="space-y-4">
      {/* Periode + legenda */}
      <div className="space-y-3">
        <label className="relative inline-flex items-center">
          <CalendarIcon size={17} className="pointer-events-none absolute left-3.5 text-ink-soft" />
          <span className="sr-only">Periode tagihan</span>
          <select
            value={periode ?? ''}
            disabled={daftarPeriode.length === 0}
            onChange={(e) => setPeriodePilihan(e.target.value)}
            className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-kos-600 focus:ring-2 focus:ring-kos-600/20 disabled:cursor-not-allowed disabled:text-ink-soft"
          >
            {daftarPeriode.length === 0 && <option value="">Belum ada tagihan</option>}
            {daftarPeriode.map((p) => (
              <option key={p} value={p}>
                Periode: {p}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 text-xs text-ink-soft">▾</span>
        </label>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="font-semibold tracking-wide text-ink-soft uppercase">Status Tagihan:</span>
          {legendaTampil.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setFilter(filter === l.key ? null : l.key)}
              aria-pressed={filter === l.key}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 transition ${
                filter === l.key ? 'bg-kos-100/60 font-semibold text-kos-700' : 'text-ink hover:bg-slate-100'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${CELL[l.key].dot}`} />
              {l.label}
              <span className="tabular-nums text-ink-soft">({hitung[l.key]})</span>
            </button>
          ))}
          <span className="hidden h-4 w-px bg-slate-300 sm:block" />
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold tracking-wide text-ink-soft uppercase">Penanda:</span>
            <span className="relative h-5 w-6 rounded-md border border-slate-300 bg-slate-100">
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-ink">Ada keluhan aktif</span>
          </span>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ───────── Denah ───────── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Denah kos">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-kos-600" />
              <h2 className="text-[15px] font-bold text-ink">Denah Kos (1 lantai)</h2>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-ink-soft">Total: {items.length} Kamar</span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-soft">
              <InfoCircleIcon size={14} className="text-kos-600" /> Warna kotak mengikuti status tagihan terburuk di kamar.
            </p>
          </div>

          <div className="overflow-x-auto pt-5 pb-2">
            <div className="mx-auto flex w-max items-start">
              {susunan.map((el, idx) => {
                if (el.tipe === 'lorong') {
                  return (
                    <div key={`lorong-${el.nama}`} className="mx-2 flex w-8 flex-col items-center" aria-hidden="true">
                      <div style={{ height: offsetAtas }} />
                      <div className="flex flex-col items-center justify-between rounded-md bg-slate-100 py-2 text-slate-400" style={{ height: tinggiBaris, width: 28 }}>
                        <span className="text-sm leading-none">{el.atas}</span>
                        <span className="text-[9px] font-bold tracking-[0.25em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          LORONG {el.nama}
                        </span>
                        <span className={`text-sm leading-none ${el.pintu ? 'text-kos-600' : ''}`}>↑</span>
                      </div>
                      {el.pintu && <span className="mt-1.5 whitespace-nowrap text-[10px] font-medium text-kos-600">Pintu masuk</span>}
                    </div>
                  );
                }

                return (
                  <div key={`grup-${idx}`} className={`flex flex-col ${idx > 0 && susunan[idx - 1].tipe === 'grup' ? 'ml-6' : ''}`}>
                    <div style={{ height: TINGGI_CATATAN }} className="flex items-end justify-center pb-1.5">
                      {el.catatan && (
                        <span className="flex w-full items-center justify-center gap-1.5 border-b border-slate-300 pb-1.5 text-[10px] text-ink-soft">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> {el.catatan}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-[5px]">
                      {el.bloks.map((b, bi) => {
                        const kol = kolom.get(b);
                        if (!kol) return null;
                        return (
                          <div key={b} className="flex gap-[5px]">
                            {bi > 0 && <div className="w-px self-stretch bg-slate-400" aria-hidden="true" />}
                            <div className="flex flex-col" style={{ width: LEBAR_SEL }}>
                              <p
                                className="flex items-center justify-center border-b border-slate-200 text-[11px] font-bold text-ink"
                                style={{ height: TINGGI_HEADER, marginBottom: JARAK_HEADER }}
                              >
                                Blok {b}&nbsp;<span className="font-normal text-ink-soft">({kol.jumlah})</span>
                              </p>
                              <div className="flex flex-col" style={{ gap: JARAK_SEL }}>
                                {kol.slots.map((s, si) => {
                                  if (s.nomor === null) {
                                    return (
                                      <div key={si} aria-hidden="true" style={{ height: TINGGI_SEL }} className="relative">
                                        <RumahShape tone="fill-slate-50/40 stroke-slate-200" dashed />
                                      </div>
                                    );
                                  }
                                  const kode = s.item?.kamar.nomor_kamar ?? `${b}${String(s.nomor).padStart(2, '0')}`;
                                  if (!s.item) {
                                    return (
                                      <div
                                        key={si}
                                        title="Belum terdaftar di Data Kamar"
                                        style={{ height: TINGGI_SEL }}
                                        className="relative flex items-center justify-center pt-3.5 text-[11px] font-semibold text-slate-300"
                                      >
                                        <RumahShape tone="fill-transparent stroke-slate-200" dashed />
                                        <span className="relative">{kode}</span>
                                      </div>
                                    );
                                  }
                                  const st = CELL[s.item.status];
                                  const aktif = dipilih?.kamar.id === s.item.kamar.id;
                                  const redup = filter !== null && filter !== s.item.status;
                                  return (
                                    <button
                                      key={si}
                                      type="button"
                                      onClick={() => setTerpilih(s.item!.kamar.id)}
                                      aria-pressed={aktif}
                                      aria-label={`Kamar ${kode}, ${st.label}${s.item.keluhanAktif.length ? ', ada keluhan aktif' : ''}`}
                                      style={{ height: TINGGI_SEL }}
                                      className={`relative flex cursor-pointer flex-col items-center justify-center pt-3.5 leading-none transition ${
                                        aktif ? '' : 'hover:-translate-y-px'
                                      } ${redup ? 'opacity-25' : ''}`}
                                    >
                                      <RumahShape
                                        tone={`${RUMAH_ISI[s.item.status]} ${aktif ? 'stroke-kos-600 drop-shadow-md' : RUMAH_GARIS[s.item.status]}`}
                                        dashed={s.item.status === 'kosong'}
                                        tebal={aktif}
                                      />
                                      {s.item.keluhanAktif.length > 0 && <span className="absolute right-0 top-2 z-10 h-2.5 w-2.5 rounded-full bg-red-500" />}
                                      <span className="relative text-[11px] font-bold text-ink">{kode}</span>
                                      <span className={`relative mt-[3px] text-[8.5px] font-semibold ${st.teks}`}>{st.label}</span>
                                      {aktif && (
                                        <span className="absolute -bottom-[7px] rounded-full bg-kos-600 px-1.5 py-px text-[7px] font-bold tracking-wide text-white">PILIH</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────── Detail kamar terpilih ───────── */}
        {dipilih && (
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 xl:sticky xl:top-24">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-wider text-kos-600 uppercase">Detail Kamar Terpilih</span>
              <Pill nada={NADA_STATUS[dipilih.status].nada}>{NADA_STATUS[dipilih.status].label}</Pill>
            </div>

            <h3 className="mt-2 text-[17px] leading-snug font-bold text-ink">
              Kamar {dipilih.kamar.nomor_kamar} • Blok {dipilih.blok} • Kamar {dipilih.kamar.tipe === 'berdua' ? 'Berdua' : 'Individu'}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              {rupiah(dipilih.kamar.harga_sewa)} / bulan{dipilih.kamar.fasilitas ? ` • ${dipilih.kamar.fasilitas}` : ''}
            </p>

            <div className="mt-4 border-t border-slate-200 pt-4">
              {dipilih.penghuni.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
                    <DoorIcon size={22} />
                  </span>
                  <p className="text-sm font-semibold text-ink">Kamar ini belum dihuni</p>
                  <p className="mt-1 mb-4 text-xs text-ink-soft">Tambahkan penghuni untuk memulai pencatatan tagihan.</p>
                  <Link to={`/dashboard/penghuni?tambah=1&kamar=${dipilih.kamar.id}`} className={`${btnPrimary} w-full`}>
                    <PlusIcon size={16} /> Tambah Penghuni
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">Daftar Penghuni</span>
                    <span className="text-ink-soft">{dipilih.penghuni.length} Orang Aktif</span>
                  </div>

                  {dipilih.penghuni.map((p, idx) => {
                    const tg = dipilih.tagihan.find((t) => t.nama_penghuni === p.nama_lengkap);
                    const stTg = tg ? statusDariTagihan(tg) : 'tanpa_tagihan';
                    const { hari, denda } = tg ? hitungDenda(tg) : { hari: 0, denda: 0 };
                    const total = tg ? Number(tg.nominal) + denda : 0;
                    return (
                      <div key={p.id} className="rounded-2xl border border-slate-200 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                            {inisial(p.nama_lengkap)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-ink">{p.nama_lengkap}</p>
                            <p className="text-[11px] text-ink-soft">Penghuni {idx + 1}</p>
                          </div>
                          <Pill nada={NADA_STATUS[stTg].nada}>{NADA_STATUS[stTg].label}</Pill>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-xs">
                          {tg ? (
                            <>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-ink-soft capitalize">Tagihan {tg.periode}:</span>
                                <span className={`text-[13px] font-bold tabular-nums ${stTg === 'terlambat' ? 'text-orange-600' : 'text-ink'}`}>{rupiah(total)}</span>
                              </div>
                              {denda > 0 && (
                                <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">
                                  {rupiah(tg.nominal)} + denda {rupiah(denda)} (terlambat {hari} hari @ {rupiah(DENDA_PER_HARI)})
                                </p>
                              )}
                              {stTg !== 'lunas' && (
                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                                  <span className="text-ink-soft">Jatuh tempo:</span>
                                  <span className="font-medium text-ink tabular-nums">{tglAngka(tg.jatuh_tempo)}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-ink-soft">Belum ada tagihan untuk periode ini.</p>
                          )}
                        </div>

                        <Link
                          to={`/dashboard/tagihan?cari=${encodeURIComponent(p.nama_lengkap)}`}
                          className={`mt-3 flex h-9 items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold transition ${
                            stTg === 'lunas' || stTg === 'tanpa_tagihan'
                              ? 'border-slate-200 text-ink hover:bg-slate-50'
                              : 'border-kos-600 text-kos-700 hover:bg-kos-100/40'
                          }`}
                        >
                          <EyeIcon size={16} /> Lihat Rincian
                        </Link>
                      </div>
                    );
                  })}

                  {dipilih.keluhanAktif.map((k) => (
                    <div key={k.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                          <WarningIcon size={16} className="text-red-500" /> Keluhan
                        </span>
                        <Pill nada={k.status === 'diproses' ? 'violet' : 'blue'}>{k.status === 'diproses' ? 'Diproses' : 'Diterima'}</Pill>
                      </div>
                      <div className="mt-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="text-[13px] font-semibold text-ink">
                          {k.nama_kategori || 'Umum'} - {k.deskripsi.length > 40 ? `${k.deskripsi.slice(0, 40)}…` : k.deskripsi}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">Tanggal: {tglAngka(k.tanggal_kirim)}</p>
                      </div>
                      <Link
                        to={`/dashboard/keluhan?cari=${encodeURIComponent(k.nama_penghuni || k.nomor_kamar || '')}`}
                        className="mt-3 flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-ink transition hover:bg-slate-50"
                      >
                        Lihat Detail
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
