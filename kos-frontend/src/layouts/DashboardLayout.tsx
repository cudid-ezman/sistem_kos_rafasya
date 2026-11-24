import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import type { UserProfile } from "../types/auth";
import { tagihanService } from "../services/tagihanService";
import { keluhanService } from "../services/keluhanService";
import ToastProvider from "../components/portal/ToastProvider";
import UbahPasswordModal from "../components/portal/UbahPasswordModal";
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

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof MenuHomeIcon;
  badge?: number;
  end?: boolean;
}

const JUDUL: Record<string, string> = {
  "/dashboard": "Beranda",
  "/dashboard/kamar": "Data Kamar",
  "/dashboard/penghuni": "Data Penghuni",
  "/dashboard/tagihan": "Data Tagihan",
  "/dashboard/verifikasi": "Verifikasi Pembayaran",
  "/dashboard/keluhan": "Keluhan Penghuni",
  "/dashboard/informasi-kelola": "Pusat Informasi",
  "/dashboard/laporan": "Laporan Keuangan",
  "/dashboard/keluhan-pemilik": "Keluhan & Perbaikan",
  "/dashboard/kelola-akun": "Kelola Akun",
};

export default function DashboardLayout({ user, onLogout }: Props) {
  const location = useLocation();
  const role = (user.role || "").toLowerCase();
  const isSuperadmin = role === "superadmin";
  const isPemilik = role === "pemilik";
  const isPenghuni = role === "penghuni";

  const [drawer, setDrawer] = useState(false);
  const [ubahPwOpen, setUbahPwOpen] = useState(false);
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
  if (isPenghuni) return <Navigate to="/dashboard/tagihan-saya" replace />;

  const grup: { judul: string; items: NavItem[] }[] = isSuperadmin
    ? [
        {
          judul: "Administrasi Sistem",
          items: [
            {
              to: "/dashboard",
              label: "Beranda",
              icon: MenuHomeIcon,
              end: true,
            },
            {
              to: "/dashboard/kelola-akun",
              label: "Kelola Akun Pemilik",
              icon: UsersIcon,
            },
          ],
        },
      ]
    : isPemilik
      ? [
          {
            judul: "Ringkasan",
            items: [
              {
                to: "/dashboard",
                label: "Beranda",
                icon: MenuHomeIcon,
                end: true,
              },
              {
                to: "/dashboard/laporan",
                label: "Laporan Keuangan",
                icon: ChartIcon,
              },
              {
                to: "/dashboard/keluhan-pemilik",
                label: "Keluhan & Perbaikan",
                icon: WarningIcon,
                badge: keluhanList.filter((k) => k.status_pemilik === "menunggu").length || undefined,
              },
            ],
          },
          {
            judul: "Manajemen Akun",
            items: [
              {
                to: "/dashboard/kelola-akun",
                label: "Kelola Akun Pengurus",
                icon: UsersIcon,
              },
            ],
          },
        ]
      : [
          {
            judul: "Ringkasan",
            items: [
              {
                to: "/dashboard",
                label: "Beranda",
                icon: MenuHomeIcon,
                end: true,
              },
            ],
          },
          {
            judul: "Manajemen",
            items: [
              {
                to: "/dashboard/kamar",
                label: "Kamar & Denah",
                icon: DoorIcon,
              },
              { to: "/dashboard/penghuni", label: "Penghuni", icon: UsersIcon },
              { to: "/dashboard/tagihan", label: "Tagihan", icon: ReceiptIcon },
              {
                to: "/dashboard/verifikasi",
                label: "Verifikasi Bayar",
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
                label: "Pusat Informasi",
                icon: InfoCircleIcon,
              },
            ],
          },
        ];

  const nama = user.nama_lengkap || user.username;
  const judulHalaman = JUDUL[location.pathname] ?? "Dashboard";
  const roleLabel = isSuperadmin
    ? "Superadmin"
    : isPemilik
      ? "Pemilik"
      : "Pengurus";

  const menu = (
    <nav
      className="flex flex-1 flex-col gap-6 overflow-y-auto"
      aria-label="Menu utama"
    >
      {grup.map((g) => (
        <div key={g.judul}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {g.judul}
          </p>
          <div className="flex flex-col gap-1">
            {g.items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setDrawer(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-kos-600 text-white shadow-md shadow-kos-600/25"
                      : "text-ink-soft hover:bg-white hover:text-ink hover:shadow-sm"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={19} />
                    <span className="flex-1">{n.label}</span>
                    {!!n.badge && n.badge > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {n.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page">
        <a
          href="#konten"
          className="sr-only z-[90] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-kos-700 shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Lewati ke konten
        </a>

        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md print:hidden">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Buka menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink-soft hover:bg-slate-100 lg:hidden"
              >
                <MenuIcon />
              </button>
              <Link to="/dashboard" className="flex items-center gap-3">
                <LogoMark size={44} className="shrink-0 text-kos-950" />
                <span className="hidden leading-tight sm:block">
                  <BrandName className="block text-[18px] text-kos-950" />
                  <span className="block text-xs text-ink-soft">
                    Panel {roleLabel}
                  </span>
                </span>
              </Link>
              <span className="mx-2 hidden h-6 w-px bg-slate-200 lg:block" />
              <h1 className="hidden text-[15px] font-semibold text-ink lg:block">
                {judulHalaman}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <AdminNotificationBell
                user={user}
                tagihan={tagihanList}
                bukti={buktiList}
                keluhan={keluhanList}
              />
              {!isSuperadmin && (
                <span className="hidden h-7 w-px bg-slate-200 sm:block" />
              )}
              <div className="flex items-center gap-3">
                <span className="hidden leading-tight sm:block">
                  <span className="block max-w-[180px] truncate text-sm font-semibold text-ink">
                    {nama}
                  </span>
                  <span className="mt-0.5 inline-block rounded-full bg-kos-100/70 px-2 py-px text-[10px] font-bold tracking-wide text-kos-700 uppercase">
                    {roleLabel}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUbahPwOpen(true)}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-ink transition hover:bg-slate-50"
              >
                <span className="hidden sm:inline">Ubah Sandi</span>
                <span className="sm:hidden">Sandi</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar"
                className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-ink transition hover:bg-slate-50"
              >
                <LogoutIcon size={17} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1500px]">
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[260px] shrink-0 flex-col p-5 lg:flex print:hidden">
            {menu}
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-xs leading-relaxed text-ink-soft">
              Sistem Manajemen &amp; Administrasi Kos Rafasya
            </p>
          </aside>

          <main
            id="konten"
            className="min-w-0 flex-1 px-4 pb-12 pt-6 lg:px-8 lg:pt-8 print:p-0"
          >
            <Outlet />
          </main>
        </div>

        {/* Drawer mobile */}
        {drawer && (
          <div
            className="fixed inset-0 z-[70] lg:hidden print:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div
              className="absolute inset-0 bg-kos-950/50 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-page p-5 shadow-2xl motion-safe:animate-[pop-in_.18s_ease-out]">
              <div className="mb-6 flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <LogoMark size={44} className="shrink-0 text-kos-950" />
                  <BrandName className="text-[18px] text-kos-950" />
                </span>
                <button
                  type="button"
                  onClick={() => setDrawer(false)}
                  aria-label="Tutup menu"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ink-soft hover:bg-slate-100"
                >
                  <XIcon size={18} />
                </button>
              </div>
              {menu}
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
