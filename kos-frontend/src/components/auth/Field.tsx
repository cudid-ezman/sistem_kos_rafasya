import { useId, useState, type ReactNode } from 'react';
import { AlertCircleIcon, AlertTriangleIcon, EyeIcon, EyeOffIcon, InfoIcon } from './icons';

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
  required?: boolean;
  hint?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric';
  /** Tampilkan ikon info di samping hint */
  hintIcon?: boolean;
  /** Hint dengan ikon custom (mis. centang pada aturan kata sandi) */
  hintLeading?: ReactNode;
}

export default function Field({
  label,
  value,
  onChange,
  icon,
  placeholder,
  type = 'text',
  required,
  hint,
  invalid,
  disabled,
  autoComplete,
  inputMode,
  hintIcon = true,
  hintLeading,
}: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">
          {icon}
        </span>
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={invalid || undefined}
          className={`h-11 w-full rounded-xl border bg-white pl-11 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
            isPassword ? (invalid ? 'pr-20' : 'pr-11') : invalid ? 'pr-11' : 'pr-4'
          } ${
            invalid
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
              : 'border-field-line focus:border-kos-600 focus:ring-kos-600/20'
          }`}
        />
        {invalid && (
          <span
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-red-600 ${
              isPassword ? 'right-11' : 'right-3.5'
            }`}
          >
            <AlertTriangleIcon size={16} />
          </span>
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {hint && (
        <p
          className={`mt-1.5 flex items-start gap-1.5 text-xs leading-snug ${
            invalid ? 'text-red-600' : 'text-ink-soft'
          }`}
        >
          {hintLeading ??
            (hintIcon &&
              (invalid ? (
                <AlertCircleIcon size={13} className="mt-px shrink-0" />
              ) : (
                <InfoIcon size={13} className="mt-px shrink-0 text-kos-600" />
              )))}
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
