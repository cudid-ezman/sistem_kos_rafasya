import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Kamar, TransaksiLaporan } from '../../types/kos';
import { kamarService } from '../../services/kamarService';
import { tagihanService } from '../../services/tagihanService';
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
import { Hero, IkonKotak, Ring, StatCard, heroBtn } from '../../components/admin/DashboardParts';
import FilterPeriode from '../../components/admin/FilterPeriode';
import GrafikPemasukan from '../../components/admin/GrafikPemasukan';
import { Skeleton } from '../../components/portal/Skeleton';
import { ArrowRightIcon, CheckCircleIcon, DoorIcon, TrendingUpIcon } from '../../components/portal/icons';

const JUDUL_GRAFIK = {
  semua: 'Pemasukan per bulan',
  minggu: 'Pemasukan per hari',
  bulan: 'Pemasukan per minggu',
  tahun: 'Pemasukan per bulan',
} as const;

export default function BerandaPemilik({ nama }: { nama: string }) {
  const { mode, anchor, ubah, query } = usePeriode();
  const [transaksi, setTransaksi] = useState<TransaksiLaporan[]>([]);
  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let batal = false;
    Promise.all([tagihanService.getLaporanKeuangan(), kamarService.getAllKamar()])
      .then(([lap, km]) => {
        if (batal) return;
        setTransaksi(lap.data.transaksi || []);
        setKamar(km.data);
      })
      .catch((e) => console.error('Gagal memuat ringkasan pemilik', e))
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
  }, []);

  const terfilter = useMemo(() => filterPeriode(transaksi, mode, anchor), [transaksi, mode, anchor]);
  const total = useMemo(() => totalNominal(terfilter), [terfilter]);
  const sebelumnya = useMemo(
    () => (mode === 'semua' ? null : totalNominal(filterPeriode(transaksi, mode, geser(mode, anchor, -1)))),
    [transaksi, mode, anchor]
  );
  const perubahan = sebelumnya === null ? null : persenPerubahan(total, sebelumnya);
  const grafik = useMemo(() => buatGrafik(transaksi, mode, anchor), [transaksi, mode, anchor]);
  const terbaru = useMemo(
    () => [...terfilter].sort((a, b) => tanggalTransaksi(b).getTime() - tanggalTransaksi(a).getTime()).slice(0, 5),
    [terfilter]
  );
  const adaPerkiraan = transaksi.some((t) => !t.tanggal_bayar);

  const terisi = kamar.filter((k) => k.status === 'terisi').length;
  const tersedia = kamar.filter((k) => k.status === 'tersedia').length;
  const okupansi = kamar.length ? (terisi / kamar.length) * 100 : 0;

  const lompatKeTerakhir = () => {
    if (transaksi.length === 0) return;
    const terakhir = new Date(Math.max(...transaksi.map((t) => tanggalTransaksi(t).getTime())));
    ubah(mode, terakhir);
  };

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-40" />
        <Skeleton className="h-12" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const kosongPadaPeriode = mode !== 'semua' && terfilter.length === 0 && transaksi.length > 0;

  return (
    <div className="space-y-5">
      <Hero nama={nama} role="Pemilik">
        <Link to={`/dashboard/laporan${query}`} className={heroBtn}>
          Lihat laporan <ArrowRightIcon size={15} />
        </Link>
      </Hero>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Pemasukan</h2>
          <p className="text-xs text-ink-soft">Pilih rentang waktu untuk melihat pemasukan sewa yang sudah diverifikasi.</p>
        </div>
        <FilterPeriode mode={mode} anchor={anchor} onChange={ubah} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-ink-soft">Total Pemasukan</p>
              <span className="mt-1 inline-block rounded-full bg-kos-100/60 px-2.5 py-0.5 text-[11px] font-semibold text-kos-700">
                {labelPeriode(mode, anchor)}
              </span>
            </div>
            <IkonKotak tone="emerald">
              <TrendingUpIcon size={20} />
            </IkonKotak>
          </div>

          <p className="mt-3 text-4xl font-bold tracking-tight text-emerald-600 tabular-nums">{rupiah(total)}</p>

          {kosongPadaPeriode ? (
            <p className="mt-2 text-xs text-ink-soft">
              Belum ada pemasukan pada periode ini.{' '}
              <button type="button" onClick={lompatKeTerakhir} className="cursor-pointer font-semibold text-kos-700 hover:underline">
                Lompat ke periode terakhir yang ada data
              </button>
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">
              {terfilter.length} transaksi lunas
              {sebelumnya !== null && (
                <>
                  {' • '}
                  {perubahan === null ? (
                    sebelumnya === 0 && total > 0 ? (
                      <span>periode sebelumnya Rp 0</span>
                    ) : null
                  ) : (
                    <span className={`font-semibold ${perubahan >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {perubahan >= 0 ? '▲' : '▼'} {Math.abs(perubahan).toFixed(1).replace('.', ',')}%
                    </span>
                  )}
                  {perubahan !== null && <span> dari periode sebelumnya ({rupiah(sebelumnya)})</span>}
                </>
              )}
            </p>
          )}
        </section>

        <div className="flex items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6">
          <Ring persen={okupansi} label="terisi" />
          <div>
            <p className="text-sm text-ink-soft">Okupansi Kamar</p>
            <p className="mt-1 text-xl font-bold text-ink">
              {terisi} / {kamar.length}
            </p>
            <p className="text-xs text-ink-soft">kamar terisi</p>
          </div>
        </div>

        <StatCard to="/dashboard/laporan" label="Kamar Kosong" value={tersedia} hint="Siap disewakan" icon={<DoorIcon size={20} />} tone="kos" />
      </div>

      {adaPerkiraan && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Server belum mengirim tanggal pembayaran untuk sebagian transaksi, jadi tanggal jatuh tempo dipakai sebagai perkiraan. Perbarui endpoint laporan di
          backend agar filter minggu, bulan, dan tahun akurat.
        </p>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink">{JUDUL_GRAFIK[mode]}</h2>
          <span className="text-xs text-ink-soft">{labelPeriode(mode, anchor)}</span>
        </div>
        <GrafikPemasukan data={grafik} judul={JUDUL_GRAFIK[mode]} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-ink">Transaksi pada {mode === 'semua' ? 'semua waktu' : 'periode ini'}</h2>
          <Link to={`/dashboard/laporan${query}`} className="text-[13px] font-semibold text-kos-700 hover:underline">
            Lihat semua
          </Link>
        </div>
        {terbaru.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada transaksi pemasukan pada periode ini.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {terbaru.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-6 py-3.5">
                <IkonKotak tone="emerald">
                  <CheckCircleIcon size={19} />
                </IkonKotak>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}</p>
                  <p className="text-xs text-ink-soft capitalize">
                    {t.periode} • Kamar {t.nomor_kamar || '-'} • dibayar {tglAngka(t.tanggal_bayar || t.tanggal_verifikasi || t.jatuh_tempo)}
                  </p>
                </div>
                <p className="text-sm font-bold text-ink tabular-nums">{rupiah(Number(t.nominal || 0) + Number(t.denda || 0))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
