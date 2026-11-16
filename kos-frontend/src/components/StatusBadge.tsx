interface Props {
  status: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  // ── Status Tagihan ──
  lunas:                { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Lunas' },
  belum_dibayar:        { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Belum Bayar' },
  terlambat:            { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Terlambat' },
  menunggu_verifikasi:  { bg: 'bg-sky-100',     text: 'text-sky-700',     label: 'Menunggu Verifikasi' },
  ditolak:              { bg: 'bg-slate-100',   text: 'text-slate-700',   label: 'Ditolak' },
  
  // ── Status Kamar ──
  tersedia:             { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Tersedia' },
  terisi:               { bg: 'bg-sky-100',     text: 'text-sky-700',     label: 'Terisi' },
  maintenance:          { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Maintenance' },
  kosong:               { bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Kosong' },
  
  // ── Status Keluhan ──
  diterima:             { bg: 'bg-sky-100',     text: 'text-sky-700',     label: 'Diterima' },
  diproses:             { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Diproses' },
  selesai:              { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Selesai' },
};

export default function StatusBadge({ status }: Props) {
  // Normalisasi: ubah jadi huruf kecil dan ganti spasi dengan underscore
  // Contoh: "Belum Dibayar" -> "belum_dibayar"
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  
  const config = STATUS_CONFIG[normalizedStatus] ?? {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: status,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}