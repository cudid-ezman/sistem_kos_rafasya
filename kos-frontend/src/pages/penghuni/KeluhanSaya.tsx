import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tglAngka } from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { ArrowRightIcon, PlusIcon, SparkleIcon, WarningIcon, WrenchIcon } from '../../components/portal/icons';

const PER_HALAMAN = 5;

export default function KeluhanSaya() {
  const { keluhan, loading, error, reload } = usePortal();
  const [halaman, setHalaman] = useState(1);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-field-line bg-field p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <WarningIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Data keluhan belum bisa dimuat</h2>
        <button type="button" onClick={() => void reload()} className={`${btnPrimary} mt-5`}>
          Coba lagi
        </button>
      </div>
    );
  }

  const total = keluhan.length;
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const aktif = Math.min(halaman, jumlahHalaman);
  const baris = keluhan.slice((aktif - 1) * PER_HALAMAN, aktif * PER_HALAMAN);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Beranda' }, { label: 'Keluhan' }]}
        title="Keluhan"
        subtitle="Pantau status keluhan fasilitas Anda."
        action={
          <Link to="/dashboard/keluhan-saya/baru" className={btnPrimary}>
            <PlusIcon size={17} /> Buat Keluhan
          </Link>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-field-line bg-field" aria-label="Daftar keluhan">
        <div className="flex items-center justify-between border-b border-field-line px-5 py-4">
          <h2 className="text-base font-bold text-ink">Daftar Keluhan &amp; Status</h2>
          <span className="rounded-md bg-cream px-2.5 py-1 text-xs font-semibold text-gerbang">Total {total} Laporan</span>
        </div>

        {total === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-kos-100/60 text-kos-600">
              <SparkleIcon size={30} />
            </div>
            <p className="text-lg font-bold text-ink">Belum ada keluhan</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
              Semua fasilitas kos dalam kondisi baik. Jika mengalami kendala teknis atau fasilitas, laporkan segera di sini.
            </p>
            <Link to="/dashboard/keluhan-saya/baru" className={`${btnPrimary} mt-6`}>
              <PlusIcon size={17} /> Buat Keluhan
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.1fr_2.2fr_1fr_1.2fr_auto] gap-4 px-6 py-2.5 text-[11px] font-semibold text-ink-soft md:grid">
              <span>Kategori</span>
              <span>Deskripsi</span>
              <span>Tanggal</span>
              <span>Status</span>
              <span className="w-[130px] text-right">Aksi</span>
            </div>
            <ul className="divide-y divide-field-line">
              {baris.map((k) => (
                <li
                  key={k.id}
                  className="grid gap-2 px-5 py-4 transition hover:bg-cream/40 md:grid-cols-[1.1fr_2.2fr_1fr_1.2fr_auto] md:items-center md:gap-4 md:px-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-gerbang">
                      <WrenchIcon size={18} />
                    </span>
                    <span className="font-semibold text-ink">{k.nama_kategori || 'Lainnya'}</span>
                    <span className="ml-auto md:hidden">
                      <StatusPill status={k.status} />
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink-soft">{k.deskripsi}</p>
                  <p className="text-sm text-ink-soft tabular-nums">{tglAngka(k.tanggal_kirim)}</p>
                  <div className="hidden md:block">
                    <StatusPill status={k.status} />
                  </div>
                  <div className="md:w-[130px] md:text-right">
                    <Link to={`/dashboard/keluhan-saya/${k.id}`} className={`${btnOutline} h-9 w-full md:w-auto`}>
                      Lihat Detail <ArrowRightIcon size={15} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-field-line px-5 py-3.5 text-xs text-ink-soft sm:flex-row">
              <span>
                Menampilkan {baris.length} dari {total} keluhan
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={aktif <= 1}
                  onClick={() => setHalaman(aktif - 1)}
                  className={`${btnOutline} h-9 text-xs`}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={aktif >= jumlahHalaman}
                  onClick={() => setHalaman(aktif + 1)}
                  className={`${btnOutline} h-9 text-xs`}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
