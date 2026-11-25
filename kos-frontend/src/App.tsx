import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import api from "./services/api";
import type { UserProfile } from "./types/auth";

// Komponen
import Login from "./pages/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import DashboardLayout from "./layouts/DashboardLayout";
import PenghuniLayout from "./layouts/PenghuniLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import BerandaPenghuni from "./pages/penghuni/BerandaPenghuni";
import TagihanSaya from "./pages/penghuni/TagihanSaya";
import RincianTagihan from "./pages/penghuni/RincianTagihan";
import UploadBukti from "./pages/penghuni/UploadBukti";
import PusatInformasi from "./pages/penghuni/PusatInformasi";
import DetailInformasi from "./pages/penghuni/DetailInformasi";
import KeluhanSaya from "./pages/penghuni/KeluhanSaya";
import BuatKeluhan from "./pages/penghuni/BuatKeluhan";
import DetailKeluhan from "./pages/penghuni/DetailKeluhan";
import VerifikasiPembayaran from "./pages/pengurus/VerifikasiPembayaran";
import DataKamar from "./pages/pengurus/DataKamar";
import DataPenghuni from "./pages/pengurus/DataPenghuni";
import DataTagihan from "./pages/pengurus/DataTagihan";
import DaftarKeluhan from "./pages/pengurus/DaftarKeluhan";
import KelolaInformasi from "./pages/pengurus/KelolaInformasi";
import PengaturanTemplateWA from "./pages/pengurus/PengaturanTemplateWA";
import Beranda from "./pages/Beranda";
import LaporanKeuangan from "./pages/pemilik/LaporanKeuangan";
import KeluhanPemilik from "./pages/pemilik/KeluhanPemilik";
import KelolaAkun from "./pages/pemilik/KelolaAkun";

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        const res = await api.get<UserProfile>("/me/");
        setUser(res.data);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    verifySession();
  }, []);

  const handleLoginSuccess = (userData: UserProfile) => {
    setUser(userData);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    navigate("/");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-ink-soft">
        Memuat sistem...
      </div>
    );
  }

  return (
    <Routes>
      {/* Route Publik */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route path="/daftar" element={<Navigate to="/" replace />} />
      <Route
        path="/lupa-kata-sandi"
        element={
          user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
        }
      />
      <Route
        path="/atur-ulang-kata-sandi"
        element={<ResetPassword />}
      />
      <Route
        path="/atur-ulang-kata-sandi/*"
        element={<ResetPassword />}
      />

      {/* Portal Penghuni (layout & halaman khusus penghuni) */}
      <Route
        element={
          <ProtectedRoute user={user} allowedRoles={["penghuni", "Penghuni"]} />
        }
      >
        <Route
          element={<PenghuniLayout user={user!} onLogout={handleLogout} />}
        >
          <Route path="/dashboard/beranda" element={<BerandaPenghuni />} />
          <Route path="/dashboard/tagihan-saya" element={<TagihanSaya />} />
          <Route
            path="/dashboard/tagihan-saya/:id"
            element={<RincianTagihan />}
          />
          <Route
            path="/dashboard/tagihan-saya/:id/upload"
            element={<UploadBukti />}
          />
          <Route path="/dashboard/informasi" element={<PusatInformasi />} />
          <Route
            path="/dashboard/informasi/:slug"
            element={<DetailInformasi />}
          />
          <Route path="/dashboard/keluhan-saya" element={<KeluhanSaya />} />
          <Route
            path="/dashboard/keluhan-saya/baru"
            element={<BuatKeluhan />}
          />
          <Route
            path="/dashboard/keluhan-saya/:id"
            element={<DetailKeluhan />}
          />
        </Route>
      </Route>

      {/* Route Dilindungi (Pengurus & Pemilik) */}
      <Route element={<ProtectedRoute user={user} />}>
        <Route
          element={<DashboardLayout user={user!} onLogout={handleLogout} />}
        >
          <Route
            path="/dashboard"
            element={
              (user?.role || "").toLowerCase() === "penghuni" ? (
                <Navigate to="/dashboard/beranda" replace />
              ) : (
                <Beranda user={user!} />
              )
            }
          />

          {/* Rute Pengurus */}
          <Route path="/dashboard/kamar" element={<DataKamar />} />
          <Route path="/dashboard/penghuni" element={<DataPenghuni />} />
          <Route
            path="/dashboard/verifikasi"
            element={<VerifikasiPembayaran />}
          />
          <Route path="/dashboard/tagihan" element={<DataTagihan />} />
          <Route path="/dashboard/keluhan" element={<DaftarKeluhan />} />
          <Route
            path="/dashboard/informasi-kelola"
            element={<KelolaInformasi />}
          />
          <Route
            path="/dashboard/pengaturan"
            element={<PengaturanTemplateWA />}
          />

          {/* Rute Pemilik */}
          <Route path="/dashboard/laporan" element={<LaporanKeuangan />} />
          <Route path="/dashboard/keluhan-pemilik" element={<KeluhanPemilik />} />
          <Route path="/dashboard/kelola-akun" element={<KelolaAkun />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
