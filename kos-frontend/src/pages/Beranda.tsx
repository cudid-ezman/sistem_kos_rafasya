import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types/auth';
import type { BuktiPembayaran, Kamar, Keluhan, Tagihan } from '../types/kos';
import { kamarService } from '../services/kamarService';
import { tagihanService } from '../services/tagihanService';
import { keluhanService } from '../services/keluhanService';
import { rupiah, statusTampil, tglAngka } from '../lib/format';
import StatusPill from '../components/portal/StatusPill';
import { Skeleton } from '../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../components/portal/buttons';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DoorIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UsersIcon,
  WarningIcon,
} from '../components/portal/icons';

interface Props {
  user: UserProfile;
}

const TONE = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  kos: 'bg-kos-100/70 text-kos-700',
  rose: 'bg-rose-50 text-rose-600',
} as const;

function StatCard({
  to,
  label,
  value,
  hint,
  icon,
  tone,
}: {
  to: string;
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone: keyof typeof TONE;
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-kos-500/40 hover:shadow-xl hover:shadow-kos-950/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-soft">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </Link>
  );
}

function Ring({ persen, label }: { persen: number; label: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="var(--color-kos-600)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, persen)) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink tabular-nums">{Math.round(persen)}%</span>
        <span className="text-[11px] text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

function Hero({ nama, role, children }: { nama: string; role: string; children?: ReactNode }) {
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kos-950 via-kos-900 to-kos-600 p-6 text-white shadow-lg shadow-kos-950/20 sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-2 -top-8 h-56 w-56 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-kos-400/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">{tanggal}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Selamat datang, {nama}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/75">
            Ringkasan operasional Kos Rafasya hari ini ({role}).
          </p>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </section>
  );
}

const heroBtn =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/25';

export default function Beranda({ user }: Props) {
  const role = (user.role || '').toLowerCase();
  const isPemilik = role === 'pemilik';
  const nama = user.nama_lengkap || user.username;

  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [bukti, setBukti] = useState<BuktiPembayaran[]>([]);
  const [keluhan, setKeluhan] = useState<Keluhan[]>([]);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [transaksi, setTransaksi] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        if (isPemilik) {
          const [lap, km] = await Promise.all([tagihanService.getLaporanKeuangan(), kamarService.getAllKamar()]);
          if (batal) return;
          setTotalPemasukan(lap.data.total_pemasukan || 0);
          setTransaksi(lap.data.transaksi || []);
          setKamar(km.data);
        } else {
          const [km, bk, kl, tg] = await Promise.all([
            kamarService.getAllKamar(),
            tagihanService.getBuktiPembayaran(),
            keluhanService.getAll(),
            tagihanService.getAll(),
          ]);
          if (batal) return;
          setKamar(km.data);
          setBukti(bk.data);
          setKeluhan(kl.data);
          setTagihan(tg.data);
        }
      } catch (e) {
        console.error('Gagal memuat ringkasan beranda', e);
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [isPemilik]);

  const ringkas = useMemo(() => {
    const terisi = kamar.filter((k) => k.status === 'terisi').length;
    const tersedia = kamar.filter((k) => k.status === 'tersedia').length;
    const total = kamar.length;
    const antrean = bukti.filter((b) => b.status === 'menunggu_verifikasi');
    const keluhanAktif = keluhan.filter((k) => k.status !== 'selesai');
    const tunggakan = tagihan.filter((t) => ['belum_dibayar', 'terlambat', 'ditolak'].includes(t.status));
    const terlambat = tunggakan.filter((t) => statusTampil(t) === 'terlambat');
    return {
      terisi,
      tersedia,
      total,
      okupansi: total ? (terisi / total) * 100 : 0,
      antrean,
      keluhanAktif,
      tunggakan,
      terlambat,
      totalTunggakan: tunggakan.reduce((s, t) => s + Number(t.nominal || 0), 0),
    };
  }, [kamar, bukti, keluhan, tagihan]);

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  /* ───────────── PEMILIK ───────────── */
  if (isPemilik) {
    return (
      <div className="space-y-5">
        <Hero nama={nama} role="Pemilik">
          <Link to="/dashboard/laporan" className={heroBtn}>
            Lihat laporan <ArrowRightIcon size={15} />
          </Link>
        </Hero>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <Link
            to="/dashboard/laporan"
            className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-kos-950/5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-ink-soft">Total Pemasukan Lunas</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE.emerald}`}>
                <TrendingUpIcon size={20} />
              </span>
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight text-emerald-600 tabular-nums">{rupiah(totalPemasukan)}</p>
            <p className="mt-2 text-xs text-ink-soft">Akumulasi pembayaran sewa yang sudah diverifikasi pengurus.</p>
          </Link>

          <div className="flex items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6">
            <Ring persen={ringkas.okupansi} label="terisi" />
            <div>
              <p className="text-sm text-ink-soft">Okupansi Kamar</p>
              <p className="mt-1 text-xl font-bold text-ink">
                {ringkas.terisi} / {ringkas.total}
              </p>
              <p className="text-xs text-ink-soft">kamar terisi</p>
            </div>
          </div>

          <StatCard
            label="Kamar Kosong"
            value={ringkas.tersedia}
            hint="Siap disewakan"
            icon={<DoorIcon size={20} />}
            tone="kos"
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-ink">Pemasukan Terbaru</h2>
            <Link to="/dashboard/laporan" className="text-[13px] font-semibold text-kos-700 hover:underline">
              Lihat semua
            </Link>
          </div>
          {transaksi.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada transaksi pemasukan yang tercatat.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transaksi.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE.emerald}`}>
                    <CheckCircleIcon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}</p>
                    <p className="text-xs text-ink-soft capitalize">
                      {t.periode} • Kamar {t.nomor_kamar || '-'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink tabular-nums">{rupiah(t.nominal)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  /* ───────────── PENGURUS ───────────── */
  return (
    <div className="space-y-5">
      <Hero nama={nama} role="Pengurus">
        <Link to="/dashboard/penghuni?tambah=1" className={heroBtn}>
          <PlusIcon size={16} /> Tambah penghuni
        </Link>
        <Link to="/dashboard/tagihan" className={heroBtn}>
          <ReceiptIcon size={16} /> Generate tagihan
        </Link>
      </Hero>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          to="/dashboard/kamar"
          label="Kamar Tersedia"
          value={ringkas.tersedia}
          hint={`dari ${ringkas.total} kamar`}
          icon={<DoorIcon size={20} />}
          tone="emerald"
        />
        <StatCard
          to="/dashboard/kamar?tab=denah"
          label="Kamar Terisi"
          value={ringkas.terisi}
          hint={`${Math.round(ringkas.okupansi)}% okupansi`}
          icon={<UsersIcon size={20} />}
          tone="kos"
        />
        <StatCard
          to="/dashboard/verifikasi"
          label="Antrean Verifikasi"
          value={ringkas.antrean.length}
          hint="Bukti menunggu diperiksa"
          icon={<ShieldCheckIcon size={20} />}
          tone="sky"
        />
        <StatCard
          to="/dashboard/keluhan"
          label="Keluhan Belum Selesai"
          value={ringkas.keluhanAktif.length}
          hint="Perlu ditindaklanjuti"
          icon={<WarningIcon size={20} />}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-ink">Okupansi &amp; Tunggakan</h2>
          <div className="mt-5 flex items-center gap-5">
            <Ring persen={ringkas.okupansi} label="terisi" />
            <div className="min-w-0">
              <p className="text-sm text-ink-soft">Total tunggakan</p>
              <p className="mt-0.5 text-2xl font-bold text-ink tabular-nums">{rupiah(ringkas.totalTunggakan)}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {ringkas.tunggakan.length} tagihan belum lunas
                {ringkas.terlambat.length > 0 && (
                  <span className="font-semibold text-orange-600"> • {ringkas.terlambat.length} terlambat</span>
                )}
              </p>
            </div>
          </div>
          <Link to="/dashboard/tagihan" className={`${btnOutline} mt-5 w-full`}>
            Lihat tagihan <ArrowRightIcon size={15} />
          </Link>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-ink">Antrean Verifikasi</h2>
            <Link to="/dashboard/verifikasi" className="text-[13px] font-semibold text-kos-700 hover:underline">
              Buka antrean
            </Link>
          </div>
          {ringkas.antrean.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircleIcon size={30} className="mx-auto text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-ink">Antrean kosong</p>
              <p className="text-xs text-ink-soft">Semua bukti pembayaran sudah diperiksa.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ringkas.antrean.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <ReceiptIcon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{b.nama_penghuni || '-'}</p>
                    <p className="text-xs text-ink-soft capitalize">
                      Kamar {b.nomor_kamar || '-'} • {b.periode_tagihan} • {tglAngka(b.tanggal_bayar)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink tabular-nums">{rupiah(b.nominal_tagihan)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-ink">Keluhan Terbaru</h2>
          <Link to="/dashboard/keluhan" className={`${btnPrimary} h-9 text-[13px]`}>
            Kelola keluhan
          </Link>
        </div>
        {ringkas.keluhanAktif.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Tidak ada keluhan yang perlu ditangani.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ringkas.keluhanAktif.slice(0, 5).map((k) => (
              <li key={k.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <WarningIcon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {k.nama_kategori || 'Umum'} • Kamar {k.nomor_kamar || '-'}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{k.deskripsi}</p>
                </div>
                <StatusPill status={k.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
