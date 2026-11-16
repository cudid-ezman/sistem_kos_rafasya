import { Link } from 'react-router-dom';
import { DAFTAR_INFORMASI } from '../../data/informasi';
import PageHeader from '../../components/portal/PageHeader';
import { ArrowRightIcon, BookIcon, CalendarIcon, ClockIcon, WifiIcon } from '../../components/portal/icons';

const IKON: Record<string, typeof BookIcon> = {
  'aturan-kos': BookIcon,
  'jadwal-gerbang': ClockIcon,
  wifi: WifiIcon,
};

export default function PusatInformasi() {
  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Beranda' }, { label: 'Pusat Informasi' }]}
        title="Pusat Informasi"
        subtitle="Pilih salah satu kategori untuk membaca informasi terbaru."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {DAFTAR_INFORMASI.map((info) => {
          const Ikon = IKON[info.slug] ?? BookIcon;
          return (
            <Link
              key={info.slug}
              to={`/dashboard/informasi/${info.slug}`}
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-kos-500/40 hover:shadow-xl hover:shadow-kos-950/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-kos-100/60 text-kos-700 transition group-hover:bg-kos-600 group-hover:text-white">
                <Ikon size={26} />
              </span>
              <h2 className="mt-5 text-xl font-bold leading-snug text-ink">{info.judul}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{info.ringkas}</p>
              <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-ink-soft">
                <CalendarIcon size={13} /> Diperbarui {info.diperbarui}
              </span>
              <span className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-kos-600 text-sm font-semibold text-kos-700 transition group-hover:bg-kos-600 group-hover:text-white">
                Buka <ArrowRightIcon size={16} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
