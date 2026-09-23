import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { fetchAdminBookings, updateBookingStatus } from '@/api/admin.api';
import type { AdminBooking, BookingStatus } from '@/types/admin';
import { formatLongDateOnly } from '@/utils/format';

const labels: Record<BookingStatus, string> = {
  PENDING: 'Por confirmar',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Atendido',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Ausente',
};

function BookingRow({ booking }: { booking: AdminBooking }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  async function change(status: BookingStatus) {
    setError(null);
    try {
      await updateBookingStatus(booking.id, status);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'No pudimos actualizar el turno.',
      );
    }
  }

  return (
    <li className="rounded-card border border-beige bg-ivory p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-deep">
            {booking.startTime} – {booking.endTime}
          </p>
          <p className="text-sm font-medium text-forest">
            {formatLongDateOnly(booking.date)}
          </p>
          <p className="text-sm">
            {booking.customer.firstName} {booking.customer.lastName} ·{' '}
            {booking.professional.name}
          </p>
          <p className="text-sm text-ink-soft">{booking.customer.phone}</p>
          {booking.customer.email !== null && (
            <p className="text-sm text-ink-soft">{booking.customer.email}</p>
          )}
        </div>
        <span className="rounded-full bg-beige px-3 py-1 text-xs">
          {labels[booking.status]}
        </span>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        {booking.services.map((service) => service.name).join(' · ')}
      </p>

      {booking.allowedTransitions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {booking.allowedTransitions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => void change(status)}
              className="rounded-soft bg-forest px-3 py-2 text-sm text-ivory hover:bg-forest-dark"
            >
              Marcar como {labels[status].toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {error !== null && (
        <p role="alert" className="mt-2 text-sm text-deep">
          {error}
        </p>
      )}
    </li>
  );
}

function BookingSection({
  title,
  description,
  bookings,
}: {
  title: string;
  description: string;
  bookings: AdminBooking[];
}) {
  return (
    <section aria-labelledby={`agenda-${title}`} className="space-y-3">
      <div>
        <h2 id={`agenda-${title}`} className="text-2xl text-deep">
          {title} <span className="text-base text-ink-soft">({bookings.length})</span>
        </h2>
        <p className="text-sm text-ink-soft">{description}</p>
      </div>
      {bookings.length === 0 ? (
        <p className="rounded-card border border-dashed border-beige p-4 text-sm text-ink-soft">
          No hay turnos en esta sección.
        </p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminAgendaPage() {
  const bookings = useQuery({
    queryKey: ['admin', 'bookings', 'all'],
    queryFn: () => fetchAdminBookings(),
  });

  const items = bookings.data?.items ?? [];
  const cancelled = items.filter((booking) => booking.status === 'CANCELLED');
  const pending = items.filter((booking) => booking.status === 'PENDING');
  const confirmed = items.filter(
    (booking) => booking.status !== 'CANCELLED' && booking.status !== 'PENDING',
  );

  return (
    <section>
      <div className="mb-8">
        <div>
          <p className="text-sm uppercase tracking-widest text-forest">Panel</p>
          <h1 className="text-4xl">Agenda</h1>
          <p className="mt-2 text-ink-soft">
            Los turnos están separados por su estado.
          </p>
        </div>
      </div>

      {bookings.isPending && <p>Cargando turnos…</p>}
      {bookings.isError && (
        <p role="alert" className="rounded-soft bg-beige p-4">
          No pudimos cargar la agenda. Intentá recargar.
        </p>
      )}
      {bookings.data && (
        <div className="space-y-10">
          <BookingSection
            title="Por confirmar"
            description="Turnos recibidos que todavía necesitan confirmación."
            bookings={pending}
          />
          <BookingSection
            title="Confirmados"
            description="Turnos confirmados y estados posteriores de atención."
            bookings={confirmed}
          />
          <BookingSection
            title="Cancelados"
            description="Turnos que ya no ocupan ese horario."
            bookings={cancelled}
          />
        </div>
      )}
    </section>
  );
}
