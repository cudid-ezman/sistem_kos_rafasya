import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './services/api';
import type { UserProfile } from './types/auth';

// Komponen
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TagihanSaya from './pages/penghuni/TagihanSaya';
import KeluhanSaya from './pages/penghuni/KeluhanSaya';
import VerifikasiPembayaran from './pages/pengurus/VerifikasiPembayaran';
import DataKamar from './pages/pengurus/DataKamar';
import DataPenghuni from './pages/pengurus/DataPenghuni';
import DataTagihan from './pages/pengurus/DataTagihan';
import DaftarKeluhan from './pages/pengurus/DaftarKeluhan';
import Beranda from './pages/Beranda';
import LaporanKeuangan from './pages/pemilik/LaporanKeuangan';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        const res = await api.get<UserProfile>('/me/');
        setUser(res.data);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    verifySession();
  }, []);

  const handleLoginSuccess = (userData: UserProfile) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/');
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Memuat sistem...</div>;
  }

  return (
    <Routes>
      {/* Route Publik */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
      />

      {/* Route Dilindungi (Wajib Login) */}
      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<DashboardLayout user={user!} onLogout={handleLogout} />}>
          
         <Route path="/dashboard" element={<Beranda user={user!} />} />

          {/* Rute Pengurus */}
          <Route path="/dashboard/kamar" element={<DataKamar />} />
          <Route path="/dashboard/penghuni" element={<DataPenghuni />} />
          <Route path="/dashboard/verifikasi" element={<VerifikasiPembayaran />} />
          <Route path="/dashboard/tagihan" element={<DataTagihan />} />
          <Route path="/dashboard/keluhan" element={<DaftarKeluhan />} />

          {/* Rute Penghuni */}
          <Route path="/dashboard/tagihan-saya" element={<TagihanSaya />} />
          <Route path="/dashboard/keluhan-saya" element={<KeluhanSaya />} />

          {/* Rute Pemilik */}
          <Route path="/dashboard/laporan" element={<LaporanKeuangan />} />
          
        </Route>
      </Route>
    </Routes>
  );
}

export default App;