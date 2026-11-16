import Modal from './Modal';
import { btnDanger, btnOutline, btnPrimary } from '../portal/buttons';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={btnOutline}>
          Batal
        </button>
        <button type="button" onClick={onConfirm} disabled={loading} className={tone === 'danger' ? btnDanger : btnPrimary}>
          {loading ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
