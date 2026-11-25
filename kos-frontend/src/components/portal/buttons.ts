/** Kelas tombol yang dipakai bersama di portal penghuni. */
const base =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${base} bg-kos-600 text-white hover:bg-kos-700`;
export const btnOutline = `${base} border border-slate-300 bg-transparent text-ink hover:border-gerbang hover:bg-white`;
export const btnGhost = `${base} text-ink-soft hover:bg-slate-100 hover:text-ink`;
export const btnDanger = `${base} bg-rose-600 text-white hover:bg-rose-700`;
