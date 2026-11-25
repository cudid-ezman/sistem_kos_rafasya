import type { ReactNode } from 'react';
import { BrandLockup } from '../brand/BrandLogo';
import KosIllustration from './KosIllustration';

interface AuthLayoutProps {
  children: ReactNode;
  /** Lebar kartu form. Halaman daftar sedikit lebih lebar. */
  wide?: boolean;
  /** Tampilkan teks "Butuh bantuan?" di footer */
  showHelp?: boolean;
}

export default function AuthLayout({ children, wide = false, showHelp = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-page lg:flex">
      {/* Panel kiri */}
      <aside
        className="relative hidden overflow-hidden bg-kos-700 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[55%] lg:flex-col"
      >
        <span className="absolute bottom-4 left-3 top-8 w-[3px] rounded-full bg-kos-100/60" aria-hidden="true" />

        <div className="px-14 pt-10">
          <BrandLockup tone="onDark" />
        </div>

        <div className="mt-14 px-14">
          <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight">
            Sistem Manajemen &amp;
            <br />
            Administrasi Kos
          </h1>
          <p className="mt-5 max-w-sm text-[15px] text-white/80">
            Pantau kamar, penghuni, dan tagihan dalam satu tempat.
          </p>
        </div>

        <div className="mt-auto px-8 pb-8">
          <KosIllustration className="mx-auto w-full max-w-[600px]" />
        </div>
      </aside>

      {/* Panel kanan */}
      <main className="flex min-h-screen flex-1 flex-col items-center px-4 py-8 lg:py-6">
        <BrandLockup tone="onLight" className="mb-8 lg:hidden" />

        <div className="flex w-full flex-1 items-center justify-center">
          <div
            className={`w-full rounded-2xl border border-field-line bg-white p-8 sm:p-10 ${
              wide ? 'max-w-[520px]' : 'max-w-[460px]'
            }`}
          >
            {children}
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-ink-soft">
          {showHelp && <p className="mb-1">Butuh bantuan? Hubungi pengurus kos.</p>}
          <p>© 2026 Kost Putra Raffasya</p>
        </footer>
      </main>
    </div>
  );
}
