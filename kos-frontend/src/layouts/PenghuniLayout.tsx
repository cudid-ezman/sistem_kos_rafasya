import { useState } from "react";
import { Outlet } from "react-router-dom";
import type { UserProfile } from "../types/auth";
import PortalProvider from "../components/portal/PortalProvider";
import ToastProvider from "../components/portal/ToastProvider";
import NotificationBell from "../components/portal/NotificationBell";
import UbahPasswordModal from "../components/portal/UbahPasswordModal";
import PortalFrame, { type PortalNavItem } from "../components/portal/PortalFrame";
import { usePortal } from "../components/portal/portalContext";
import {
  InfoCircleIcon,
  MenuHomeIcon,
  ReceiptIcon,
  WarningIcon,
} from "../components/portal/icons";

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

  const nav: PortalNavItem[] = [
    {
      to: "/dashboard/beranda",
      label: "Beranda",
      short: "Beranda",
      icon: MenuHomeIcon,
    },
    {
      to: "/dashboard/tagihan-saya",
      label: "Tagihan saya",
      short: "Tagihan",
      icon: ReceiptIcon,
      badge: perluBayar,
    },
    {
      to: "/dashboard/informasi",
      label: "Pusat informasi",
      short: "Info",
      icon: InfoCircleIcon,
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
  const infoKamar = kamar
    ? [`Kamar ${kamar.nomor}`, kamar.blok && `Blok ${kamar.blok}`, kamar.tipe]
        .filter(Boolean)
        .join(" · ")
    : "Data kamar belum tersedia";

  return (
    <>
      <PortalFrame
        nav={nav}
        homeTo="/dashboard/beranda"
        subtitle="Portal penghuni"
        nama={nama}
        roleLabel="Penghuni"
        chip={infoKamar}
        bell={<NotificationBell />}
        onUbahSandi={() => setUbahPwOpen(true)}
        onLogout={onLogout}
      >
        <Outlet />
        <p className="mt-10 text-center text-xs text-ink-soft">
          Butuh bantuan? Hubungi pengurus kos atau kirim laporan lewat menu
          Keluhan.
        </p>
      </PortalFrame>
      <UbahPasswordModal
        open={ubahPwOpen}
        onClose={() => setUbahPwOpen(false)}
      />
    </>
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
