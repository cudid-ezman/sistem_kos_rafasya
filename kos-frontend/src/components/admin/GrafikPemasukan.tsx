import { rupiah } from '../../lib/format';
import { rpRingkas, type BatangGrafik } from '../../lib/periode';

interface Props {
  data: BatangGrafik[];
  judul: string;
}

export default function GrafikPemasukan({ data, judul }: Props) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const total = data.reduce((s, d) => s + d.nilai, 0);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-soft">Belum ada data pemasukan untuk digambar.</p>;
  }

  return (
    <figure aria-label={`${judul}. Total ${rupiah(total)}`} className="m-0">
      <div className="overflow-x-auto print:overflow-visible">
        <div className="flex h-52 items-stretch gap-2" style={{ minWidth: data.length * 42 }}>
          {data.map((d) => (
            <div
              key={`${d.sub}-${d.label}`}
              title={`${d.sub}: ${rupiah(d.nilai)}`}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span className="h-4 text-[10px] font-semibold text-ink-soft tabular-nums">{d.nilai > 0 ? rpRingkas(d.nilai) : ''}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.nilai > 0 ? 'hatch bg-kos-600 group-hover:bg-kos-700' : 'bg-slate-200'
                  }`}
                  style={{ height: d.nilai > 0 ? `${Math.max(4, (d.nilai / maks) * 100)}%` : 2 }}
                />
              </div>
              <span className="h-4 text-[11px] whitespace-nowrap text-ink-soft">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
