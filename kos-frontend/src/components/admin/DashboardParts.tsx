import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Pita atap seng merah bata, penanda visual khas Kost Raffasya. */
export function Atap({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-3.5 bg-terracotta ${className}`}
      style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(0 0 0 / .18) 0 2px, transparent 2px 12px)' }}
    />
  );
}

/** Panel dasar untuk blok konten di beranda. */
export const panelCls = 'overflow-hidden rounded-2xl border border-field-line bg-field';
export const panelHeadCls = 'flex items-center justify-between border-b border-field-line px-6 py-4';
export const panelTitleCls = 'font-display text-lg font-bold text-ink';

const TONE_CHIP = {
  emerald: 'bg-kos-100 text-kos-700',
  kos: 'bg-gerbang text-cream',
  sky: 'bg-cream text-gerbang',
  amber: 'bg-terracotta/10 text-terracotta',
  rose: 'bg-terracotta/10 text-terracotta',
} as const;

export type Tone = keyof typeof TONE_CHIP;

/** Kotak ikon kecil berwarna, dipakai di kartu statistik dan daftar. */
export function IkonKotak({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONE_CHIP[tone]}`}>
      {children}
    </span>
  );
}

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
  tone: Tone;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-2xl border border-field-line bg-field p-5 transition hover:border-kos-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-2.5 text-sm font-medium leading-snug text-ink-soft">{label}</p>
        <IkonKotak tone={tone}>{icon}</IkonKotak>
      </div>
      <div>
        <p className="font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>}
      </div>
    </Link>
  );
}

export function Ring({ persen, label }: { persen: number; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="var(--color-cream)"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="var(--color-kos-600)"
            strokeWidth="3"
            strokeDasharray={`${persen}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-kos-950">{Math.round(persen)}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

/**
 * Hero meniru fasad kos: atap seng merah bata, dinding krem, lalu cat hijau di bagian bawah.
 * `bawah` mengisi bagian hijau (mis. deretan kamar); `children` adalah tombol aksi.
 */
export function Hero({
  nama,
  role,
  ringkasan,
  bawah,
  children,
}: {
  nama: string;
  role: string;
  ringkasan?: string;
  bawah?: ReactNode;
  children?: ReactNode;
}) {
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="overflow-hidden rounded-2xl border border-gerbang/15">
      <Atap />
      <div className="bg-cream px-6 py-6 lg:px-8 lg:py-7">
        <p className="text-sm font-medium text-gerbang/65">{tanggal}</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-gerbang lg:text-4xl">Halo, {nama}</h2>
        <p className="mt-1.5 max-w-xl text-[15px] text-gerbang/75">
          {ringkasan ?? `Ini ringkasan untuk ${role.toLowerCase()} hari ini.`}
        </p>
      </div>
      {(bawah || children) && (
        <div className="bg-kos-700 px-6 py-5 text-white lg:px-8">
          {bawah}
          {children && <div className={`flex flex-wrap gap-3 ${bawah ? 'mt-5' : ''}`}>{children}</div>}
        </div>
      )}
    </section>
  );
}

export const heroBtn =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/25 border border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** Deretan kamar seperti pintu-pintu di bangunan: terisi berwarna krem, kosong hanya garis. */
export function DeretanKamar({ kamar }: { kamar: { id: number; nomor_kamar: string; status: string }[] }) {
  const terisi = kamar.filter((k) => k.status === 'terisi').length;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-xl font-bold">
          {terisi} dari {kamar.length} kamar terisi
        </p>
        <p className="flex items-center gap-4 text-[13px] text-white/80">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] bg-cream" /> Terisi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] border border-white/70" /> Kosong
          </span>
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Status tiap kamar">
        {kamar.map((k) => (
          <li
            key={k.id}
            title={`Kamar ${k.nomor_kamar}: ${k.status === 'terisi' ? 'terisi' : 'kosong'}`}
            className={`flex h-9 min-w-9 items-center justify-center rounded-md px-1.5 text-[13px] font-bold tabular-nums ${
              k.status === 'terisi' ? 'bg-cream text-gerbang' : 'border border-white/60 text-white'
            }`}
          >
            {k.nomor_kamar}
          </li>
        ))}
      </ul>
    </div>
  );
}
