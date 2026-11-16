import { Link, useParams } from 'react-router-dom';
import { DAFTAR_INFORMASI } from '../../data/informasi';
import PageHeader from '../../components/portal/PageHeader';
import { btnPrimary, btnOutline } from '../../components/portal/buttons';
import { ArrowLeftIcon, BookIcon, CalendarIcon, InfoCircleIcon } from '../../components/portal/icons';

export default function DetailInformasi() {
  const { slug } = useParams();
  const info = DAFTAR_INFORMASI.find((i) => i.slug === slug);

  if (!info) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-ink">Informasi tidak ditemukan</h2>
        <Link to="/dashboard/informasi" className={`${btnPrimary} mt-5`}>
          Kembali ke Pusat Informasi
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Pusat Informasi', to: '/dashboard/informasi' }, { label: info.judul }]}
        title={info.judul}
        action={
          <Link to="/dashboard/informasi" className={btnOutline}>
            <ArrowLeftIcon size={16} /> Kembali
          </Link>
        }
      />

      <article className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <h2 className="flex items-center gap-3 text-lg font-bold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-kos-100/60 text-kos-700">
              <BookIcon size={20} />
            </span>
            {info.judul}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink-soft">
            <CalendarIcon size={13} /> Diperbarui: {info.diperbarui}
          </span>
        </div>

        {info.bagian.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <InfoCircleIcon size={26} />
            </div>
            <p className="font-semibold text-ink">Informasi belum tersedia</p>
            <p className="mt-1 text-sm text-ink-soft">Pengurus belum mengisi bagian ini. Silakan hubungi pengurus kos.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {info.intro && <p className="text-[15px] leading-relaxed text-ink-soft">{info.intro}</p>}
            {info.bagian.map((b, i) => (
              <section key={b.judul} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kos-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-ink">{b.judul}</h3>
                  <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink-soft">
                    {b.paragraf.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
