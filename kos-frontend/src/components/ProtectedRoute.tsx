import { Navigate, Outlet } from 'react-router-dom';
import type { UserProfile } from '../types/auth';

interface Props {
  user: UserProfile | null;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ user, allowedRoles }: Props) {
  // Jika belum login, tendang ke halaman depan (Login)
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Jika halaman butuh role khusus dan role user tidak cocok, blokir!
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Jika aman, render komponen anak (Outlet)
  return <Outlet />;
}