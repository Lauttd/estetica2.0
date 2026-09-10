// =============================================================================
// KAYA KALPA — Disponibilidad
// =============================================================================
// La única fuente de horarios del sitio (§20).
// =============================================================================

import { apiRequest } from '@/api/client';
import type { AvailabilityResult } from '@/types/booking';

export interface AvailabilityQuery {
  /** Los servicios que va a incluir el turno. Al menos uno. */
  serviceIds: string[];
  /** Sin esto, el servidor calcula sobre todos los que puedan hacerlos. */
  professionalId?: string | undefined;
  /** `'YYYY-MM-DD'`. */
  date: string;
}

/**
 * Los horarios que el servidor ofrece para un día.
 *
 * `serviceIds` viaja separado por comas y **ordenado**, y el orden no es cosmético:
 * es lo que hace que la clave de caché sea la misma sin importar en qué orden se
 * agregaron los servicios al carrito. Sin eso, agregar "manicura" antes que
 * "pedicura" y al revés darían dos entradas de caché para la misma consulta, y
 * volver a un paso anterior pediría de nuevo algo que ya estaba.
 *
 * El orden se fija acá y no en quien llama para que no dependa de que cada
 * pantalla se acuerde.
 */
export function fetchAvailability(
  query: AvailabilityQuery,
  signal?: AbortSignal,
): Promise<AvailabilityResult> {
  const params = new URLSearchParams();
  params.set('serviceIds', [...query.serviceIds].sort().join(','));
  params.set('date', query.date);
  if (query.professionalId !== undefined) {
    params.set('professionalId', query.professionalId);
  }

  return apiRequest<AvailabilityResult>(
    `/availability?${params.toString()}`,
    signal ? { signal } : {},
  );
}
