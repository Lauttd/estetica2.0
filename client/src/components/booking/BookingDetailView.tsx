import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';
import { formatLongDateOnly } from '@/utils/format';
import { DEFAULT_CURRENCY, formatPrice } from '@/utils/money';
import type { BookingDetail, BookingStatus } from '@/types/booking';

interface BookingDetailViewProps {
  booking: BookingDetail;
  /** Cancela el turno. Si no se pasa, no se ofrece el botón. */
  onCancel?: (() => void) | undefined;
  /** Mientras el servidor responde a la cancelación. */
  isCancelling?: boolean | undefined;
}

/**
 * Un turno, dibujado igual en la confirmación y en la consulta.
 *
 * SON LA MISMA PANTALLA CON DOS ENTRADAS
 *
 * Alguien que acaba de reservar y alguien que vuelve una semana después con el
 * código quieren ver exactamente lo mismo: cuándo es su turno y con quién. Lo
 * único que cambia es el texto de arriba y si se llegó desde una reserva recién
 * hecha. Tener dos componentes con el mismo contenido sería la forma más segura de
 * que uno de los dos se actualice y el otro no —y el que no se actualiza es el que
 * casi nadie mira, que es justamente el que hay que cuidar—.
 *
 * QUÉ NO SE MUESTRA Y POR QUÉ
 *
 * Acá no hay nombre, teléfono ni correo de nadie, y no es un olvido: la respuesta
 * pública del servidor no los incluye. El código de un turno es corto y se dice en
 * voz alta, así que cualquiera que lo escuche podría abrir esta pantalla; lo que se
 * ve es lo mínimo para reconocer el turno propio —cuándo, de qué, con quién— y
 * nada más.
 */
export function BookingDetailView({
  booking,
  onCancel,
  isCancelling = false,
}: BookingDetailViewProps) {
  const currency = DEFAULT_CURRENCY;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-card border border-beige bg-ivory p-6 text-center">
        <p className="text-xs font-medium tracking-wider text-olive uppercase">
          Tu código
        </p>
        {/* Es el dato que la persona va a copiar, dictar o anotar. Va grande y con
            `select-all` para que un toque lo seleccione entero en el teléfono. */}
        <p className="mt-2 font-mono text-3xl tracking-widest text-deep select-all">
          {booking.code}
        </p>
        <p className="mt-3">
          <StatusBadge status={booking.status} />
        </p>
      </section>

      <section className="rounded-card border border-beige bg-ivory p-6">
        <h2 className="text-xs font-medium tracking-wider text-olive uppercase">
          Cuándo
        </h2>

        <p className="mt-3 text-lg text-deep">
          {formatLongDateOnly(booking.date)}
        </p>
        <p className="text-sm text-ink-soft">A las {booking.startTime}</p>

        <p className="mt-4 text-sm text-ink">
          Te atiende <strong className="font-medium">{booking.professional.name}</strong>.
        </p>
      </section>

      <section className="rounded-card border border-beige bg-ivory p-6">
        <h2 className="text-xs font-medium tracking-wider text-olive uppercase">
          Servicios
        </h2>

        <ul className="mt-3 space-y-3">
          {booking.services.map((line) => (
            <li
              key={line.serviceId}
              className="flex items-baseline justify-between gap-4"
            >
              <span className="min-w-0">
                <span className="block text-sm text-ink">{line.name}</span>
              </span>
              <span className="shrink-0 text-sm text-ink">
                {formatPrice(line.priceCents, currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-beige pt-4">
          <span className="text-sm text-ink-soft">Total</span>
          <span className="text-base font-medium text-deep">
            {formatPrice(booking.totalPriceCents, currency)}
            {/* El servidor suma solo los precios cargados. Si alguno está a
                consultar, este número es parcial y hay que decirlo: leerlo como el
                total del turno sería un malentendido sobre lo que va a costar. */}
            {booking.hasPriceOnRequest && (
              <span className="ml-1 text-xs font-normal text-ink-soft">
                + a consultar
              </span>
            )}
          </span>
        </div>
      </section>

      {onCancel !== undefined && booking.canCancel && (
        <section className="rounded-card border border-beige bg-ivory p-6">
          <h2 className="text-xs font-medium tracking-wider text-olive uppercase">
            Cancelar
          </h2>

          <p className="mt-3 text-sm text-ink-soft">
            Si no podés venir, avisanos con tiempo así le dejamos el lugar a otra
            persona.
          </p>

          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className={buttonStyles({
              variant: 'outline',
              className: 'mt-4 disabled:opacity-60',
            })}
          >
            {isCancelling ? 'Cancelando…' : 'Cancelar el turno'}
          </button>
        </section>
      )}

      {!booking.canCancel && booking.status !== 'CANCELLED' && (
        <p className="text-center text-sm text-ink-soft">
          Este turno ya no se puede cancelar desde el sitio. Escribinos y lo vemos.
        </p>
      )}
    </div>
  );
}

/**
 * El estado, en castellano y con el color que le corresponde.
 *
 * La tabla está completa y tipada contra `BookingStatus`: si el servidor agrega un
 * estado nuevo, esto deja de compilar en vez de mostrar el código crudo en inglés
 * —que es lo que pasaría con un `??` de respaldo—.
 */
const STATUS_LABEL: Record<BookingStatus, { text: string; className: string }> = {
  PENDING: {
    text: 'Pendiente de confirmación',
    className: 'border-olive/40 bg-olive/10 text-deep',
  },
  CONFIRMED: {
    text: 'Confirmado',
    className: 'border-forest/40 bg-forest/10 text-deep',
  },
  COMPLETED: {
    text: 'Realizado',
    className: 'border-beige bg-beige/40 text-ink-soft',
  },
  CANCELLED: {
    text: 'Cancelado',
    className: 'border-beige bg-beige/40 text-ink-soft',
  },
  NO_SHOW: {
    text: 'No asististe',
    className: 'border-beige bg-beige/40 text-ink-soft',
  },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { text, className } = STATUS_LABEL[status];

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  );
}

/**
 * El turno no está.
 *
 * Pasa cuando alguien escribe una dirección con un código inventado. El mensaje no
 * distingue "no existe" de "no es tuyo" a propósito: el servidor responde lo mismo
 * en los dos casos, y con razón —decir "ese código existe pero no es tuyo" sería
 * confirmar que existe—.
 */
export function BookingNotFound({ message }: { message: string }) {
  return (
    <div
      className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>

      <Link
        to={PATHS.bookingLookup}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Probar con otro código
      </Link>
    </div>
  );
}

/**
 * Lo que se ve mientras llega el turno.
 *
 * Tres bloques de la altura de las tres secciones reales, y no un spinner: cuando
 * los datos llegan, nada salta de lugar.
 */
export function BookingDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-5"
      aria-busy="true"
      aria-label="Cargando el turno"
    >
      <div className="h-36 animate-pulse rounded-card bg-beige/50" />
      <div className="h-40 animate-pulse rounded-card bg-beige/50" />
      <div className="h-48 animate-pulse rounded-card bg-beige/50" />
    </div>
  );
}
