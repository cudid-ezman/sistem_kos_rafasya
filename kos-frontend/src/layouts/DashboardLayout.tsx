import { Outlet, Link, useLocation } from 'react-router-dom';
import type { UserProfile } from '../types/auth';

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

// Komponen Ikon Sederhana (Inline SVG agar tidak perlu install library)
const Icons = {
  Home: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  Room: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Bill: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Complaint: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Report: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
};

export default function DashboardLayout({ user, onLogout }: Props) {
  const location = useLocation();
  const currentRole = (user.role || '').toLowerCase();

  const isPemilik = currentRole === 'pemilik';
  const isPengurus = currentRole === 'pengurus' || currentRole === 'superadmin';
  const isPenghuni = currentRole === 'penghuni';

  // Fungsi helper untuk kelas navigasi yang modern
  const navLinkClass = (path: string, Icon: React.FC) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-2 ${
          isActive
            ? 'bg-primary-light text-primary border-l-4 border-primary'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
        }`}
      >
        <Icon />
        <span>{path === '/dashboard' ? 'Beranda' : path.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-surface flex font-sans">
      {/* Sidebar Modern */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Kos Rafasya</h1>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-light text-primary uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-1 overflow-y-auto">
          {navLinkClass('/dashboard', Icons.Home)}
          
          {isPengurus && (
            <>
              <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">Manajemen</div>
              {navLinkClass('/dashboard/kamar', Icons.Room)}
              {navLinkClass('/dashboard/penghuni', Icons.Users)}
              {navLinkClass('/dashboard/tagihan', Icons.Bill)}
              {navLinkClass('/dashboard/verifikasi', Icons.Check)}
              {navLinkClass('/dashboard/keluhan', Icons.Complaint)}
            </>
          )}

          {isPenghuni && (
            <>
              <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">Layanan Penghuni</div>
              {navLinkClass('/dashboard/tagihan-saya', Icons.Bill)}
              {navLinkClass('/dashboard/keluhan-saya', Icons.Complaint)}
            </>
          )}

          {isPemilik && (
            <>
              <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">Kepemilikan</div>
              {navLinkClass('/dashboard/laporan', Icons.Report)}
            </>
          )}
        </nav>

    
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar Modern */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 capitalize">
            {location.pathname === '/dashboard' ? 'Beranda' : location.pathname.replace('/dashboard/', '').replace(/-/g, ' ')}
          </h2>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user.nama_lengkap || user.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role} • Kamar {user.kamar || 'A12'}</p>
            </div>
            <div className="w-10 h-10 bg-primary-light text-primary rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">
              {(user.nama_lengkap || user.username).charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={onLogout} 
              className="ml-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 overflow-auto flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}