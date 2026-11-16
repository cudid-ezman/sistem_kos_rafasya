import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi } from './toastContext';
import { CheckCircleIcon, WarningIcon, XIcon } from './icons';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastItem['kind'], message: string) => {
      const id = nextId.current++;
      setItems((cur) => [...cur, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-lg shadow-slate-900/10 motion-safe:animate-[toast-in_.25s_ease-out] ${
              t.kind === 'error' ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${t.kind === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {t.kind === 'error' ? <WarningIcon size={18} /> : <CheckCircleIcon size={18} />}
            </span>
            <p className="flex-1 leading-snug text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Tutup"
              className="shrink-0 cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <XIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
