// =============================================================================
// KAYA KALPA — Cancelar un turno
// =============================================================================
// La usan las dos pantallas que muestran un turno —la confirmación y la consulta—
// porque las dos ofrecen lo mismo y ninguna debería tener su propia versión de qué
// invalidar después. Es corto, pero es exactamente el tipo de código que se copia
// una vez, se corrige en un solo lado, y seis meses después una de las dos
// pantallas muestra un turno cancelado como si siguiera en pie.
// =============================================================================

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { cancelBooking } from '@/api/bookings.api';
import { forgetCancelToken, getCancelToken } from '@/booking/cancel-tokens';
import { AVAILABILITY_KEY } from '@/queries/availability.queries';
import { BOOKINGS_KEY } from '@/queries/bookings.queries';

export interface BookingCancel {
  cancel: () => Promise<void>;
  isCancelling: boolean;
  /** El mensaje del último intento fallido, o `null`. */
  error: string | null;
}

/**
 * Cancela un turno y deja todo lo que eso cambia al día.
 *
 * EL TOKEN NO ES UN PARÁMETRO
 *
 * Se busca con `getCancelToken(code)` en el momento de cancelar, y no se recibe
 * desde afuera. El token vive en `localStorage` y la pantalla ya lo leyó para
 * consultar, pero leerlo de nuevo acá es lo que hace imposible cancelar con un
 * token que no corresponde a este código: no hay forma de pasarle a esta función
 * otro token que el guardado para ese turno.
 *
 * SE OLVIDA DESPUÉS, NO ANTES
 *
 * `forgetCancelToken` va después de que el servidor confirmó. Si se borrara antes y
 * la petición fallara —sin conexión, por ejemplo— la persona se quedaría sin el
 * token y sin forma de reintentar: el turno seguiría en pie y ya no habría con qué
 * cancelarlo desde ese navegador.
 */
export function useBookingCancel(code: string): BookingCancel {
  const queryClient = useQueryClient();

  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(async () => {
    const token = getCancelToken(code);
    if (token === null) return;

    setIsCancelling(true);
    setError(null);

    try {
      await cancelBooking(code, token);
      forgetCancelToken(code);

      // Las dos cosas que la cancelación dejó viejas. El turno, porque ahora está
      // cancelado; y la disponibilidad, porque ese horario volvió a estar libre
      // —sin esto, alguien que vuelva al asistente ese mismo día lo vería ocupado,
      // que es justo lo contrario de lo que acaba de pasar—.
      await queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
      await queryClient.invalidateQueries({ queryKey: [AVAILABILITY_KEY] });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No pudimos cancelar el turno. Volvé a intentar en unos minutos.',
      );
    } finally {
      setIsCancelling(false);
    }
  }, [code, queryClient]);

  return { cancel, isCancelling, error };
}
