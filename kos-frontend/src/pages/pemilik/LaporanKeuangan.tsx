import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { tagihanService } from '../../services/tagihanService';
import type { TransaksiLaporan } from '../../types/kos';
import { rupiah, tglAngka } from '../../lib/format';
import {
  buatGrafik,
  filterPeriode,
  geser,
  labelPeriode,
  persenPerubahan,
  tanggalTransaksi,
  totalNominal,
} from '../../lib/periode';
import { usePeriode } from '../../lib/usePeriode';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { btnPrimary } from '../../components/portal/buttons';
import {
  ChartIcon,
  DownloadIcon,
  PrinterIcon,
  TrendingUpIcon,
} from '../../components/portal/icons';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import EmptyState from '../../components/admin/EmptyState';
import FilterPeriode from '../../components/admin/FilterPeriode';
import GrafikPemasukan from '../../components/admin/GrafikPemasukan';
import { tdCls, thCls } from '../../components/admin/styles';

const PER_HALAMAN = 10;

const JUDUL_GRAFIK = {
  semua: 'Pemasukan per bulan',
  minggu: 'Pemasukan per hari',
  bulan: 'Pemasukan per minggu',
  tahun: 'Pemasukan per bulan',
} as const;

export default function LaporanKeuangan() {
  const { mode, anchor, ubah } = usePeriode();
  const [transaksi, setTransaksi] = useState<TransaksiLaporan[]>([]);
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [menuCetakTerbuka, setMenuCetakTerbuka] = useState(false);
  const menuCetakRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let batal = false;
    tagihanService
      .getLaporanKeuangan()
      .then((res) => !batal && setTransaksi(res.data.transaksi || []))
      .catch((error) => console.error('Gagal memuat laporan keuangan', error))
      .finally(() => !batal && setIsLoading(false));
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (!menuCetakTerbuka) return;
    const handleKlikLuar = (e: MouseEvent) => {
      if (menuCetakRef.current && !menuCetakRef.current.contains(e.target as Node)) {
        setMenuCetakTerbuka(false);
      }
    };
    document.addEventListener('mousedown', handleKlikLuar);
    return () => document.removeEventListener('mousedown', handleKlikLuar);
  }, [menuCetakTerbuka]);

  const terfilter = useMemo(
    () =>
      filterPeriode(transaksi, mode, anchor).sort(
        (a, b) => tanggalTransaksi(b).getTime() - tanggalTransaksi(a).getTime()
      ),
    [transaksi, mode, anchor]
  );
  const total = useMemo(() => totalNominal(terfilter), [terfilter]);
  const sebelumnya = useMemo(
    () =>
      mode === 'semua'
        ? null
        : totalNominal(filterPeriode(transaksi, mode, geser(mode, anchor, -1))),
    [transaksi, mode, anchor]
  );
  const perubahan = sebelumnya === null ? null : persenPerubahan(total, sebelumnya);
  const grafik = useMemo(() => buatGrafik(transaksi, mode, anchor), [transaksi, mode, anchor]);
  const adaPerkiraan = transaksi.some((t) => !t.tanggal_bayar);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return terfilter.filter((t) => {
      const nama = (t.nama_penghuni || t.penghuni?.nama_lengkap || '').toLowerCase();
      const kamar = (t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '').toLowerCase();
      return nama.includes(q) || kamar.includes(q) || (t.periode || '').toLowerCase().includes(q);
    });
  }, [terfilter, cari]);

  const baris = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  // Data baris terstruktur yang identik untuk Excel (.xlsx) maupun Cetak PDF
  const barisLaporanTerstruktur = useMemo(
    () =>
      tersaring.map((t, idx) => {
        const pokok = Number(t.nominal || 0);
        const denda = Number(t.denda || 0);
        return {
          no: idx + 1,
          tanggalBayar: tglAngka(t.tanggal_bayar || t.tanggal_verifikasi || t.jatuh_tempo),
          periode: t.periode || '-',
          penghuni: t.nama_penghuni || t.penghuni?.nama_lengkap || '-',
          nomorKamar: `Kamar ${t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'}`,
          pokok,
          denda,
          totalMasuk: pokok + denda,
          status: t.status === 'lunas' ? 'Lunas' : t.status,
        };
      }),
    [tersaring]
  );

  const ringkasanLaporan = useMemo(() => {
    return barisLaporanTerstruktur.reduce(
      (acc, r) => ({
        pokok: acc.pokok + r.pokok,
        denda: acc.denda + r.denda,
        totalMasuk: acc.totalMasuk + r.totalMasuk,
      }),
      { pokok: 0, denda: 0, totalMasuk: 0 }
    );
  }, [barisLaporanTerstruktur]);

  const ubahPeriode: typeof ubah = (m, a) => {
    setHalaman(1);
    ubah(m, a);
  };

  const handleExportExcel = () => {
    setMenuCetakTerbuka(false);
    const teksPeriode = labelPeriode(mode, anchor);
    const tanggalCetak = tglAngka(new Date().toISOString().slice(0, 10));

    const aoa: (string | number)[][] = [
      ['LAPORAN KEUANGAN PEMASUKAN SEWA - KOST PUTRA RAFFASYA'],
      [`Periode: ${teksPeriode}`],
      [`Dicetak pada: ${tanggalCetak} | Total Transaksi: ${barisLaporanTerstruktur.length}`],
      [],
      [
        'No',
        'Tanggal Bayar',
        'Periode',
        'Penghuni',
        'Nomor Kamar',
        'Pokok Sewa (Rp)',
        'Denda (Rp)',
        'Total Nominal Masuk (Rp)',
        'Status',
      ],
      ...barisLaporanTerstruktur.map((r) => [
        r.no,
        r.tanggalBayar,
        r.periode,
        r.penghuni,
        r.nomorKamar,
        r.pokok,
        r.denda,
        r.totalMasuk,
        r.status,
      ]),
      [
        '',
        '',
        '',
        '',
        'TOTAL KESELURUHAN',
        ringkasanLaporan.pokok,
        ringkasanLaporan.denda,
        ringkasanLaporan.totalMasuk,
        '',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 15 },
      { wch: 24 },
      { wch: 12 },
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');
    const slugPeriode = teksPeriode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    XLSX.writeFile(wb, `Laporan-Keuangan-Kos-Rafasya-${slugPeriode}.xlsx`);
  };

  const handleCetakPdf = () => {
    setMenuCetakTerbuka(false);
    window.setTimeout(() => window.print(), 100);
  };

  if (isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      {/* === TAMPILAN WEB INTERAKTIF (DISEMBUNYIKAN SAAT CETAK PDF) === */}
      <div className="print:hidden">
        <PageHeader
          crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Laporan Keuangan' }]}
          title="Laporan Keuangan"
          subtitle="Ringkasan pemasukan sewa yang sudah diverifikasi pengurus."
          action={
            <div ref={menuCetakRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuCetakTerbuka((v) => !v)}
                className={btnPrimary}
              >
                <PrinterIcon size={17} />
                <span>Cetak / Simpan Laporan</span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>

              {menuCetakTerbuka && (
                <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-field-line bg-white py-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition hover:bg-cream"
                  >
                    <DownloadIcon size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-xs font-bold text-ink">Simpan Excel (.xlsx)</p>
                      <p className="text-[11px] text-ink-soft">
                        Format kolom &amp; baris siap olah
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleCetakPdf}
                    className="flex w-full cursor-pointer items-start gap-3 border-t border-field-line px-4 py-2.5 text-left transition hover:bg-cream"
                  >
                    <PrinterIcon size={17} className="mt-0.5 shrink-0 text-kos-700" />
                    <div>
                      <p className="text-xs font-bold text-ink">Cetak / Simpan PDF</p>
                      <p className="text-[11px] text-ink-soft">
                        Tabel resmi siap cetak / PDF
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          }
        />

        <div className="mb-5">
          <FilterPeriode mode={mode} anchor={anchor} onChange={ubahPeriode} />
        </div>

        {adaPerkiraan && (
          <p className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            Server belum mengirim tanggal pembayaran untuk sebagian transaksi, jadi tanggal jatuh
            tempo dipakai sebagai perkiraan. Perbarui endpoint laporan di backend agar filter minggu,
            bulan, dan tahun akurat.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <section className="relative overflow-hidden rounded-2xl bg-kos-700 p-6 text-white">
            <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/10" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">Total Pemasukan</p>
                <span className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">
                  {labelPeriode(mode, anchor)}
                </span>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                <TrendingUpIcon size={20} />
              </span>
            </div>
            <p className="relative mt-3 text-4xl font-bold tracking-tight tabular-nums">
              {rupiah(total)}
            </p>
            <p className="relative mt-3 border-t border-white/15 pt-3 text-xs text-white/75">
              {terfilter.length} transaksi lunas
              {perubahan !== null && (
                <span className="font-semibold text-white">
                  {' • '}
                  {perubahan >= 0 ? '▲' : '▼'} {Math.abs(perubahan).toFixed(1).replace('.', ',')}%
                  dari periode sebelumnya
                </span>
              )}
              {sebelumnya !== null && perubahan === null && total > 0 && ' • periode sebelumnya Rp 0'}
            </p>
          </section>

          <section className="rounded-2xl border border-field-line bg-field p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
              <ChartIcon size={18} className="text-kos-600" /> {JUDUL_GRAFIK[mode]}
            </h2>
            <GrafikPemasukan data={grafik} judul={JUDUL_GRAFIK[mode]} />
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-field-line bg-field">
          <div className="flex flex-col gap-3 border-b border-field-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Rincian Pemasukan Sewa</h2>
              <p className="text-xs text-ink-soft">
                Tagihan berstatus Lunas pada{' '}
                {mode === 'semua' ? 'semua waktu' : labelPeriode(mode, anchor)}.
              </p>
            </div>
            <div>
              <SearchInput
                value={cari}
                onChange={(v) => {
                  setCari(v);
                  setHalaman(1);
                }}
                placeholder="Cari periode, nama, atau kamar..."
              />
            </div>
          </div>

          {tersaring.length === 0 ? (
            <EmptyState
              icon={<ChartIcon size={26} />}
              title="Tidak ada transaksi pada periode ini"
              text={
                transaksi.length === 0
                  ? 'Transaksi akan muncul setelah pengurus menyetujui pembayaran.'
                  : 'Coba geser periode atau pilih rentang waktu lain.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream/50">
                  <tr>
                    <th className={thCls}>Tanggal Bayar</th>
                    <th className={thCls}>Periode</th>
                    <th className={thCls}>Penghuni</th>
                    <th className={thCls}>Nomor Kamar</th>
                    <th className={`${thCls} text-right`}>Nominal Masuk</th>
                    <th className={thCls}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-field-line">
                  {baris.map((t) => (
                    <tr key={t.id} className="transition hover:bg-cream/40">
                      <td className={`${tdCls} whitespace-nowrap tabular-nums`}>
                        {tglAngka(t.tanggal_bayar || t.tanggal_verifikasi || t.jatuh_tempo)}
                      </td>
                      <td className={`${tdCls} font-semibold capitalize`}>{t.periode}</td>
                      <td className={tdCls}>
                        {t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}
                      </td>
                      <td className={tdCls}>
                        Kamar {t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'}
                      </td>
                      <td className={`${tdCls} text-right font-bold tabular-nums`}>
                        <div>{rupiah(Number(t.nominal || 0) + Number(t.denda || 0))}</div>
                        {Number(t.denda || 0) > 0 && (
                          <div className="text-[11px] font-medium text-orange-600">
                            Pokok {rupiah(t.nominal)} + denda {rupiah(t.denda || 0)}
                          </div>
                        )}
                      </td>
                      <td className={tdCls}>
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={t.status} />
                          {t.status_perpanjangan === 'disetujui' && t.tanggal_perpanjangan && (
                            <span
                              title={
                                t.alasan_perpanjangan || 'Dispensasi jatuh tempo disetujui pengurus'
                              }
                              className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700"
                            >
                              Dispensasi s/d {tglAngka(t.tanggal_perpanjangan)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            total={tersaring.length}
            page={halaman}
            perPage={PER_HALAMAN}
            onChange={setHalaman}
          />
        </section>
      </div>

      {/* === TAMPILAN CETAK PDF (TABEL KOLOM & BARIS IDENTIK DENGAN EXCEL) === */}
      <div className="hidden text-black print:block">
        <div className="mb-5 border-b-2 border-slate-900 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Dokumen Administrasi &amp; Keuangan
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                KOST PUTRA RAFFASYA
              </h1>
              <p className="text-xs text-slate-600">
                Jl. Balam Sakti Gang Kuantan, Kel. Simpang Baru, Kec. Bina Widya (Panam), Pekanbaru, Riau
              </p>
            </div>
            <div className="text-right text-xs text-slate-700">
              <p className="font-bold text-slate-900">LAPORAN PEMASUKAN SEWA</p>
              <p className="mt-0.5">
                Periode: <span className="font-semibold">{labelPeriode(mode, anchor)}</span>
              </p>
              <p>
                Dicetak: {tglAngka(new Date().toISOString().slice(0, 10))} •{' '}
                {barisLaporanTerstruktur.length} transaksi
              </p>
              {cari.trim() && <p className="text-[11px] text-slate-500">Filter: &ldquo;{cari.trim()}&rdquo;</p>}
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1.5 text-center font-bold">No</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-bold">
                Tanggal Bayar
              </th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-bold">Periode</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-bold">Penghuni</th>
              <th className="border border-slate-400 px-2 py-1.5 text-left font-bold">
                Nomor Kamar
              </th>
              <th className="border border-slate-400 px-2 py-1.5 text-right font-bold">
                Pokok Sewa
              </th>
              <th className="border border-slate-400 px-2 py-1.5 text-right font-bold">Denda</th>
              <th className="border border-slate-400 px-2 py-1.5 text-right font-bold">
                Total Nominal Masuk
              </th>
              <th className="border border-slate-400 px-2 py-1.5 text-center font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {barisLaporanTerstruktur.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="border border-slate-400 px-3 py-4 text-center text-slate-500"
                >
                  Tidak ada transaksi pada periode ini.
                </td>
              </tr>
            ) : (
              barisLaporanTerstruktur.map((r) => (
                <tr key={r.no} className="break-inside-avoid">
                  <td className="border border-slate-400 px-2 py-1 text-center tabular-nums">
                    {r.no}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 whitespace-nowrap tabular-nums">
                    {r.tanggalBayar}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 capitalize">{r.periode}</td>
                  <td className="border border-slate-400 px-2 py-1">{r.penghuni}</td>
                  <td className="border border-slate-400 px-2 py-1">{r.nomorKamar}</td>
                  <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">
                    {rupiah(r.pokok)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">
                    {rupiah(r.denda)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-right font-semibold tabular-nums">
                    {rupiah(r.totalMasuk)}
                  </td>
                  <td className="border border-slate-400 px-2 py-1 text-center">{r.status}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-slate-400 px-2 py-1.5 text-right">
                TOTAL KESELURUHAN
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular-nums">
                {rupiah(ringkasanLaporan.pokok)}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular-nums">
                {rupiah(ringkasanLaporan.denda)}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular-nums">
                {rupiah(ringkasanLaporan.totalMasuk)}
              </td>
              <td className="border border-slate-400 px-2 py-1.5" />
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 flex justify-end text-xs text-slate-800">
          <div className="w-56 text-center">
            <p>Pekanbaru, {tglAngka(new Date().toISOString().slice(0, 10))}</p>
            <p className="font-semibold">Pemilik Kost Putra Raffasya</p>
            <div className="h-14" />
            <p className="border-t border-slate-400 pt-1 font-semibold">( ______________________ )</p>
          </div>
        </div>
      </div>
    </div>
  );
}
