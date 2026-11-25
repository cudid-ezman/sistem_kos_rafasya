import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { inisial } from "../../lib/format";
import { BrandName, LogoMark } from "../brand/BrandLogo";
import { DoorIcon, LockIcon, LogoutIcon, type ReceiptIcon } from "./icons";

export interface PortalNavItem {
  to: string;
  label: string;
  short: string;
  icon: typeof ReceiptIcon;
  badge?: number;
  end?: boolean;
}

interface Props {
  nav: PortalNavItem[];
  /** Tujuan saat logo ditekan. */
  homeTo: string;
  subtitle: string;
  nama: string;
  roleLabel: string;
  /** Keterangan singkat di kanan tab (mis. nomor kamar). */
  chip?: string;
  /** Lonceng notifikasi milik peran masing-masing. */
  bell: ReactNode;
  onUbahSandi: () => void;
  onLogout: () => void;
  children: ReactNode;
}

/**
 * Kerangka bersama portal penghuni dan pemilik. Dirancang untuk layar ponsel:
 * navigasi bawah mengambang di ponsel, tab di bagian atas saat layar lebar.
 */
export default function PortalFrame({
  nav,
  homeTo,
  subtitle,
  nama,
  roleLabel,
  chip,
  bell,
  onUbahSandi,
  onLogout,
  children,
}: Props) {
  const [akunBuka, setAkunBuka] = useState(false);

  useEffect(() => {
    if (!akunBuka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAkunBuka(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [akunBuka]);

  return (
    <div className="min-h-screen bg-page print:min-h-0 print:bg-white">
      <a
        href="#konten"
        className="sr-only z-[70] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-kos-700 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-40 border-b border-field-line bg-page/90 backdrop-blur-md print:hidden">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between">
            <Link
              to={homeTo}
              className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600"
            >
              <LogoMark size={38} className="shrink-0 text-gerbang" />
              <span className="leading-tight">
                <BrandName className="block text-[19px] text-gerbang" />
                <span className="block text-xs text-ink-soft">{subtitle}</span>
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              {bell}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAkunBuka((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={akunBuka}
                  aria-label="Menu akun"
                  className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg pl-1 pr-2 transition hover:bg-cream/70 focus-visible:outline-2 focus-visible:outline-kos-600"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gerbang text-xs font-bold text-cream">
                    {inisial(nama)}
                  </span>
                  <span className="hidden max-w-[150px] truncate text-sm font-semibold text-ink md:block">
                    {nama}
                  </span>
                </button>

                {akunBuka && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAkunBuka(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-field-line bg-white p-2 shadow-xl motion-safe:animate-[pop-in_.16s_ease-out]"
                    >
                      <div className="px-3 pb-2.5 pt-2">
                        <p className="truncate text-sm font-semibold text-ink">{nama}</p>
                        <p className="text-xs text-ink-soft">{roleLabel}</p>
                      </div>
                      <div className="border-t border-field-line pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAkunBuka(false);
                            onUbahSandi();
                          }}
                          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink transition hover:bg-cream/60"
                        >
                          <LockIcon size={17} className="text-ink-soft" /> Ubah kata sandi
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={onLogout}
                          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-terracotta transition hover:bg-terracotta/10"
                        >
                          <LogoutIcon size={17} /> Keluar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tab navigasi untuk layar lebar */}
          <div className="hidden items-end justify-between lg:flex">
            <nav className="-mb-px flex gap-7" aria-label="Menu utama">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-600 ${
                      isActive
                        ? "border-kos-600 text-ink"
                        : "border-transparent text-ink-soft hover:text-ink"
                    }`
                  }
                >
                  <n.icon size={18} />
                  {n.label}
                  {!!n.badge && n.badge > 0 && (
                    <span className="rounded-md bg-terracotta px-1.5 py-px text-[11px] font-bold text-white">
                      {n.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            {chip && (
              <p className="mb-2.5 flex items-center gap-2 rounded-lg bg-cream px-3 py-1.5 text-[13px] font-semibold text-gerbang">
                <DoorIcon size={16} />
                {chip}
              </p>
            )}
          </div>
        </div>
      </header>

      <main
        id="konten"
        className="mx-auto w-full max-w-screen-2xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8 print:max-w-none print:p-0"
      >
        {children}
      </main>

      {/* Navigasi bawah (ponsel) */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl bg-gerbang p-1.5 lg:hidden print:hidden"
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-kos-400 ${
                isActive ? "bg-kos-600 text-white" : "text-white/70"
              }`
            }
          >
            <n.icon size={20} />
            <span className="max-w-full truncate px-1">{n.short}</span>
            {!!n.badge && n.badge > 0 && (
              <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cream px-1 text-[10px] font-bold text-gerbang ring-2 ring-gerbang">
                {n.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
