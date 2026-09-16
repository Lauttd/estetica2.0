// =============================================================================
// KAYA KALPA — Confirmar el turno
// =============================================================================
// Es el único lugar del asistente que manda la reserva, y por eso es también el
// único que decide qué hacer cuando falla. Está afuera de la pantalla de resumen
// porque lo que hay que hacer al fallar no es volver a dibujar el resumen: es
// mover a la persona a otro paso, descartar caché vieja y, en un caso, sacar algo
// del carrito. Nada de eso es una decisión de presentación.
//
// Lo que **no** hace es vaciar el carrito y el borrador al salir bien: eso pasó a
// `useBookingArrival`, del otro lado de la navegación. El comentario del `navigate`
// cuenta qué se rompía cuando se hacía acá.
// =============================================================================

import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { createBooking } from '@/api/bookings.api';
import { fetchAllServices } from '@/api/services.api';
import { useCart } from '@/cart/useCart';
import { useBooking } from '@/booking/useBooking';
import { rememberCancelToken } from '@/booking/cancel-tokens';
import { justBookedState } from '@/booking/booking.arrival';
import { handlingFor, type StaleData } from '@/booking/error-steps';
import { bookingParamsFrom, bookingPathWith } from '@/booking/booking.params';
import { BOOKING_STEPS } from '@/booking/booking.steps';
import { AVAILABILITY_KEY } from '@/queries/availability.queries';
import { bookingByCodeQueryOptions } from '@/queries/bookings.queries';
import { PROFESSIONALS_KEY } from '@/queries/professionals.queries';
import { ErrorCode, type ErrorCodeValue } from '@/types/api';
import { PATHS } from '@/routes/paths';

export interface BookingSubmit {
  /** Manda la reserva. No hace nada si todavía falta algún dato. */
  submit: () => Promise<void>;
  /** Mientras el servidor responde. El botón se apaga para no mandar dos veces. */
  isSubmitting: boolean;
}

export function useBookingSubmit(): BookingSubmit {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const cart = useCart();
  const booking = useBooking();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { slot, customer } = booking;
  // `clear` no está: el carrito no se vacía acá. Lo hace `useBookingArrival` al
  // llegar a la confirmación, y el comentario de más abajo explica por qué.
  const { items, removeItem } = cart;

  const submit = useCallback(async () => {
    // El guard del armazón ya garantiza que estos datos existen para llegar al
    // resumen. Se comprueba igual porque de acá sale una petición que crea un turno
    // real: mandarla con un `undefined` adentro sería pedirle al servidor que
    // adivine, y un turno mal creado no se deshace solo.
    if (slot === null || customer === null) return;

    const serviceIds = items.map((item) => item.serviceId);
    if (serviceIds.length === 0) return;

    // El profesional que se eligió vive en la dirección, no en el estado del
    // asistente: son los dos datos que se pueden compartir por enlace.
    const { professionalId } = bookingParamsFrom(location.search);

    setIsSubmitting(true);
    // El aviso anterior deja de valer en cuanto se reintenta: si no se limpia, un
    // error de hace dos intentos sigue en pantalla mientras se espera la respuesta.
    booking.setBanner(null);

    try {
      const detail = await createBooking({
        serviceIds,
        date: slot.forDate,
        startMin: slot.startMin,
        // El campo se omite si no se eligió a nadie: el servidor distingue "no me
        // importa quién" de "quiero a esta persona", y mandar `undefined` no es lo
        // mismo que no mandarlo.
        ...(professionalId !== null ? { professionalId } : {}),
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          ...(customer.email.length > 0 ? { email: customer.email } : {}),
          ...(customer.notes.length > 0 ? { notes: customer.notes } : {}),
        },
      });

      /**
       * El token de cancelación, guardado antes de cualquier otra cosa.
       *
       * No hay envío de correo: si esto se pierde —porque la navegación falla,
       * porque la persona cierra la pestaña en el instante siguiente— el turno
       * queda sin forma de cancelarse desde el sitio. Va primero por eso.
       */
      if (detail.cancelToken !== undefined) {
        rememberCancelToken(detail.code, detail.cancelToken);

        /**
         * Y la respuesta se deja además en la caché de la pantalla de
         * confirmación.
         *
         * Es la pantalla que ve todo el mundo y la única que no debería tener un
         * momento de carga: los datos ya están acá, recién llegados del servidor.
         * Sin esto, la confirmación pediría de nuevo el turno que acaba de crear y
         * mostraría un esqueleto en el medio.
         */
        queryClient.setQueryData(
          bookingByCodeQueryOptions(detail.code, detail.cancelToken).queryKey,
          detail,
        );
      }

      // El horario que se acaba de reservar ya no está libre: la lista que quedó en
      // caché para ese día es mentira a partir de este momento. Se descarta entera
      // para que volver al asistente muestre la disponibilidad real.
      await queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });

      /**
       * Y recién ahora se navega, sin tocar todavía el carrito ni el borrador.
       *
       * El orden no es un detalle de estilo: vaciarlos acá rompía la reserva
       * entera. `navigate` corre dentro de un `startTransition` de React Router 7
       * —o sea, es de baja prioridad—, así que si en el mismo instante se vacían el
       * carrito y el borrador, React dibuja primero esas actualizaciones urgentes y
       * deja la navegación para después. En ese render intermedio la dirección
       * todavía es `/turnos/resumen` con el carrito vacío, el guard de
       * `BookingLayout` ve un resumen sin datos y manda al primer paso: el turno
       * quedaba creado —el 201 ya había llegado— pero la persona terminaba en
       * `/turnos/servicios`, sin código y sin forma de cancelarlo.
       *
       * El estado del que depende el guard no se toca hasta que el guard se
       * desmontó. De eso se encarga `useBookingArrival`, del otro lado.
       *
       * `replace` para que el botón "atrás" no devuelva al resumen de un turno que
       * ya se reservó: atrás se vuelve al sitio, no a un formulario completado. Y
       * el `state` es lo que le dice a la confirmación que esta visita viene de
       * reservar, que es cuando corresponde descartar lo elegido.
       */
      navigate(PATHS.bookingConfirmed(detail.code), {
        replace: true,
        state: justBookedState(),
      });
    } catch (error) {
      const code: ErrorCodeValue =
        error instanceof ApiError ? error.code : ErrorCode.INTERNAL_ERROR;

      const handling = handlingFor(code);

      await refreshStale(queryClient, handling.refresh);

      // Los servicios que ya no se pueden reservar online se sacan del carrito
      // ahora, para que el paso de servicios se dibuje ya corregido. Cuál es lo
      // dice el servidor —se vuelve a pedir el catálogo—, no lo que el carrito
      // recuerda: este error significa justamente que lo que recuerda quedó viejo.
      if (handling.dropUnbookable) {
        const bookable = await fetchBookableIds();
        if (bookable !== null) {
          for (const item of items) {
            if (!bookable.has(item.serviceId)) removeItem(item.serviceId);
          }
          await queryClient.invalidateQueries({ queryKey: ['services'] });
        }
      }

      booking.setBanner({
        code,
        // El mensaje lo escribe el servidor y se muestra tal cual. El `??` cubre un
        // error que no vino de la API —una caída de red—, donde no hay mensaje que
        // mostrar y hay que decir algo.
        message:
          error instanceof ApiError
            ? error.message
            : 'No pudimos confirmar el turno. Revisá tu conexión y volvé a intentar.',
        details: error instanceof ApiError ? error.details : [],
      });

      // `step: null` es quedarse: hay errores que no se arreglan cambiando de
      // pantalla —el límite de intentos, una caída— y devolver a alguien que ya
      // completó todo sería sacarle el trabajo por un problema ajeno.
      if (handling.step !== null) {
        const step = BOOKING_STEPS.find((candidate) => candidate.key === handling.step);
        if (step !== undefined) {
          navigate(bookingPathWith(step.path, new URLSearchParams(location.search)));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [slot, customer, items, removeItem, booking, navigate, location.search, queryClient]);

  return { submit, isSubmitting };
}

/** Vuelve a pedir lo que el error dejó viejo. */
async function refreshStale(
  queryClient: QueryClient,
  stale: StaleData | null,
): Promise<void> {
  if (stale === 'availability') {
    await queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
  } else if (stale === 'professionals') {
    await queryClient.invalidateQueries({ queryKey: [PROFESSIONALS_KEY] });
  }
}

/**
 * Los identificadores de los servicios que hoy se pueden reservar online.
 *
 * Devuelve `null` —y no un conjunto vacío— cuando el catálogo no se puede volver a
 * pedir. La diferencia importa: un conjunto vacío diría "ninguno se puede
 * reservar" y el carrito quedaría vacío por una petición que falló de fondo.
 * Dejarlo como está es mejor: la persona reintenta y el servidor vuelve a decir
 * cuál es el servicio que no se puede reservar.
 */
async function fetchBookableIds(): Promise<Set<string> | null> {
  try {
    const services = await fetchAllServices();
    return new Set(
      services.filter((service) => service.bookableOnline).map((service) => service.id),
    );
  } catch {
    return null;
  }
}
