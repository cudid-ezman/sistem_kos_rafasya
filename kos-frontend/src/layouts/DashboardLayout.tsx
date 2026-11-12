import { Outlet, Link, useLocation } from 'react-router-dom';
import type { UserProfile } from '../types/auth';

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

export default function DashboardLayout({ user, onLogout }: Props) {
  const location = useLocation();

  // 1. Ambil role dan paksa jadi huruf kecil semua agar kebal typo/case-sensitive
  const currentRole = (user.role || '').toLowerCase();

  // 2. Tentukan hak akses secara ketat
  const isPemilik = currentRole === 'pemilik';
  const isPengurus = currentRole === 'pengurus' || currentRole === 'superadmin';
  const isPenghuni = currentRole === 'penghuni';

  const navLinkClass = (path: string) => 
    `block px-4 py-3 text-sm font-medium transition ${
      location.pathname === path 
        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-800">Kos Rafasya</h1>
          <span className="inline-block mt-2 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 uppercase">
            {user.role}
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1">
          <Link to="/dashboard" className={navLinkClass('/dashboard')}>Beranda</Link>

          {isPengurus && (
            <>
              <Link to="/dashboard/kamar" className={navLinkClass('/dashboard/kamar')}>Data Kamar</Link>
              <Link to="/dashboard/penghuni" className={navLinkClass('/dashboard/penghuni')}>Data Penghuni</Link>
              <Link to="/dashboard/verifikasi" className={navLinkClass('/dashboard/verifikasi')}>Verifikasi Pembayaran</Link>
            </>
          )}

          {isPenghuni && (
            <>
              <Link to="/dashboard/tagihan-saya" className={navLinkClass('/dashboard/tagihan-saya')}>Tagihan Saya</Link>
              <Link to="/dashboard/keluhan-saya" className={navLinkClass('/dashboard/keluhan-saya')}>Keluhan Saya</Link>
            </>
          )}

          {isPemilik && (
            <Link to="/dashboard/laporan" className={navLinkClass('/dashboard/laporan')}>Laporan Keuangan</Link>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Navbar Top */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {location.pathname.replace('/dashboard', '').replace('/', '') || 'Beranda'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Halo, <strong>{user.nama_lengkap || user.username}</strong></span>
            <button onClick={onLogout} className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition cursor-pointer">
              Keluar
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 overflow-auto">
          <Outlet /> {/* Di sinilah komponen halaman akan dimuat */}
        </div>
      </main>
    </div>
  );
}