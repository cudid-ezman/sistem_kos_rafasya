import type { ReactNode } from 'react';
import { AlertCircleIcon, CheckCircleFillIcon, CloseIcon } from './icons';

interface AlertProps {
  variant: 'error' | 'success';
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}

const styles = {
  error: 'border-red-200 bg-red-100/80 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-kos-950',
};

export default function Alert({ variant, title, children, onClose }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-xs ${styles[variant]}`}
    >
      <span className="mt-0.5 shrink-0">
        {variant === 'error' ? <AlertCircleIcon size={18} /> : <CheckCircleFillIcon size={18} />}
      </span>
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pesan"
          className="mt-0.5 shrink-0 cursor-pointer opacity-70 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
