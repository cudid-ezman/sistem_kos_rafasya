import { useEffect, useMemo, useState } from 'react';
import { tagihanService } from '../../services/tagihanService';
import type { Tagihan } from '../../types/kos';
import { rupiah } from '../../lib/format';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { Skeleton } from '../../components/portal/Skeleton';
import { btnPrimary } from '../../components/portal/buttons';
import { ChartIcon, PrinterIcon, TrendingUpIcon } from '../../components/portal/icons';
import Pagination from '../../components/admin/Pagination';
import SearchInput from '../../components/admin/SearchInput';
import EmptyState from '../../components/admin/EmptyState';
import { tdCls, thCls } from '../../components/admin/styles';

const PER_HALAMAN = 10;

export default function LaporanKeuangan() {
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [transaksi, setTransaksi] = useState<Tagihan[]>([]);
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let batal = false;
    tagihanService
      .getLaporanKeuangan()
      .then((res) => {
        if (batal) return;
        setTotalPemasukan(res.data.total_pemasukan || 0);
        setTransaksi(res.data.transaksi || []);
      })
      .catch((error) => console.error('Gagal memuat laporan keuangan', error))
      .finally(() => !batal && setIsLoading(false));
    return () => {
      batal = true;
    };
  }, []);

  // Pemasukan per periode (urutan kemunculan = urutan data dari server)
  const perPeriode = useMemo(() => {
    const m = new Map<string, number>();
    transaksi.forEach((t) => m.set(t.periode, (m.get(t.periode) ?? 0) + Number(t.nominal || 0)));
    return [...m.entries()].slice(0, 8);
  }, [transaksi]);
  const maks = Math.max(1, ...perPeriode.map(([, n]) => n));

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return transaksi.filter((t) => {
      const nama = (t.nama_penghuni || t.penghuni?.nama_lengkap || '').toLowerCase();
      const kamar = (t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '').toLowerCase();
      return nama.includes(q) || kamar.includes(q) || (t.periode || '').toLowerCase().includes(q);
    });
  }, [transaksi, cari]);
  const baris = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

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

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kos-950 via-kos-900 to-kos-600 p-6 text-white shadow-lg shadow-kos-950/20 print:border print:bg-none print:text-ink print:shadow-none">
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border border-white/10 print:hidden" />
          <div className="relative flex items-start justify-between">
            <p className="text-sm font-medium text-white/80 print:text-ink-soft">Total Pemasukan Lunas</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 print:hidden">
              <TrendingUpIcon size={20} />
            </span>
          </div>
          <p className="relative mt-2 text-4xl font-bold tracking-tight tabular-nums">{rupiah(totalPemasukan)}</p>
          <p className="relative mt-3 border-t border-white/15 pt-3 text-xs text-white/75 print:text-ink-soft">
            {transaksi.length} transaksi • akumulasi seluruh pembayaran yang telah diverifikasi.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ChartIcon size={18} className="text-kos-600" /> Pemasukan per Periode
          </h2>
          {perPeriode.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">Belum ada data untuk ditampilkan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {perPeriode.map(([periode, nilai]) => (
                <li key={periode}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink capitalize">{periode}</span>
                    <span className="font-semibold text-ink tabular-nums">{rupiah(nilai)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-kos-600" style={{ width: `${(nilai / maks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Rincian Pemasukan Sewa</h2>
            <p className="text-xs text-ink-soft">Daftar tagihan penghuni yang berstatus Lunas.</p>
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
          <EmptyState icon={<ChartIcon size={26} />} title="Belum ada transaksi pemasukan" text="Transaksi akan muncul setelah pengurus menyetujui pembayaran." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className={thCls}>Periode</th>
                  <th className={thCls}>Penghuni</th>
                  <th className={thCls}>Nomor Kamar</th>
                  <th className={`${thCls} text-right`}>Nominal Masuk</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50/70">
                    <td className={`${tdCls} font-semibold capitalize`}>{t.periode}</td>
                    <td className={tdCls}>{t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}</td>
                    <td className={tdCls}>Kamar {t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'}</td>
                    <td className={`${tdCls} text-right font-bold tabular-nums`}>{rupiah(t.nominal)}</td>
                    <td className={tdCls}>
                      <StatusPill status={t.status} />
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
