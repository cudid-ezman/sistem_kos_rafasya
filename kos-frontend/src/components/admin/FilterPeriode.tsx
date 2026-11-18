import { geser, labelPeriode, namaSekarang, periodeMemuatHariIni, type ModePeriode } from '../../lib/periode';
import { ChevronLeftIcon, ChevronRightIcon } from '../portal/icons';

interface Props {
  mode: ModePeriode;
  anchor: Date;
  onChange: (mode: ModePeriode, anchor: Date) => void;
}

const OPSI: [ModePeriode, string][] = [
  ['semua', 'Semua'],
  ['minggu', 'Mingguan'],
  ['bulan', 'Bulanan'],
  ['tahun', 'Tahunan'],
];

const panah =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

export default function FilterPeriode({ mode, anchor, onChange }: Props) {
  const memuatHariIni = periodeMemuatHariIni(mode, anchor);

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <div role="tablist" aria-label="Rentang waktu pemasukan" className="inline-flex rounded-xl bg-slate-100 p-1 text-[13px] font-semibold">
        {OPSI.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => onChange(key, mode === 'semua' ? new Date() : anchor)}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 transition ${
              mode === key ? 'bg-white text-kos-700 shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode !== 'semua' && (
        <>
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1">
            <button type="button" aria-label="Periode sebelumnya" onClick={() => onChange(mode, geser(mode, anchor, -1))} className={panah}>
              <ChevronLeftIcon size={18} />
            </button>
            <span className="min-w-[150px] px-2 text-center text-sm font-semibold text-ink tabular-nums" aria-live="polite">
              {labelPeriode(mode, anchor)}
            </span>
            <button
              type="button"
              aria-label="Periode berikutnya"
              disabled={memuatHariIni}
              onClick={() => onChange(mode, geser(mode, anchor, 1))}
              className={panah}
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>

          {!memuatHariIni && (
            <button
              type="button"
              onClick={() => onChange(mode, new Date())}
              className="cursor-pointer text-[13px] font-semibold text-kos-700 hover:underline"
            >
              Kembali ke {namaSekarang[mode]}
            </button>
          )}
        </>
      )}
    </div>
  );
}
