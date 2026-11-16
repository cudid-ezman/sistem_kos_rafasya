import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  /** Lebar kartu form. Halaman daftar sedikit lebih lebar. */
  wide?: boolean;
  /** Tampilkan teks "Butuh bantuan?" di footer */
  showHelp?: boolean;
}

function Brand({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kos-100 text-xl font-bold text-kos-950">
        R
      </div>
      <span className="text-lg font-semibold">Kos Rafasya</span>
    </div>
  );
}

export default function AuthLayout({ children, wide = false, showHelp = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-page p-0 lg:flex lg:gap-6 lg:p-6">
      {/* Panel kiri */}
      <aside className="relative hidden min-h-[calc(100vh-3rem)] w-[38%] max-w-[560px] shrink-0 overflow-hidden rounded-[28px] border-l-[6px] border-kos-400 bg-kos-950 p-10 text-white lg:block">
        <Brand className="text-white" />

        <div className="mt-[150px]">
          <h1 className="text-[34px] font-semibold leading-[1.2] tracking-tight">
            Sistem Manajemen &amp;
            <br />
            Administrasi Kos
          </h1>
          <div className="mt-14 h-[3px] w-16 rounded-full bg-kos-400" />
        </div>

        {/* Dekorasi kartu */}
        <div className="pointer-events-none absolute inset-x-10 bottom-0 h-[290px]" aria-hidden="true">
          <div className="absolute bottom-0 left-0 h-[270px] w-[210px] rounded-t-[28px] border border-b-0 border-white/15" />
          <div className="absolute bottom-0 left-20 h-[232px] w-[210px] rounded-t-[28px] border border-b-0 border-white/15" />
          <div className="absolute bottom-0 left-40 h-[196px] w-[210px] rounded-t-[28px] border border-b-0 border-white/15" />
          <div className="absolute bottom-6 left-0 flex h-[88px] w-[230px] items-center gap-4 rounded-2xl bg-kos-900 px-5">
            <div className="h-10 w-[3px] rounded-full bg-kos-400" />
            <div className="flex-1 space-y-2.5">
              <div className="h-[3px] w-full rounded-full bg-kos-400/70" />
              <div className="h-[3px] w-3/4 rounded-full bg-kos-400/70" />
            </div>
          </div>
        </div>
      </aside>

      {/* Panel kanan */}
      <main className="flex min-h-screen flex-1 flex-col items-center px-4 py-8 lg:min-h-[calc(100vh-3rem)] lg:py-0">
        <Brand className="mb-8 text-kos-950 lg:hidden" />

        <div className="flex w-full flex-1 items-center justify-center">
          <div
            className={`w-full rounded-3xl border border-slate-200/80 bg-white p-8 ${
              wide ? 'max-w-[520px]' : 'max-w-[460px]'
            }`}
          >
            {children}
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-ink-soft lg:pb-2">
          {showHelp && <p className="mb-1">Butuh bantuan? Hubungi pengurus kos.</p>}
          <p>© 2026 Kos Rafasya</p>
        </footer>
      </main>
    </div>
  );
}
