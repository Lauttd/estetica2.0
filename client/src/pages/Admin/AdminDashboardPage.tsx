import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminBookings, fetchAdminServices } from '@/api/admin.api';
import { PATHS } from '@/routes/paths';
import { todayDateOnly } from '@/utils/format';

const tarjetas = [
  {
    href: `${PATHS.admin}/turnos`,
    titulo: 'Turnos',
    texto: 'Consultá la agenda y actualizá el estado de cada turno.',
  },
  {
    href: `${PATHS.admin}/servicios`,
    titulo: 'Servicios',
    texto: 'Revisá el catálogo y mantené los precios al día.',
  },
  {
    href: `${PATHS.admin}/configuracion`,
    titulo: 'Configuración',
    texto: 'Editá los datos que se muestran en el sitio público.',
  },
];

export function AdminDashboardPage() {
  const fecha = todayDateOnly();
  const turnos = useQuery({
    queryKey: ['admin', 'dashboard', 'bookings', fecha],
    queryFn: () => fetchAdminBookings(fecha),
  });
  const servicios = useQuery({
    queryKey: ['admin', 'dashboard', 'services'],
    queryFn: () => fetchAdminServices({ active: true }),
  });

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-forest">Panel</p>
        <h1 className="text-4xl">Resumen</h1>
        <p className="mt-2 text-ink-soft">Una vista rápida de lo que necesita atención hoy.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-card border border-beige bg-ivory p-5 shadow-card">
          <p className="text-sm text-ink-soft">Turnos de hoy</p>
          <p className="mt-2 text-3xl font-semibold text-deep">
            {turnos.isPending
              ? '…'
              : turnos.isError
                ? '—'
                : turnos.data.pagination?.total ?? turnos.data.items.length}
          </p>
        </article>
        <article className="rounded-card border border-beige bg-ivory p-5 shadow-card">
          <p className="text-sm text-ink-soft">Servicios activos</p>
          <p className="mt-2 text-3xl font-semibold text-deep">
            {servicios.isPending
              ? '…'
              : servicios.isError
                ? '—'
                : servicios.data.pagination?.total ?? servicios.data.items.length}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tarjetas.map((tarjeta) => (
          <Link
            key={tarjeta.href}
            to={tarjeta.href}
            className="rounded-card border border-beige bg-ivory p-5 shadow-card transition hover:border-forest hover:shadow-float"
          >
            <h2 className="text-xl text-deep">{tarjeta.titulo}</h2>
            <p className="mt-2 text-sm text-ink-soft">{tarjeta.texto}</p>
            <span className="mt-4 inline-block text-sm font-medium text-forest">Abrir sección →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
