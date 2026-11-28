import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import type { UserProfile } from "../types/auth";
import { tagihanService } from "../services/tagihanService";
import { keluhanService } from "../services/keluhanService";
import ToastProvider from "../components/portal/ToastProvider";
import UbahPasswordModal from "../components/portal/UbahPasswordModal";
import PortalFrame, { type PortalNavItem } from "../components/portal/PortalFrame";
import {
  ChartIcon,
  DoorIcon,
  InfoCircleIcon,
  LogoutIcon,
  MenuHomeIcon,
  MenuIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  UsersIcon,
  WarningIcon,
  XIcon,
} from "../components/portal/icons";
import type { BuktiPembayaran, Keluhan, Tagihan } from "../types/kos";
import AdminNotificationBell from "../components/admin/AdminNotificationBell";
import { BrandName, LogoMark } from "../components/brand/BrandLogo";
import { inisial } from "../lib/format";

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

interface SubItem {
  to: string;
  label: string;
  /** Nilai parameter URL yang menandai submenu ini aktif; kosong berarti tanpa parameter. */
  nilai?: string;
  jumlah?: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof MenuHomeIcon;
  badge?: number;
  end?: boolean;
  anak?: SubItem[];
  /** Nama parameter URL yang membedakan submenu (mis. tab atau status). */
  anakParam?: string;
}

function GearNavIcon({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function DashboardLayout({ user, onLogout }: Props) {
  const location = useLocation();
  const role = (user.role || "").toLowerCase();
  const isSuperadmin = role === "superadmin";
  const isPemilik = role === "pemilik";
  const isPenghuni = role === "penghuni";

  const [drawer, setDrawer] = useState(false);
  const [ubahPwOpen, setUbahPwOpen] = useState(false);
  const [akunBuka, setAkunBuka] = useState(false);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [buktiList, setBuktiList] = useState<BuktiPembayaran[]>([]);
  const [keluhanList, setKeluhanList] = useState<Keluhan[]>([]);

  const antrean = buktiList.filter(
    (x) => x.status === "menunggu_verifikasi",
  ).length;
  const keluhanAktif = keluhanList.filter((x) => x.status !== "selesai").length;

  // Data notifikasi & badge menu (pengurus & pemilik): diperbarui setiap pindah halaman
  useEffect(() => {
    if (isSuperadmin || isPenghuni) return;
    let batal = false;
    Promise.all([
      tagihanService.getAll(),
      tagihanService.getBuktiPembayaran(),
      keluhanService.getAll(),
    ])
      .then(([t, b, k]) => {
        if (batal) return;
        setTagihanList(t.data);
        setBuktiList(b.data);
        setKeluhanList(k.data);
      })
      .catch(() => {
        /* notifikasi & badge opsional, abaikan jika gagal */
      });
    return () => {
      batal = true;
    };
  }, [location.pathname, isSuperadmin, isPenghuni]);

  // Penghuni memakai portalnya sendiri
  if (isPenghuni) return <Navigate to="/dashboard/beranda" replace />;

  const nama = user.nama_lengkap || user.username;

  /* ───────── Pemilik: kerangka ponsel yang sama dengan penghuni ───────── */
  if (isPemilik) {
    const menungguPemilik =
      keluhanList.filter((k) => k.status_pemilik === "menunggu").length ||
      undefined;
    const navPemilik: PortalNavItem[] = [
      {
        to: "/dashboard",
        label: "Beranda",
        short: "Beranda",
        icon: MenuHomeIcon,
        end: true,
      },
      {
        to: "/dashboard/laporan",
        label: "Laporan keuangan",
        short: "Laporan",
        icon: ChartIcon,
      },
      {
        to: "/dashboard/keluhan-pemilik",
        label: "Pengajuan perbaikan",
        short: "Perbaikan",
        icon: WarningIcon,
        badge: menungguPemilik,
      },
      {
        to: "/dashboard/kelola-akun",
        label: "Kelola akun",
        short: "Akun",
        icon: UsersIcon,
      },
    ];
    return (
      <ToastProvider>
        <PortalFrame
          nav={navPemilik}
          homeTo="/dashboard"
          subtitle="Portal pemilik"
          nama={nama}
          roleLabel="Pemilik"
          bell={
            <AdminNotificationBell
              user={user}
              tagihan={tagihanList}
              bukti={buktiList}
              keluhan={keluhanList}
            />
          }
          onUbahSandi={() => setUbahPwOpen(true)}
          onLogout={onLogout}
        >
          <Outlet />
        </PortalFrame>
        <UbahPasswordModal
          open={ubahPwOpen}
          onClose={() => setUbahPwOpen(false)}
        />
      </ToastProvider>
    );
  }

  /* ───────── Pengurus & superadmin: sidebar untuk layar laptop ───────── */
  const grup: { judul: string; items: NavItem[] }[] = isSuperadmin
    ? [
        {
          judul: "Administrasi sistem",
          items: [
            { to: "/dashboard", label: "Beranda", icon: MenuHomeIcon, end: true },
            {
              to: "/dashboard/kelola-akun",
              label: "Kelola akun pemilik",
              icon: UsersIcon,
            },
          ],
        },
      ]
    : [
        {
          judul: "Ringkasan",
          items: [
            { to: "/dashboard", label: "Beranda", icon: MenuHomeIcon, end: true },
          ],
        },
        {
          judul: "Manajemen",
          items: [
            {
              to: "/dashboard/kamar",
              label: "Kamar",
              icon: DoorIcon,
              anakParam: "tab",
              anak: [
                { to: "/dashboard/kamar", label: "Daftar kamar" },
                { to: "/dashboard/kamar?tab=denah", label: "Denah kamar", nilai: "denah" },
              ],
            },
            { to: "/dashboard/penghuni", label: "Penghuni", icon: UsersIcon },
            { to: "/dashboard/tagihan", label: "Tagihan", icon: ReceiptIcon },
            {
              to: "/dashboard/verifikasi",
              label: "Verifikasi bayar",
              icon: ShieldCheckIcon,
              badge: antrean,
            },
            {
              to: "/dashboard/keluhan",
              label: "Keluhan",
              icon: WarningIcon,
              badge: keluhanAktif,
            },
            {
              to: "/dashboard/informasi-kelola",
              label: "Pusat informasi",
              icon: InfoCircleIcon,
            },
            {
              to: "/dashboard/pengaturan",
              label: "Pengaturan",
              icon: GearNavIcon,
            },
          ],
        },
      ];

  const roleLabel = isSuperadmin ? "Superadmin" : "Pengurus";
  const paramUrl = new URLSearchParams(location.search);

  const barisCls = (aktif: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-400 ${
      aktif
        ? "bg-kos-600 text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const menu = (
    <nav
      className="sidebar-scroll -mr-2 flex flex-1 flex-col gap-4 overflow-y-auto pr-2"
      aria-label="Menu utama"
    >
      {grup.map((g) => (
        <div key={g.judul}>
          <p className="mb-1 px-3 text-xs font-medium text-white/45">
            {g.judul}
          </p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const badge = !!n.badge && n.badge > 0 ? n.badge : 0;
              if (n.anak) {
                const dalamBagian = location.pathname.startsWith(n.to);
                return (
                  <div key={n.to}>
                    <Link
                      to={n.anak[0].to}
                      onClick={() => setDrawer(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-400 ${
                        dalamBagian
                          ? "text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <n.icon size={19} />
                      <span className="flex-1">{n.label}</span>
                      {!dalamBagian && badge > 0 && (
                        <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-gerbang">
                          {badge}
                        </span>
                      )}
                    </Link>
                    {dalamBagian && (
                      <div className="ml-[21px] mt-0.5 flex flex-col gap-0.5 border-l border-white/15 pl-3">
                        {n.anak.map((a) => {
                          const aktif =
                            location.pathname === n.to &&
                            (paramUrl.get(n.anakParam ?? "") ?? "") === (a.nilai ?? "");
                          return (
                            <Link
                              key={a.to}
                              to={a.to}
                              onClick={() => setDrawer(false)}
                              aria-current={aktif ? "page" : undefined}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-400 ${
                                aktif
                                  ? "bg-kos-600 text-white"
                                  : "text-white/65 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {a.label}
                              {a.jumlah !== undefined && (
                                <span className={`text-xs tabular-nums ${aktif ? "text-white/80" : "text-white/45"}`}>
                                  {a.jumlah}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) => barisCls(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <n.icon size={19} />
                      <span className="flex-1">{n.label}</span>
                      {badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive
                              ? "bg-white/25 text-white"
                              : "bg-cream text-gerbang"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const merek = (
    <Link
      to="/dashboard"
      onClick={() => setDrawer(false)}
      className="flex items-center gap-3 rounded-lg px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-400"
    >
      <LogoMark size={40} className="shrink-0 text-cream" roof="var(--color-atap-terang)" />
      <span className="leading-tight">
        <BrandName className="block text-[19px] text-white" accent="text-atap-terang" />
        <span className="block text-xs text-white/55">Panel {roleLabel}</span>
      </span>
    </Link>
  );

  const akun = (
    <div className="relative mt-3 border-t border-white/10 pt-3">
      {akunBuka && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setAkunBuka(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border border-white/10 bg-gerbang p-1.5 shadow-2xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAkunBuka(false);
                setUbahPwOpen(true);
              }}
              className="flex h-10 w-full cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-white/85 transition hover:bg-white/10"
            >
              Ubah sandi
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-atap-terang transition hover:bg-white/10"
            >
              <LogoutIcon size={16} />
              Keluar
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={akunBuka}
        onClick={() => setAkunBuka((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kos-400"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-[13px] font-bold text-gerbang"
        >
          {inisial(nama)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-white">
            {nama}
          </span>
          <span className="block text-xs text-white/55">{roleLabel}</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-white/55 transition-transform motion-reduce:transition-none ${akunBuka ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page lg:grid lg:grid-cols-[264px_minmax(0,1fr)] print:block">
        <a
          href="#konten"
          className="sr-only z-[90] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-kos-700 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Lewati ke konten
        </a>

        <aside className="sticky top-0 hidden h-screen flex-col bg-hijau-tua p-4 lg:flex print:hidden">
          <div className="mb-5 mt-1">{merek}</div>
          {menu}
          {akun}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-field-line bg-page print:hidden">
            <div className="flex h-16 items-center justify-between px-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawer(true)}
                  aria-label="Buka menu"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-ink hover:bg-cream/60 lg:hidden"
                >
                  <MenuIcon />
                </button>
                <LogoMark size={34} className="shrink-0 text-gerbang lg:hidden" />
                <span className="text-sm font-medium text-ink-soft">
                  Sistem Manajemen Kos Rafasya
                </span>
              </div>
              <AdminNotificationBell
                user={user}
                tagihan={tagihanList}
                bukti={buktiList}
                keluhan={keluhanList}
              />
            </div>
          </header>

          <main
            id="konten"
            className="mx-auto max-w-[1240px] px-4 pb-12 pt-6 lg:px-8 lg:pt-8 print:p-0"
          >
            <Outlet />
          </main>
        </div>

        {/* Drawer (layar kecil) */}
        {drawer && (
          <div
            className="fixed inset-0 z-[70] lg:hidden print:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div
              className="absolute inset-0 bg-gerbang/60 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[284px] flex-col bg-hijau-tua p-4 shadow-2xl motion-safe:animate-[pop-in_.18s_ease-out]">
              <div className="mb-4 flex items-center justify-between">
                {merek}
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  aria-label="Tutup menu"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                >
                  <XIcon size={18} />
                </button>
              </div>
              {menu}
              {akun}
            </div>
          </div>
        )}

        <UbahPasswordModal
          open={ubahPwOpen}
          onClose={() => setUbahPwOpen(false)}
        />
      </div>
    </ToastProvider>
  );
}
