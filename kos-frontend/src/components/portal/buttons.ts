/** Kelas tombol yang dipakai bersama di portal penghuni. */
const base =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${base} bg-kos-600 text-white shadow-sm shadow-kos-600/20 hover:bg-kos-700`;
export const btnOutline = `${base} border border-slate-200 bg-white text-ink hover:border-slate-300 hover:bg-slate-50`;
export const btnGhost = `${base} text-ink-soft hover:bg-slate-100 hover:text-ink`;
export const btnDanger = `${base} bg-rose-600 text-white hover:bg-rose-700`;
