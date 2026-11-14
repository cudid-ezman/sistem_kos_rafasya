interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  lunas: { label: 'Lunas', className: 'bg-green-100 text-green-700' },
  diterima: { label: 'Diterima', className: 'bg-green-100 text-green-700' },
  selesai: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
  tersedia: { label: 'Tersedia', className: 'bg-green-100 text-green-700' },
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', className: 'bg-blue-100 text-blue-700' },
  diproses: { label: 'Diproses', className: 'bg-blue-100 text-blue-700' },
  belum_dibayar: { label: 'Belum Bayar', className: 'bg-yellow-100 text-yellow-800' },
  terisi: { label: 'Terisi', className: 'bg-slate-200 text-slate-700' },
  terlambat: { label: 'Terlambat', className: 'bg-orange-100 text-orange-700' },
  ditolak: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_STYLES[status] || {
    label: status.replace('_', ' '),
    className: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${config.className}`}>
      {config.label}
    </span>
  );
}