const STYLES: Record<string, { label: string; dot: string; box: string }> = {
  lunas: { label: 'Lunas', dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  selesai: { label: 'Selesai', dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  diproses: { label: 'Diproses', dot: 'bg-amber-500', box: 'bg-amber-50 text-amber-700 ring-amber-200' },
  belum_dibayar: { label: 'Belum Dibayar', dot: 'bg-amber-500', box: 'bg-amber-50 text-amber-700 ring-amber-200' },
  terlambat: { label: 'Terlambat', dot: 'bg-orange-500', box: 'bg-orange-50 text-orange-700 ring-orange-200' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', dot: 'bg-sky-500', box: 'bg-sky-50 text-sky-700 ring-sky-200' },
  diterima: { label: 'Diterima', dot: 'bg-sky-500', box: 'bg-sky-50 text-sky-700 ring-sky-200' },
  disetujui: { label: 'Disetujui', dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  tersedia: { label: 'Tersedia', dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  terisi: { label: 'Terisi', dot: 'bg-sky-500', box: 'bg-sky-50 text-sky-700 ring-sky-200' },
  aktif: { label: 'Aktif', dot: 'bg-emerald-500', box: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  nonaktif: { label: 'Nonaktif', dot: 'bg-slate-400', box: 'bg-slate-100 text-slate-600 ring-slate-200' },
  ditolak: { label: 'Ditolak', dot: 'bg-rose-500', box: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export default function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  const s = STYLES[status] ?? {
    label: status.replace(/_/g, ' '),
    dot: 'bg-slate-400',
    box: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.box} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
