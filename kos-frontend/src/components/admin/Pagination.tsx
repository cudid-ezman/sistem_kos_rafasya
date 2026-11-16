import { btnOutline } from '../portal/buttons';

interface Props {
  total: number;
  page: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ total, page, perPage, onChange }: Props) {
  const jumlah = Math.max(1, Math.ceil(total / perPage));
  const aktif = Math.min(page, jumlah);
  const dari = total === 0 ? 0 : (aktif - 1) * perPage + 1;
  const sampai = Math.min(total, aktif * perPage);

  if (total <= perPage) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 text-xs text-ink-soft sm:flex-row">
      <span>
        Menampilkan {dari}–{sampai} dari {total}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={aktif <= 1} onClick={() => onChange(aktif - 1)} className={`${btnOutline} h-9 text-xs`}>
          Sebelumnya
        </button>
        <button type="button" disabled={aktif >= jumlah} onClick={() => onChange(aktif + 1)} className={`${btnOutline} h-9 text-xs`}>
          Selanjutnya
        </button>
      </div>
    </div>
  );
}
