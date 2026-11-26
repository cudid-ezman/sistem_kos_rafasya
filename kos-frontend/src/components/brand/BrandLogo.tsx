interface MarkProps {
  size?: number;
  className?: string;
  /** Warna atap; default terakota, pakai versi terang di latar gelap. */
  roof?: string;
}

/** Siluet 3 puncak atap terhubung (terakota) + badan rumah dengan jendela kembar. */
export function LogoMark({ size = 48, className = '', roof = 'var(--color-terracotta)' }: MarkProps) {
  return (
    <svg
      width={size}
      height={(size * 56) / 64}
      viewBox="0 0 64 56"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 27 16 12l8 8 8-12 8 12 8-8 11 15"
        stroke={roof}
        strokeWidth="4.5"
      />
      <g stroke="currentColor" strokeWidth="3.5">
        <path d="M11 27v21h42V27" />
        <rect x="18" y="32" width="10" height="10" rx="1.5" strokeWidth="2.5" />
        <rect x="36" y="32" width="10" height="10" rx="1.5" strokeWidth="2.5" />
        <path d="M23 32v10M18 37h10M41 32v10M36 37h10" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

interface LockupProps {
  /** onDark: untuk latar hitam gerbang. onLight: untuk latar terang. */
  tone?: 'onDark' | 'onLight';
  className?: string;
}

/** Horizontal lockup: logo mark + "KOST PUTRA" + wordmark Raffasya. */
export function BrandLockup({ tone = 'onLight', className = '' }: LockupProps) {
  const onDark = tone === 'onDark';
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark
        size={46}
        className={onDark ? 'text-cream' : 'text-kos-950'}
        roof={onDark ? 'var(--color-atap-terang)' : undefined}
      />
      <div className="flex flex-col leading-none">
        <span
          className={`flex items-center gap-2 font-subtitle text-[10px] font-semibold uppercase tracking-[0.25em] ${
            onDark ? 'text-white/80' : 'text-kos-600'
          }`}
        >
          <span className="h-px w-4 bg-current opacity-70" />
          Kost Putra
          <span className="h-px w-4 bg-current opacity-70" />
        </span>
        <span
          className={`mt-1.5 font-brand text-[28px] font-extrabold tracking-tight ${
            onDark ? 'text-white' : 'text-kos-950'
          }`}
        >
          <span className={onDark ? 'text-atap-terang' : 'text-terracotta'}>R</span>affasya
        </span>
      </div>
    </div>
  );
}

/** Nama merek untuk header/sidebar: "Raffasya" dengan huruf R terakota. */
export function BrandName({ className = '', accent = 'text-terracotta' }: { className?: string; accent?: string }) {
  return (
    <span className={`font-brand font-extrabold tracking-tight ${className}`}>
      <span className={accent}>R</span>affasya
    </span>
  );
}
