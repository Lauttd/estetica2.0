import { apiRequest } from '@/api/client';
import type { Professional } from '@/types/booking';

/**
 * Los profesionales que pueden hacer los servicios elegidos.
 *
 * El filtro se hace en el servidor y no acá: la asignación de qué puede hacer cada
 * profesional vive en la base y se edita desde el panel. Traerlos todos y filtrar
 * en el navegador mostraría como opción a alguien que no hace ese tratamiento, y
 * el error recién aparecería al confirmar el turno.
 *
 * Sin `serviceIds` devuelve todos los activos, que es lo que necesita la página
 * de nosotros.
 */
export function fetchProfessionals(
  serviceIds?: string[],
  signal?: AbortSignal,
): Promise<Professional[]> {
  const params = new URLSearchParams();

  if (serviceIds !== undefined && serviceIds.length > 0) {
    // Ordenados por el mismo motivo que en la disponibilidad: que la clave de
    // caché no dependa del orden en que se agregaron los servicios.
    params.set('serviceIds', [...serviceIds].sort().join(','));
  }

  const query = params.toString();
  return apiRequest<Professional[]>(
    `/professionals${query.length > 0 ? `?${query}` : ''}`,
    signal ? { signal } : {},
  );
}
