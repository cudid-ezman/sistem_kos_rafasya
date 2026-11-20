import type { ReactNode } from 'react';

interface SubmitButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  iconFirst?: boolean;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: 'submit' | 'button';
  /** Warna tombol: primary (hijau) atau dark (hijau tua). */
  tone?: 'primary' | 'dark';
  onClick?: () => void;
}

export default function SubmitButton({
  children,
  icon,
  iconFirst = false,
  loading = false,
  loadingText = 'Memproses...',
  disabled = false,
  type = 'submit',
  tone = 'primary',
  onClick,
}: SubmitButtonProps) {
  const off = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      className={`flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${
        tone === 'dark' ? 'bg-kos-950 hover:bg-kos-900' : 'bg-kos-600 hover:bg-kos-700'
      }`}
    >
      {loading ? (
        loadingText
      ) : (
        <>
          {iconFirst && icon}
          {children}
          {!iconFirst && icon}
        </>
      )}
    </button>
  );
}
