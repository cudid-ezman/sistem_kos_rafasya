import { useEffect, useMemo, useState } from 'react';
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
import { Hero, Ring, StatCard, heroBtn } from '../components/admin/DashboardParts';
import BerandaPemilik from './pemilik/BerandaPemilik';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DoorIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarningIcon,
} from '../components/portal/icons';

interface Props {
  user: UserProfile;
}

function BerandaPengurus({ nama }: { nama: string }) {

  const [kamar, setKamar] = useState<Kamar[]>([]);
  const [bukti, setBukti] = useState<BuktiPembayaran[]>([]);
  const [keluhan, setKeluhan] = useState<Keluhan[]>([]);
  const [tagihan, setTagihan] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
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
      } catch (e) {
        console.error('Gagal memuat ringkasan beranda', e);
      } finally {
        if (!batal) setLoading(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

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

export default function Beranda({ user }: Props) {
  const nama = user.nama_lengkap || user.username;
  if ((user.role || '').toLowerCase() === 'pemilik') return <BerandaPemilik nama={nama} />;
  return <BerandaPengurus nama={nama} />;
}
