import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import type { UserProfile } from "../types/auth";
import { inisial } from "../lib/format";
import PortalProvider from "../components/portal/PortalProvider";
import ToastProvider from "../components/portal/ToastProvider";
import NotificationBell from "../components/portal/NotificationBell";
import UbahPasswordModal from "../components/portal/UbahPasswordModal";
import { usePortal } from "../components/portal/portalContext";
import {
  DoorIcon,
  InfoCircleIcon,
  LogoutIcon,
  ReceiptIcon,
  WarningIcon,
} from "../components/portal/icons";
import { BrandName, LogoMark } from "../components/brand/BrandLogo";
import LinkWhatsAppPengurus from "../components/common/LinkWhatsAppPengurus";

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { user, kamar, tagihan, keluhan } = usePortal();
  const [ubahPwOpen, setUbahPwOpen] = useState(false);
  const perluBayar = tagihan.filter((t) =>
    ["belum_dibayar", "ditolak", "terlambat"].includes(t.status),
  ).length;
  const keluhanAktif = keluhan.filter((k) => k.status !== "selesai").length;

  const nav = [
    {
      to: "/dashboard/tagihan-saya",
      label: "Tagihan Saya",
      short: "Tagihan",
      icon: ReceiptIcon,
      badge: perluBayar,
    },
    {
      to: "/dashboard/informasi",
      label: "Pusat Informasi",
      short: "Informasi",
      icon: InfoCircleIcon,
      badge: 0,
    },
    {
      to: "/dashboard/keluhan-saya",
      label: "Keluhan",
      short: "Keluhan",
      icon: WarningIcon,
      badge: keluhanAktif,
    },
  ];

  const nama = user.nama_lengkap || user.username;

  return (
    <div className="min-h-screen bg-page">
      <a
        href="#konten"
        className="sr-only z-[70] rounded-lg bg-white px-3 py-2 text-sm font-semibold text-kos-700 shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Lewati ke konten
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:px-6">
          <Link
            to="/dashboard/tagihan-saya"
            className="flex items-center gap-3"
          >
            <LogoMark size={44} className="shrink-0 text-kos-950" />
            <span className="leading-tight">
              <BrandName className="block text-[18px] text-kos-950" />
              <span className="block text-xs text-ink-soft">
                Portal Penghuni
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <NotificationBell />
            <span className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-kos-600 text-xs font-bold text-white">
                {inisial(nama)}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[180px] truncate text-sm font-semibold text-ink">
                  {nama}
                </span>
                <span className="block text-xs text-ink-soft">
                  Penghuni{kamar ? ` • Kamar ${kamar.nomor}` : ""}
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
              className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-ink transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-kos-600"
            >
              <LogoutIcon size={17} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        {/* Sidebar desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[272px] shrink-0 flex-col gap-6 p-5 lg:flex">
          <div className="relative overflow-hidden rounded-2xl bg-kos-950 p-4 text-white">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 rounded-full border border-white/10" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kos-400/20 text-kos-400">
                <DoorIcon />
              </span>
              <div className="leading-tight">
                <p className="text-lg font-bold">
                  {kamar ? `Kamar ${kamar.nomor}` : "Kamar Anda"}
                </p>
                <p className="mt-0.5 text-xs text-white/70">
                  {kamar
                    ? [kamar.blok && `Blok ${kamar.blok}`, kamar.tipe]
                        .filter(Boolean)
                        .join(" • ") || "Penghuni aktif"
                    : "Data kamar belum tersedia"}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Menu utama">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
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
                    {n.badge > 0 && (
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
          </nav>

          <p className="mt-auto rounded-2xl border border-dashed border-slate-300 p-4 text-xs leading-relaxed text-ink-soft">
            Butuh bantuan?{' '}
            <LinkWhatsAppPengurus
              label="Hubungi pengurus kos"
              pesan={`Halo Pengurus Kos Putra Raffasya, saya ${nama}${kamar ? ` (Kamar ${kamar.nomor})` : ''} membutuhkan bantuan.`}
            />{' '}
            atau kirim laporan lewat menu Keluhan.
          </p>
        </aside>

        <main
          id="konten"
          className="min-w-0 flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Navigasi bawah (mobile) */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur lg:hidden"
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition ${
                isActive ? "bg-kos-600 text-white" : "text-ink-soft"
              }`
            }
          >
            <n.icon size={20} />
            {n.short}
            {n.badge > 0 && (
              <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {n.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <UbahPasswordModal
        open={ubahPwOpen}
        onClose={() => setUbahPwOpen(false)}
      />
    </div>
  );
}

export default function PenghuniLayout({ user, onLogout }: Props) {
  return (
    <PortalProvider user={user}>
      <ToastProvider>
        <Shell onLogout={onLogout} />
      </ToastProvider>
    </PortalProvider>
  );
}
