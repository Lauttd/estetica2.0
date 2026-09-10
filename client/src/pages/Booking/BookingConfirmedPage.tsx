import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import {
  BookingDetailSkeleton,
  BookingDetailView,
  BookingNotFound,
} from '@/components/booking/BookingDetailView';
import { getCancelToken } from '@/booking/cancel-tokens';
import { useBookingCancel } from '@/booking/useBookingCancel';
import { ApiError } from '@/api/client';
import { useBookingByCode } from '@/queries/bookings.queries';
import { PATHS } from '@/routes/paths';

/**
 * El turno recién reservado.
 *
 * POR QUÉ ESTA PANTALLA EXISTE Y NO ALCANZA CON UN MENSAJE
 *
 * Lo único que le queda a quien reservó es el **código**, y no hay envío de correo
 * (§31: sin casilla configurada, mandar un correo sería inventar una
 * infraestructura que no existe). Si esta pantalla no lo mostrara grande y no
 * dejara claro que hay que guardarlo, cerrar la pestaña sería perder el turno de
 * vista para siempre.
 *
 * NO ESTÁ DENTRO DEL ASISTENTE
 *
 * La dirección cuelga de `/turnos` pero sin indicador de pasos ni barra: quien
 * llega acá ya reservó, y seguir mostrándole "paso 6 de 6" le haría pensar que
 * todavía le falta algo.
 */
export function BookingConfirmedPage() {
  const { code = '' } = useParams<{ code: string }>();

  // El token está guardado porque esta pantalla se abre inmediatamente después de
  // reservar. Si por algún motivo no estuviera, la consulta se hace igual y el
  // turno se muestra sin la posibilidad de cancelar.
  const token = getCancelToken(code);
  const booking = useBookingByCode(code, token);
  const { cancel, isCancelling, error } = useBookingCancel(code);

  return (
    <>
      <PageMeta
        title="Tu turno está reservado"
        description="Guardá el código de tu turno para consultarlo o cancelarlo cuando quieras."
      />

      <PageHeader
        title="¡Listo! Te esperamos"
        subtitle="Guardá este código: con él podés consultar o cancelar el turno."
      />

      {booking.isPending ? (
        <BookingDetailSkeleton />
      ) : booking.isError ? (
        <BookingNotFound
          message={
            booking.error instanceof ApiError
              ? booking.error.message
              : 'No pudimos cargar el turno.'
          }
        />
      ) : (
        <>
          <BookingDetailView
            booking={booking.data}
            /* El botón se ofrece solo si hay token: sin él el servidor rechazaría
               la cancelación, y un botón que lleva a un error seguro es peor que no
               tener el botón. */
            onCancel={
              token === null
                ? undefined
                : () => {
                    void cancel();
                  }
            }
            isCancelling={isCancelling}
          />

          {error !== null && (
            <p
              role="alert"
              className="mx-auto mt-4 max-w-2xl rounded-soft border border-red-700/40 bg-red-700/5 px-4 py-3 text-center text-sm text-ink"
            >
              {error}
            </p>
          )}
        </>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to={PATHS.home} className={buttonStyles({ variant: 'outline' })}>
          Volver al inicio
        </Link>
        <Link to={PATHS.bookingLookup} className={buttonStyles({ variant: 'outline' })}>
          Consultar otro turno
        </Link>
      </div>
    </>
  );
}
