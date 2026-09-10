import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/cart/useCart';
import { bookingParamsFrom } from '@/booking/booking.params';
import { availabilityQueryOptions } from '@/queries/availability.queries';
import { buttonStyles } from '@/components/ui/button';
import { formatDuration } from '@/utils/format';
import { DEFAULT_CURRENCY, formatPrice, sumKnownPrices } from '@/utils/money';

interface CartBarProps {
  /** A dónde sigue el asistente, o `null` si el paso tiene su propio botón. */
  nextPath: string | null;
  /** El texto del botón de continuar. */
  nextLabel: string;
}

/**
 * La barra de §21: lo elegido, siempre a la vista, con el paso siguiente a mano.
 *
 * POR QUÉ ES FIJA Y NO PARTE DEL CONTENIDO
 *
 * Elegir servicios es una lista larga —treinta tratamientos— y la decisión de
 * "ya está, sigamos" se toma en cualquier punto del recorrido. Un botón al final
 * de la lista obligaría a bajar hasta abajo cada vez que alguien agrega algo, y en
 * un teléfono eso es media pantalla de scroll por cada servicio. Fija abajo, el
 * resumen y el botón están donde el pulgar ya está.
 *
 * POR QUÉ NO APARECE CON EL CARRITO VACÍO
 *
 * Una barra que dijera "0 servicios" y ofreciera continuar sería una invitación a
 * avanzar hacia un asistente que no puede seguir: sin servicios no hay horarios
 * que pedir. Cuando no hay nada elegido, la barra no existe y lo único que se ve
 * es el catálogo.
 *
 * LA DURACIÓN TOTAL NO SE SUMA ACÁ
 *
 * Sale de `totalDurationMin`, que es el número que calculó el servidor para esa
 * selección y ese día (§20). Esa respuesta ya está en la caché si la persona pasó
 * por el paso de horario, y este componente la lee con `enabled: false`, que es la
 * forma de leer de la caché sin disparar una petición nueva. Si todavía no está,
 * no se muestra duración: sumar las duraciones de las tarjetas daría un número
 * parecido la mayoría de las veces y equivocado el día que un servicio tenga un
 * tiempo de preparación que el catálogo no conoce.
 */
export function CartBar({ nextPath, nextLabel }: CartBarProps) {
  const cart = useCart();
  const location = useLocation();

  const params = bookingParamsFrom(location.search);

  const availability = useQuery({
    ...availabilityQueryOptions({
      serviceIds: cart.items.map((item) => item.serviceId),
      // El día real, o cadena vacía. Con `enabled: false` abajo, la consulta nunca
      // se ejecuta: solo se usa para leer de la caché la respuesta que ya está
      // guardada bajo esa clave, la misma que dejó el paso de horario.
      date: params.date ?? '',
      professionalId: params.professionalId ?? undefined,
    }),
    enabled: false,
  });

  if (cart.count === 0) return null;

  const totalDurationMin =
    params.date === null ? null : (availability.data?.totalDurationMin ?? null);

  const partialPrice = sumKnownPrices(cart.items.map((item) => item.priceCents));
  const currency = cart.items[0]?.currency ?? DEFAULT_CURRENCY;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-ivory/95 backdrop-blur-sm">
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          {/* `aria-live` para que agregar un servicio se anuncie: quien no ve la
              barra actualizarse necesita saber que el toque hizo algo. */}
          <p className="truncate text-sm font-medium text-deep" aria-live="polite">
            {cart.count === 1
              ? '1 servicio seleccionado'
              : `${cart.count} servicios seleccionados`}
          </p>

          <p className="truncate text-xs text-ink-soft">
            {totalDurationMin !== null && (
              <span>{formatDuration(totalDurationMin)}</span>
            )}
            {totalDurationMin !== null && partialPrice !== null && <span> · </span>}
            {partialPrice !== null && (
              <span>
                {formatPrice(partialPrice, currency)}
                {/* Con un precio "a consultar" en el carrito, el total es la suma
                    de los que sí tienen precio. Decirlo evita que alguien lea un
                    número incompleto como si fuera el total del turno. */}
                {cart.items.some((item) => item.priceCents === null) && ' + a consultar'}
              </span>
            )}
          </p>
        </div>

        {nextPath !== null && (
          <Link
            to={nextPath}
            className={buttonStyles({ className: 'shrink-0 whitespace-nowrap' })}
          >
            {nextLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
