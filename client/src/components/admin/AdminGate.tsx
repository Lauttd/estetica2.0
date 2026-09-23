import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PATHS } from '@/routes/paths';

export function AdminGate() {
  const { admin, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <div className="grid min-h-dvh place-items-center text-forest">Cargando panel…</div>;
  const isLoginPage =
    location.pathname === PATHS.admin ||
    location.pathname === `${PATHS.admin}/login`;
  if (admin === null && isLoginPage) return <Outlet />;
  if (admin === null) {
    return <Navigate to={`${PATHS.admin}/login`} replace state={{ from: location.pathname }} />;
  }
  if (admin.mustChangePassword && !location.pathname.endsWith('/cambiar-password')) {
    return <Navigate to={`${PATHS.admin}/cambiar-password`} replace />;
  }
  return <Outlet />;
}
