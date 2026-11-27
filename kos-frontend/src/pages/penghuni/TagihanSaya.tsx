import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Tagihan } from '../../types/kos';
import { hariSelisih, hitungDenda, parseTanggal, rupiah, sudahTerbitH7, tanggalTerbitH7, tglPendek, totalTagihan } from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import { Atap, panelCls } from '../../components/admin/DashboardParts';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import {
  CheckCircleIcon,
  InfoCircleIcon,
  ReceiptIcon,
  UploadCloudIcon,
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
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-field-line bg-field p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <WarningIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Data tagihan belum bisa dimuat</h2>
        <p className="mt-1.5 text-sm text-ink-soft">Periksa koneksimu atau pastikan server menyala, lalu coba lagi.</p>
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
        subtitle="Kelola riwayat tagihan sewa kamar kos dan konfirmasi status pembayaranmu secara berkala."
      />

      {/* Ringkasan */}
      <section className={panelCls} aria-label="Ringkasan tagihan">
        <Atap />
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          <div className="bg-cream p-6 lg:p-8">
            <p className="text-sm font-medium text-gerbang/70">Total yang harus dibayar</p>
            {harusBayar.length > 0 ? (
              <>
                <p className="mt-2 font-display text-5xl font-extrabold tracking-tight text-gerbang tabular-nums">{rupiah(total)}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {terdekat && (
                    <Link to={`/dashboard/tagihan-saya/${terdekat.id}/upload`} className={btnPrimary}>
                      Bayar sekarang
                    </Link>
                  )}
                  {ditolak > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-terracotta px-2.5 py-1.5 text-xs font-semibold text-white">
                      {ditolak} bukti ditolak, upload ulang
                    </span>
                  )}
                  {adaDenda && <span className="text-[13px] text-gerbang/75">Sudah termasuk denda keterlambatan</span>}
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <CheckCircleIcon size={38} className="shrink-0 text-kos-600" />
                <div>
                  <p className="font-display text-2xl font-extrabold text-gerbang">Semua tagihan beres</p>
                  <p className="mt-0.5 text-sm text-gerbang/75">Tidak ada pembayaran yang perlu dilakukan saat ini.</p>
                </div>
              </div>
            )}
          </div>

          <dl className="divide-y divide-field-line border-t border-field-line lg:border-l lg:border-t-0">
            <div className="p-6">
              <dt className="text-sm text-ink-soft">Jatuh tempo berikutnya</dt>
              <dd className={`mt-1 font-display text-2xl font-bold ${terlambatHari > 0 ? 'text-rose-700' : 'text-ink'}`}>
                {terdekat ? tglPendek(terdekat.jatuh_tempo) : '—'}
              </dd>
              <dd className="mt-1 text-[13px] font-medium">
                {terdekat ? (
                  terlambatHari > 0 ? (
                    <span className="text-orange-700">Terlambat {terlambatHari} hari</span>
                  ) : (
                    <span className="text-emerald-700">{sisaHari === 0 ? 'Jatuh tempo hari ini' : `${sisaHari} hari lagi`}</span>
                  )
                ) : (
                  <span className="text-emerald-700">Tidak ada tenggat</span>
                )}
              </dd>
            </div>
            <div className="p-6">
              <dt className="text-sm text-ink-soft">Pembayaran terakhir yang terverifikasi</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-ink">{terakhirLunas ? rupiah(terakhirLunas.nominal) : '—'}</dd>
              <dd className="mt-1 text-[13px] text-ink-soft capitalize">
                {terakhirLunas ? `Periode ${terakhirLunas.periode}` : 'Belum ada pembayaran'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Daftar */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-field-line bg-field" aria-label="Daftar tagihan">
        <div className="flex flex-col gap-3 border-b border-field-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ReceiptIcon size={19} className="text-kos-600" /> Daftar Tagihan &amp; Status
          </h2>
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-[13px] font-semibold" role="tablist">
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
                  filter === key ? 'bg-field text-kos-700' : 'text-ink-soft hover:text-ink'
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
            <p className="mt-1 text-sm text-ink-soft">Tagihan baru akan muncul di sini sesuai tanggal jatuh tempomu.</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2fr_1.1fr_1.1fr_1.3fr_auto] gap-4 px-6 py-2.5 text-[11px] font-semibold text-ink-soft md:grid">
              <span>Periode</span>
              <span>Nominal</span>
              <span>Jatuh tempo</span>
              <span>Status</span>
              <span className="w-[212px] text-right">Aksi</span>
            </div>
            <ul className="divide-y divide-field-line">
              {tampil.map((t) => (
                <BarisTagihan key={t.id} t={t} />
              ))}
            </ul>
          </>
        )}
      </section>

      {tagihanMendatang.length > 0 && (
        <div className="mt-4 rounded-2xl border border-field-line bg-white/80 p-4">
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
            <ul className="mt-3 divide-y divide-field-line border-t border-field-line pt-2">
              {tagihanMendatang.map((t) => (
                <BarisTagihan key={t.id} t={t} />
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/60 px-4 py-3 text-[13px] text-ink-soft">
        <InfoCircleIcon size={16} className="text-kos-600" />
        Tagihan bulanan otomatis aktif mulai 7 hari (H-7) sebelum tanggal jatuh tempomu.
      </p>
    </div>
  );
}

function BarisTagihan({ t }: { t: Tagihan }) {
  const { denda } = hitungDenda(t);
  const bisaBayar = PERLU_BAYAR.includes(t.status);
  return (
    <li className="grid gap-3 px-5 py-4 transition hover:bg-cream/40 md:grid-cols-[2fr_1.1fr_1.1fr_1.3fr_auto] md:items-center md:gap-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TILE[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
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
