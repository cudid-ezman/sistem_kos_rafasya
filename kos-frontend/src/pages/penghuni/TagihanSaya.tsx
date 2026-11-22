import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Tagihan } from '../../types/kos';
import { hariSelisih, hitungDenda, parseTanggal, rupiah, sudahTerbitH7, tanggalTerbitH7, tglPendek, totalTagihan } from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import {
  CalendarIcon,
  CheckCircleIcon,
  InfoCircleIcon,
  ReceiptIcon,
  UploadCloudIcon,
  WalletIcon,
  WarningIcon,
} from '../../components/portal/icons';

const PERLU_BAYAR = ['belum_dibayar', 'ditolak', 'terlambat'];

const TILE: Record<string, string> = {
  lunas: 'bg-emerald-50 text-emerald-600',
  ditolak: 'bg-rose-50 text-rose-600',
  terlambat: 'bg-orange-50 text-orange-600',
  belum_dibayar: 'bg-amber-50 text-amber-600',
  menunggu_verifikasi: 'bg-sky-50 text-sky-600',
};

type Filter = 'semua' | 'perlu' | 'lunas';

export default function TagihanSaya() {
  const { tagihan, loading, error, reload } = usePortal();
  const [filter, setFilter] = useState<Filter>('semua');
  const [lihatMendatang, setLihatMendatang] = useState(false);

  const { tagihanTerbit, tagihanMendatang } = useMemo(() => {
    const terlamaId = [...tagihan].sort((a, b) => a.id - b.id)[0]?.id;
    const terbit: Tagihan[] = [];
    const mendatang: Tagihan[] = [];
    tagihan.forEach((t) => {
      if (sudahTerbitH7(t, tagihan.length === 1 && t.id === terlamaId)) {
        terbit.push(t);
      } else {
        mendatang.push(t);
      }
    });
    return {
      tagihanTerbit: terbit.sort((a, b) => parseTanggal(b.jatuh_tempo).getTime() - parseTanggal(a.jatuh_tempo).getTime()),
      tagihanMendatang: mendatang.sort((a, b) => parseTanggal(a.jatuh_tempo).getTime() - parseTanggal(b.jatuh_tempo).getTime()),
    };
  }, [tagihan]);

  const ringkasan = useMemo(() => {
    const harusBayar = tagihanTerbit.filter((t) => PERLU_BAYAR.includes(t.status));
    const total = harusBayar.reduce((sum, t) => sum + totalTagihan(t), 0);
    const ditolak = tagihanTerbit.filter((t) => t.status === 'ditolak').length;
    const adaDenda = harusBayar.some((t) => hitungDenda(t).denda > 0);
    const terdekat = [...harusBayar].sort(
      (a, b) => parseTanggal(a.jatuh_tempo).getTime() - parseTanggal(b.jatuh_tempo).getTime()
    )[0];
    const terakhirLunas = [...tagihanTerbit].filter((t) => t.status === 'lunas').sort((a, b) => b.id - a.id)[0];
    return { harusBayar, total, ditolak, adaDenda, terdekat, terakhirLunas };
  }, [tagihanTerbit]);

  const tampil = tagihanTerbit.filter((t) =>
    filter === 'semua' ? true : filter === 'lunas' ? t.status === 'lunas' : PERLU_BAYAR.includes(t.status)
  );

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <WarningIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Data tagihan belum bisa dimuat</h2>
        <p className="mt-1.5 text-sm text-ink-soft">Periksa koneksi Anda atau pastikan server menyala, lalu coba lagi.</p>
        <button type="button" onClick={() => void reload()} className={`${btnPrimary} mt-5`}>
          Coba lagi
        </button>
      </div>
    );
  }

  const { harusBayar, total, ditolak, adaDenda, terdekat, terakhirLunas } = ringkasan;
  const terlambatHari = terdekat ? hitungDenda(terdekat).hari : 0;
  const sisaHari = terdekat ? hariSelisih(new Date(), parseTanggal(terdekat.jatuh_tempo)) : 0;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Beranda' }, { label: 'Tagihan Saya' }]}
        title="Tagihan Saya"
        subtitle="Kelola riwayat tagihan sewa kamar kos dan konfirmasi status pembayaran Anda secara berkala."
      />

      {/* Ringkasan */}
      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr_1fr]" aria-label="Ringkasan tagihan">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kos-950 via-kos-900 to-kos-600 p-6 text-white shadow-lg shadow-kos-950/20">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-8 h-52 w-52 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-kos-400/10 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <p className="text-sm font-medium text-white/80">Total yang harus dibayar</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <WalletIcon size={20} />
            </span>
          </div>

          {harusBayar.length > 0 ? (
            <>
              <p className="relative mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-[40px]">{rupiah(total)}</p>
              <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4 text-xs">
                {ditolak > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-2.5 py-1 font-semibold text-rose-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                    {ditolak} tagihan ditolak
                  </span>
                )}
                {adaDenda && <span className="text-white/75">Termasuk denda keterlambatan</span>}
                {terdekat && (
                  <Link
                    to={`/dashboard/tagihan-saya/${terdekat.id}/upload`}
                    className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-kos-950 transition hover:bg-kos-100"
                  >
                    Bayar sekarang
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="relative mt-3 flex items-center gap-3">
              <CheckCircleIcon size={34} className="text-kos-400" />
              <div>
                <p className="text-2xl font-bold">Semua tagihan beres</p>
                <p className="mt-0.5 text-sm text-white/75">Tidak ada pembayaran yang perlu dilakukan saat ini.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-ink-soft">Jatuh Tempo</p>
              <p className={`mt-1 text-xl font-bold ${terlambatHari > 0 ? 'text-rose-600' : 'text-ink'}`}>
                {terdekat ? tglPendek(terdekat.jatuh_tempo) : '—'}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CalendarIcon size={20} />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-ink-soft">Tenggat</span>
            {terdekat ? (
              terlambatHari > 0 ? (
                <span className="flex items-center gap-1 font-semibold text-orange-700">
                  <WarningIcon size={14} /> Terlambat {terlambatHari} hari
                </span>
              ) : (
                <span className="font-semibold text-emerald-700">{sisaHari === 0 ? 'Hari ini' : `${sisaHari} hari lagi`}</span>
              )
            ) : (
              <span className="font-semibold text-emerald-700">Tidak ada tenggat</span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-ink-soft">Verifikasi Terakhir</p>
              <p className="mt-1 text-xl font-bold text-ink">{terakhirLunas ? rupiah(terakhirLunas.nominal) : '—'}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircleIcon size={20} />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="font-semibold text-emerald-700">{terakhirLunas ? 'Terverifikasi' : 'Belum ada'}</span>
            {terakhirLunas && <span className="text-ink-soft">{terakhirLunas.periode} • Lunas</span>}
          </div>
        </div>
      </section>

      {/* Daftar */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white" aria-label="Daftar tagihan">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ReceiptIcon size={19} className="text-kos-600" /> Daftar Tagihan &amp; Status
          </h2>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-[13px] font-semibold" role="tablist">
            {(
              [
                ['semua', 'Semua'],
                ['perlu', 'Perlu dibayar'],
                ['lunas', 'Lunas'],
              ] as [Filter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                  filter === key ? 'bg-white text-kos-700 shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tampil.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ReceiptIcon size={26} />
            </div>
            <p className="font-semibold text-ink">
              {tagihan.length === 0 ? 'Belum ada tagihan' : 'Tidak ada tagihan di kategori ini'}
            </p>
            <p className="mt-1 text-sm text-ink-soft">Tagihan baru akan muncul di sini sesuai tanggal jatuh tempo Anda.</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2fr_1.1fr_1.1fr_1.3fr_auto] gap-4 px-6 py-2.5 text-[11px] font-semibold tracking-wide text-ink-soft uppercase md:grid">
              <span>Periode</span>
              <span>Nominal</span>
              <span>Jatuh tempo</span>
              <span>Status</span>
              <span className="w-[212px] text-right">Aksi</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {tampil.map((t) => (
                <BarisTagihan key={t.id} t={t} />
              ))}
            </ul>
          </>
        )}
      </section>

      {tagihanMendatang.length > 0 && (
        <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-ink-soft">
              <InfoCircleIcon size={15} className="shrink-0 text-kos-600" />
              <span>
                Terdapat <strong>{tagihanMendatang.length} tagihan periode berikutnya</strong> yang otomatis terbit aktif mulai H-7 sebelum jatuh tempo (
                {tglPendek(tanggalTerbitH7(tagihanMendatang[0].jatuh_tempo))}).
              </span>
            </p>
            <button
              type="button"
              onClick={() => setLihatMendatang((v) => !v)}
              className="cursor-pointer text-xs font-semibold text-kos-700 hover:underline"
            >
              {lihatMendatang ? 'Sembunyikan' : 'Bayar lebih awal'}
            </button>
          </div>
          {lihatMendatang && (
            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-2">
              {tagihanMendatang.map((t) => (
                <BarisTagihan key={t.id} t={t} />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-4 py-3 text-[13px] text-ink-soft">
        <InfoCircleIcon size={16} className="text-kos-600" />
        Tagihan bulanan otomatis aktif mulai 7 hari (H-7) sebelum tanggal jatuh tempo Anda.
      </p>
    </div>
  );
}

function BarisTagihan({ t }: { t: Tagihan }) {
  const { denda } = hitungDenda(t);
  const bisaBayar = PERLU_BAYAR.includes(t.status);
  return (
    <li className="grid gap-3 px-5 py-4 transition hover:bg-slate-50/70 md:grid-cols-[2fr_1.1fr_1.1fr_1.3fr_auto] md:items-center md:gap-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TILE[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
          <ReceiptIcon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink capitalize">{t.periode}</p>
          <p className="text-xs text-ink-soft">Sewa Bulanan</p>
        </div>
        <div className="ml-auto md:hidden">
          <StatusPill status={t.status} />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2 md:block">
        <span className="text-xs text-ink-soft md:hidden">Nominal</span>
        <div>
          <p className="font-semibold text-ink tabular-nums">{rupiah(t.nominal)}</p>
          {denda > 0 && <p className="text-[11px] font-medium text-orange-600">+ denda {rupiah(denda)}</p>}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2 md:block">
        <span className="text-xs text-ink-soft md:hidden">Jatuh tempo</span>
        <span className="text-sm text-ink-soft">{tglPendek(t.jatuh_tempo)}</span>
      </div>

      <div className="hidden md:block">
        <StatusPill status={t.status} />
      </div>

      <div className="flex gap-2 md:w-[212px] md:justify-end">
        <Link to={`/dashboard/tagihan-saya/${t.id}`} className={`${btnOutline} flex-1 md:flex-none`}>
          Lihat Rincian
        </Link>
        {bisaBayar && (
          <Link to={`/dashboard/tagihan-saya/${t.id}/upload`} className={`${btnPrimary} flex-1 md:flex-none`}>
            <UploadCloudIcon size={16} /> Upload Bukti
          </Link>
        )}
      </div>
    </li>
  );
}
