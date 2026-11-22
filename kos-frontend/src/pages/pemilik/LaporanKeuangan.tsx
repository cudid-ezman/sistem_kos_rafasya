import { useEffect, useMemo, useState } from 'react';
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
import { ChartIcon, PrinterIcon, TrendingUpIcon } from '../../components/portal/icons';
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

  const terfilter = useMemo(
    () =>
      filterPeriode(transaksi, mode, anchor).sort((a, b) => tanggalTransaksi(b).getTime() - tanggalTransaksi(a).getTime()),
    [transaksi, mode, anchor]
  );
  const total = useMemo(() => totalNominal(terfilter), [terfilter]);
  const sebelumnya = useMemo(
    () => (mode === 'semua' ? null : totalNominal(filterPeriode(transaksi, mode, geser(mode, anchor, -1)))),
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

  const ubahPeriode: typeof ubah = (m, a) => {
    setHalaman(1);
    ubah(m, a);
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
      <PageHeader
        crumbs={[{ label: 'Beranda', to: '/dashboard' }, { label: 'Laporan Keuangan' }]}
        title="Laporan Keuangan"
        subtitle="Ringkasan pemasukan sewa yang sudah diverifikasi pengurus."
        action={
          <button type="button" onClick={() => window.print()} className={`${btnPrimary} print:hidden`}>
            <PrinterIcon size={17} /> Cetak / Simpan PDF
          </button>
        }
      />

      <div className="mb-5">
        <FilterPeriode mode={mode} anchor={anchor} onChange={ubahPeriode} />
        <p className="mt-2 hidden text-sm font-semibold text-ink print:block">Periode: {labelPeriode(mode, anchor)}</p>
      </div>

      {adaPerkiraan && (
        <p className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 print:hidden">
          Server belum mengirim tanggal pembayaran untuk sebagian transaksi, jadi tanggal jatuh tempo dipakai sebagai perkiraan. Perbarui endpoint laporan di backend
          agar filter minggu, bulan, dan tahun akurat.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kos-950 via-kos-900 to-kos-600 p-6 text-white shadow-lg shadow-kos-950/20 print:border print:bg-none print:text-ink print:shadow-none">
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/10 print:hidden" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 print:text-ink-soft">Total Pemasukan</p>
              <span className="mt-1 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold print:bg-slate-100">
                {labelPeriode(mode, anchor)}
              </span>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 print:hidden">
              <TrendingUpIcon size={20} />
            </span>
          </div>
          <p className="relative mt-3 text-4xl font-bold tracking-tight tabular-nums">{rupiah(total)}</p>
          <p className="relative mt-3 border-t border-white/15 pt-3 text-xs text-white/75 print:text-ink-soft">
            {terfilter.length} transaksi lunas
            {perubahan !== null && (
              <span className="font-semibold text-white print:text-ink">
                {' • '}
                {perubahan >= 0 ? '▲' : '▼'} {Math.abs(perubahan).toFixed(1).replace('.', ',')}% dari periode sebelumnya
              </span>
            )}
            {sebelumnya !== null && perubahan === null && total > 0 && ' • periode sebelumnya Rp 0'}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
            <ChartIcon size={18} className="text-kos-600" /> {JUDUL_GRAFIK[mode]}
          </h2>
          <GrafikPemasukan data={grafik} judul={JUDUL_GRAFIK[mode]} />
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Rincian Pemasukan Sewa</h2>
            <p className="text-xs text-ink-soft">Tagihan berstatus Lunas pada {mode === 'semua' ? 'semua waktu' : labelPeriode(mode, anchor)}.</p>
          </div>
          <div className="print:hidden">
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
            text={transaksi.length === 0 ? 'Transaksi akan muncul setelah pengurus menyetujui pembayaran.' : 'Coba geser periode atau pilih rentang waktu lain.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Tanggal Bayar</th>
                  <th className={thCls}>Periode</th>
                  <th className={thCls}>Penghuni</th>
                  <th className={thCls}>Nomor Kamar</th>
                  <th className={`${thCls} text-right`}>Nominal Masuk</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/70 print:break-inside-avoid">
                    <td className={`${tdCls} whitespace-nowrap tabular-nums`}>{tglAngka(t.tanggal_bayar || t.tanggal_verifikasi || t.jatuh_tempo)}</td>
                    <td className={`${tdCls} font-semibold capitalize`}>{t.periode}</td>
                    <td className={tdCls}>{t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}</td>
                    <td className={tdCls}>Kamar {t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'}</td>
                    <td className={`${tdCls} text-right font-bold tabular-nums`}>{rupiah(t.nominal)}</td>
                    <td className={tdCls}>
                      <div className="flex flex-col items-start gap-1">
                        <StatusPill status={t.status} />
                        {t.status_perpanjangan === 'disetujui' && t.tanggal_perpanjangan && (
                          <span
                            title={t.alasan_perpanjangan || 'Dispensasi jatuh tempo disetujui pengurus'}
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
        <div className="print:hidden">
          <Pagination total={tersaring.length} page={halaman} perPage={PER_HALAMAN} onChange={setHalaman} />
        </div>
      </section>
    </div>
  );
}
