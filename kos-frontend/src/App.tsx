import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './services/api';
import type { UserProfile } from './types/auth';

// Komponen
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import TagihanSaya from './pages/penghuni/TagihanSaya';

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
          
          <Route path="/dashboard" element={
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold">Selamat Datang di Dashboard Kos Rafasya</h3>
              <p className="text-slate-600 mt-2">Silakan pilih menu di samping kiri sesuai dengan hak akses Anda.</p>
            </div>
          } />

          {/* Rute Pengurus */}
          <Route path="/dashboard/kamar" element={<div>Tabel Data Kamar akan tampil di sini</div>} />
          <Route path="/dashboard/penghuni" element={<div>Tabel Data Penghuni akan tampil di sini</div>} />
          <Route path="/dashboard/verifikasi" element={<div>Daftar Verifikasi Pembayaran akan tampil di sini</div>} />

          {/* Rute Penghuni */}
          <Route path="/dashboard/tagihan-saya" element={<TagihanSaya />} />
          <Route path="/dashboard/keluhan-saya" element={<div>Daftar Keluhan Penghuni akan tampil di sini</div>} />

          {/* Rute Pemilik */}
          <Route path="/dashboard/laporan" element={<div>Laporan Keuangan akan tampil di sini</div>} />
          
        </Route>
      </Route>
    </Routes>
  );
}

export default App;