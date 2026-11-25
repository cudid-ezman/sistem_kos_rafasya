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
import { DeretanKamar, Hero, IkonKotak, Ring, heroBtn, panelCls, panelHeadCls, panelTitleCls } from '../../components/admin/DashboardParts';
import FilterPeriode from '../../components/admin/FilterPeriode';
import GrafikPemasukan from '../../components/admin/GrafikPemasukan';
import { Skeleton } from '../../components/portal/Skeleton';
import { ArrowRightIcon, CheckCircleIcon, } from '../../components/portal/icons';

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
      <Hero
        nama={nama}
        role="Pemilik"
        ringkasan={`${terisi} dari ${kamar.length} kamar terisi, ${tersedia} siap disewakan.`}
        bawah={kamar.length > 0 ? <DeretanKamar kamar={kamar} /> : undefined}
      >
        <Link to={`/dashboard/laporan${query}`} className={heroBtn}>
          Lihat laporan <ArrowRightIcon size={15} />
        </Link>
      </Hero>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink">Pemasukan</h2>
          <p className="mt-0.5 text-sm text-ink-soft">Pemasukan sewa yang sudah diverifikasi, sesuai rentang waktu yang dipilih.</p>
        </div>
        <FilterPeriode mode={mode} anchor={anchor} onChange={ubah} />
      </section>

      <section className={`${panelCls} grid lg:grid-cols-[1fr_300px]`}>
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-soft">Total pemasukan</p>
            <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-semibold text-gerbang">{labelPeriode(mode, anchor)}</span>
          </div>

          <p className="mt-2 font-display text-5xl font-extrabold tracking-tight text-kos-700 tabular-nums">{rupiah(total)}</p>

          {kosongPadaPeriode ? (
            <p className="mt-2 text-[13px] text-ink-soft">
              Belum ada pemasukan pada periode ini.{' '}
              <button type="button" onClick={lompatKeTerakhir} className="cursor-pointer font-semibold text-kos-700 hover:underline">
                Lompat ke periode terakhir yang ada data
              </button>
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-ink-soft">
              {terfilter.length} transaksi lunas
              {sebelumnya !== null && (
                <>
                  {' • '}
                  {perubahan === null ? (
                    sebelumnya === 0 && total > 0 ? (
                      <span>periode sebelumnya Rp 0</span>
                    ) : null
                  ) : (
                    <span className={`font-semibold ${perubahan >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {perubahan >= 0 ? '▲' : '▼'} {Math.abs(perubahan).toFixed(1).replace('.', ',')}%
                    </span>
                  )}
                  {perubahan !== null && <span> dari periode sebelumnya ({rupiah(sebelumnya)})</span>}
                </>
              )}
            </p>
          )}

          <div className="mt-6 border-t border-field-line pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-ink">{JUDUL_GRAFIK[mode]}</h3>
              <span className="text-xs text-ink-soft">{labelPeriode(mode, anchor)}</span>
            </div>
            <GrafikPemasukan data={grafik} judul={JUDUL_GRAFIK[mode]} />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-6 border-t border-field-line bg-cream/50 p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div>
            <p className="text-sm text-ink-soft">Okupansi kamar</p>
            <div className="mt-3">
              <Ring persen={okupansi} label={`${terisi} dari ${kamar.length} kamar terisi`} />
            </div>
          </div>
          <div className="border-t border-field-line pt-5">
            <p className="text-sm text-ink-soft">Kamar kosong</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-ink tabular-nums">{tersedia}</p>
            <p className="text-[13px] text-ink-soft">siap disewakan</p>
          </div>
        </div>
      </section>

      {adaPerkiraan && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          Server belum mengirim tanggal pembayaran untuk sebagian transaksi, jadi tanggal jatuh tempo dipakai sebagai perkiraan. Perbarui endpoint laporan di
          backend agar filter minggu, bulan, dan tahun akurat.
        </p>
      )}

      <section className={panelCls}>
        <div className={panelHeadCls}>
          <h3 className={panelTitleCls}>Transaksi pada {mode === 'semua' ? 'semua waktu' : 'periode ini'}</h3>
          <Link to={`/dashboard/laporan${query}`} className="text-[13px] font-semibold text-kos-700 hover:underline">
            Lihat semua
          </Link>
        </div>
        {terbaru.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada transaksi pemasukan pada periode ini.</p>
        ) : (
          <ul className="divide-y divide-field-line">
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
