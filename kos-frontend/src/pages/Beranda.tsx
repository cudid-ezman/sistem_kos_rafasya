import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types/auth';
import type { BuktiPembayaran, Kamar, Keluhan, Tagihan } from '../types/kos';
import { kamarService } from '../services/kamarService';
import { tagihanService } from '../services/tagihanService';
import { keluhanService } from '../services/keluhanService';
import { rupiah, statusTampil, tglAngka, tglPendek, totalTagihan } from '../lib/format';
import StatusPill from '../components/portal/StatusPill';
import { Skeleton } from '../components/portal/Skeleton';
import { btnPrimary } from '../components/portal/buttons';
import {
  DeretanKamar,
  Hero,
  IkonKotak,
  StatCard,
  heroBtn,
  panelCls,
  panelHeadCls,
  panelTitleCls,
} from '../components/admin/DashboardParts';
import BerandaPemilik from './pemilik/BerandaPemilik';
import {
  CheckCircleIcon,
  DoorIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldCheckIcon,
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
        <Skeleton className="h-64" />
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
  const ringkasanHari = `${ringkas.antrean.length} bukti menunggu diperiksa, ${ringkas.keluhanAktif.length} keluhan belum selesai.`;
  const perluDitagih = [...ringkas.tunggakan]
    .sort((x, y) => x.jatuh_tempo.localeCompare(y.jatuh_tempo))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <Hero
        nama={nama}
        role="Pengurus"
        ringkasan={ringkasanHari}
        bawah={ringkas.total > 0 ? <DeretanKamar kamar={kamar} /> : undefined}
      >
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
          label="Kamar kosong"
          value={ringkas.tersedia}
          hint={`dari ${ringkas.total} kamar, ${Math.round(ringkas.okupansi)}% terisi`}
          icon={<DoorIcon size={20} />}
          tone="emerald"
        />
        <StatCard
          to="/dashboard/tagihan"
          label="Tagihan belum lunas"
          value={ringkas.tunggakan.length}
          hint={
            ringkas.terlambat.length > 0
              ? `${rupiah(ringkas.totalTunggakan)}, ${ringkas.terlambat.length} terlambat`
              : rupiah(ringkas.totalTunggakan)
          }
          icon={<ReceiptIcon size={20} />}
          tone="rose"
        />
        <StatCard
          to="/dashboard/verifikasi"
          label="Antrean verifikasi"
          value={ringkas.antrean.length}
          hint="Bukti menunggu diperiksa"
          icon={<ShieldCheckIcon size={20} />}
          tone="sky"
        />
        <StatCard
          to="/dashboard/keluhan"
          label="Keluhan belum selesai"
          value={ringkas.keluhanAktif.length}
          hint="Perlu ditindaklanjuti"
          icon={<WarningIcon size={20} />}
          tone="kos"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panelCls}>
          <div className={panelHeadCls}>
            <h3 className={panelTitleCls}>Perlu ditagih</h3>
            <Link to="/dashboard/tagihan" className="text-[13px] font-semibold text-kos-700 hover:underline">
              Semua tagihan
            </Link>
          </div>
          {perluDitagih.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircleIcon size={30} className="mx-auto text-kos-600" />
              <p className="mt-2 text-sm font-semibold text-ink">Semua tagihan sudah lunas</p>
              <p className="text-xs text-ink-soft">Tidak ada penghuni yang menunggak.</p>
            </div>
          ) : (
            <ul className="divide-y divide-field-line">
              {perluDitagih.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-6 py-3.5">
                  <IkonKotak tone="rose">
                    <ReceiptIcon size={19} />
                  </IkonKotak>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {t.nama_penghuni || t.penghuni?.nama_lengkap || '-'}
                    </p>
                    <p className="text-xs text-ink-soft">
                      Kamar {t.nomor_kamar || t.penghuni?.kamar?.nomor_kamar || '-'} • Jatuh tempo {tglPendek(t.jatuh_tempo)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-ink tabular-nums">{rupiah(totalTagihan(t))}</p>
                    <StatusPill status={statusTampil(t)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={panelCls}>
          <div className={panelHeadCls}>
            <h3 className={panelTitleCls}>Antrean verifikasi</h3>
            <Link to="/dashboard/verifikasi" className="text-[13px] font-semibold text-kos-700 hover:underline">
              Buka antrean
            </Link>
          </div>
          {ringkas.antrean.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircleIcon size={30} className="mx-auto text-kos-600" />
              <p className="mt-2 text-sm font-semibold text-ink">Antrean kosong</p>
              <p className="text-xs text-ink-soft">Semua bukti pembayaran sudah diperiksa.</p>
            </div>
          ) : (
            <ul className="divide-y divide-field-line">
              {ringkas.antrean.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-6 py-3.5">
                  <IkonKotak tone="sky">
                    <ShieldCheckIcon size={19} />
                  </IkonKotak>
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

      <section className={panelCls}>
        <div className={panelHeadCls}>
          <h3 className={panelTitleCls}>Keluhan terbaru</h3>
          <Link to="/dashboard/keluhan" className={`${btnPrimary} h-9 text-[13px]`}>
            Kelola keluhan
          </Link>
        </div>
        {ringkas.keluhanAktif.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Tidak ada keluhan yang perlu ditangani.</p>
        ) : (
          <ul className="divide-y divide-field-line">
            {ringkas.keluhanAktif.slice(0, 5).map((k) => (
              <li key={k.id} className="flex items-center gap-4 px-6 py-3.5">
                <IkonKotak tone="kos">
                  <WarningIcon size={19} />
                </IkonKotak>
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
