import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PATHS } from '@/routes/paths';
import { Logo } from '@/components/ui/Logo';

const links = [
  { to: `${PATHS.admin}/dashboard`, label: 'Resumen' },
  { to: `${PATHS.admin}/turnos`, label: 'Turnos' },
  { to: `${PATHS.admin}/servicios`, label: 'Servicios' },
  { to: `${PATHS.admin}/configuracion`, label: 'Configuración' },
];

export function AdminLayout() {
  const { admin, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-beige bg-ivory">
        <div className="container-page flex min-h-16 items-center justify-between gap-4">
          <NavLink to={`${PATHS.admin}/dashboard`} aria-label="Ir al resumen del panel">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink-soft sm:inline">{admin?.name} · {admin?.role}</span>
            <button
              type="button"
              className="rounded-soft border border-beige px-3 py-2 text-forest hover:bg-cream"
              onClick={() => void cerrarSesion().then(() => navigate(PATHS.admin))}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Secciones del panel" className="flex gap-2 overflow-auto lg:block lg:space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-soft px-4 py-2 text-sm ${isActive ? 'bg-forest text-ivory' : 'text-ink-soft hover:bg-beige'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {admin?.role === 'ADMIN' && (
            <NavLink
              to={`${PATHS.admin}/usuarios`}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-soft px-4 py-2 text-sm ${isActive ? 'bg-forest text-ivory' : 'text-ink-soft hover:bg-beige'}`
              }
            >
              Usuarios
            </NavLink>
          )}
        </nav>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
