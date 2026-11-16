import { Link, useNavigate, useParams } from 'react-router-dom';
import { namaBerkas, tglWaktu } from '../../lib/format';
import { usePortal } from '../../components/portal/portalContext';
import PageHeader from '../../components/portal/PageHeader';
import StatusPill from '../../components/portal/StatusPill';
import { PageSkeleton } from '../../components/portal/Skeleton';
import { btnOutline, btnPrimary } from '../../components/portal/buttons';
import { ArrowLeftIcon, CheckIcon, FileImageIcon, WarningIcon, WrenchIcon } from '../../components/portal/icons';

const TAHAP = [
  { key: 'diterima', label: 'Diterima', desc: 'Keluhan sudah masuk ke pengurus.' },
  { key: 'diproses', label: 'Diproses', desc: 'Pengurus sedang menangani kendala.' },
  { key: 'selesai', label: 'Selesai', desc: 'Kendala sudah ditangani.' },
] as const;

export default function DetailKeluhan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, kamar, keluhan, loading } = usePortal();

  if (loading) return <PageSkeleton />;

  const k = keluhan.find((x) => String(x.id) === id);
  if (!k) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <WarningIcon size={26} />
        </div>
        <h2 className="text-lg font-bold text-ink">Keluhan tidak ditemukan</h2>
        <Link to="/dashboard/keluhan-saya" className={`${btnPrimary} mt-5`}>
          Kembali ke Keluhan
        </Link>
      </div>
    );
  }

  const idxSaatIni = TAHAP.findIndex((t) => t.key === k.status);
  const noKamar = k.nomor_kamar ?? kamar?.nomor;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Keluhan', to: '/dashboard/keluhan-saya' }, { label: 'Detail Keluhan' }]}
        title="Detail Keluhan"
        badge={<StatusPill status={k.status} />}
        subtitle="Pantau penanganan kendala fasilitas Anda."
        action={
          <button type="button" onClick={() => navigate('/dashboard/keluhan-saya')} className={btnOutline}>
            <ArrowLeftIcon size={16} /> Kembali
          </button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-ink">
            <WrenchIcon size={19} className="text-kos-600" /> Informasi Keluhan
          </h2>

          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Kategori</dt>
              <dd className="mt-1 font-semibold text-ink">{k.nama_kategori || 'Lainnya'}</dd>
            </div>
            <div className="hidden sm:block" />
            <div>
              <dt className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Pelapor</dt>
              <dd className="mt-1 font-semibold text-ink">{k.nama_penghuni || user.nama_lengkap || user.username}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Kamar</dt>
              <dd className="mt-1 font-semibold text-ink">{noKamar ? `Kamar ${noKamar}` : '-'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Deskripsi</dt>
              <dd className="mt-1 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-ink">{k.deskripsi}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wider text-ink-soft uppercase">Foto lampiran</dt>
              <dd className="mt-2">
                {k.foto ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    <a href={k.foto} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={k.foto} alt="Lampiran keluhan" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{namaBerkas(k.foto)}</p>
                      <p className="text-xs text-ink-soft">Lampiran bukti kendala fasilitas</p>
                    </div>
                    <a href={k.foto} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-kos-700 hover:underline">
                      Lihat
                    </a>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-ink-soft">
                    <FileImageIcon size={16} /> Tidak ada foto dilampirkan
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="mb-5 text-base font-bold text-ink">Riwayat Status</h2>
            <ol>
              {TAHAP.map((t, i) => {
                const selesai = i < idxSaatIni || (i === idxSaatIni && t.key === 'selesai');
                const saatIni = i === idxSaatIni;
                const terakhir = i === TAHAP.length - 1;
                return (
                  <li key={t.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {!terakhir && (
                      <span
                        className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < idxSaatIni ? 'bg-kos-600' : 'bg-slate-200'}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selesai
                          ? 'bg-kos-600 text-white'
                          : saatIni
                            ? 'bg-white text-kos-700 ring-2 ring-kos-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {selesai ? <CheckIcon size={16} /> : i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className={`flex items-center gap-2 text-sm font-semibold ${i <= idxSaatIni ? 'text-ink' : 'text-slate-400'}`}>
                        {t.label}
                        {saatIni && t.key !== 'selesai' && (
                          <span className="rounded-full bg-kos-100 px-2 py-0.5 text-[10px] font-bold text-kos-700">Saat Ini</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {i === 0 ? tglWaktu(k.tanggal_kirim) : t.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Catatan Tindak Lanjut</h2>
              <span className="rounded-full bg-kos-100/60 px-2.5 py-0.5 text-[11px] font-semibold text-kos-700">Pengurus</span>
            </div>
            {k.catatan_tindak_lanjut ? (
              <p className="rounded-2xl bg-kos-100/25 p-4 text-sm leading-relaxed text-ink">{k.catatan_tindak_lanjut}</p>
            ) : (
              <p className="text-sm italic text-ink-soft">Belum ada catatan dari pengurus.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
