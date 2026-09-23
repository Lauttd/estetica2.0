import { Link } from 'react-router-dom';
import { useState } from 'react';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';
import {
  BookingDetailSkeleton,
  BookingDetailView,
  BookingNotFound,
} from '@/components/booking/BookingDetailView';
import { getRememberedBookingCodes, getCancelToken } from '@/booking/cancel-tokens';
import { useBookingByCode } from '@/queries/bookings.queries';
import { useBookingCancel } from '@/booking/useBookingCancel';
import { ApiError } from '@/api/client';

export function MyBookingsPage() {
  const [codes] = useState(() => getRememberedBookingCodes());

  return (
    <>
      <PageMeta
        title="Mis turnos"
        description="Consultá un turno existente o agendá uno nuevo en KAYA KALPA."
      />

      <PageHeader
        title="Mis turnos"
        subtitle="Consultá el turno que ya agendaste o elegí un día y horario para reservar uno nuevo."
      />

      <section className="container-page mx-auto max-w-2xl pb-16">
        {codes.length > 0 ? (
          <div className="space-y-6">
            {codes.map((code) => (
              <RememberedBooking key={code} code={code} />
            ))}
          </div>
        ) : (
          <div className="mb-8 rounded-card border border-beige bg-ivory p-6 text-center">
            <p className="text-ink">
              Todavía no tenés turnos guardados en este dispositivo.
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Cuando agendes uno, aparecerá automáticamente acá.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link to={PATHS.bookingLookup} className={buttonStyles({ size: 'lg', fullWidth: true })}>
            Consultar mi turno
          </Link>
          <Link
            to={PATHS.booking}
            className={buttonStyles({ variant: 'outline', size: 'lg', fullWidth: true })}
          >
            Agendar un turno
          </Link>
        </div>
      </section>
    </>
  );
}

function RememberedBooking({ code }: { code: string }) {
  const token = getCancelToken(code);
  const booking = useBookingByCode(code, token);
  const { cancel, isCancelling, error } = useBookingCancel(code);

  if (booking.isPending) return <BookingDetailSkeleton />;
  if (booking.isError) {
    return (
      <BookingNotFound
        message={
          booking.error instanceof ApiError
            ? booking.error.message
            : 'No pudimos cargar este turno.'
        }
      />
    );
  }

  return (
    <div>
      <BookingDetailView
        booking={booking.data}
        onCancel={token === null ? undefined : () => void cancel()}
        isCancelling={isCancelling}
      />
      {error !== null && (
        <p role="alert" className="mt-3 text-center text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
