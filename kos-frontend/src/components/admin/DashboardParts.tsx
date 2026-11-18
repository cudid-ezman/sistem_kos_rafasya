import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const TONE = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  kos: 'bg-kos-100/70 text-kos-700',
  rose: 'bg-rose-50 text-rose-600',
} as const;

export function StatCard({
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

export function Ring({ persen, label }: { persen: number; label: string }) {
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

export function Hero({ nama, role, children }: { nama: string; role: string; children?: ReactNode }) {
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

export const heroBtn =
  'inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/25';

export function IkonKotak({ tone, children }: { tone: keyof typeof TONE; children: ReactNode }) {
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>{children}</span>;
}
