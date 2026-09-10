import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchProfessionals } from '@/api/professionals.api';

export const PROFESSIONALS_KEY = 'professionals' as const;

/**
 * Los profesionales que pueden hacer una lista de servicios.
 *
 * Se cachean diez minutos porque lo que cambia —a quién le corresponde cada
 * tratamiento— se edita desde el panel y no cambia mientras alguien reserva. Diez
 * y no treinta como el catálogo: cuando la estética suma un tratamiento a un
 * profesional, lo razonable es que la próxima persona que reserve ya lo vea, sin
 * esperar a que venza una caché larga.
 *
 * El prefijo se invalida entero cuando el servidor responde
 * `PROFESSIONAL_UNAVAILABLE`: eso significa que la lista que se mostró quedó vieja.
 */
export const professionalsQueryOptions = (serviceIds?: string[]) =>
  queryOptions({
    // `null` cuando no hay filtro, para que "todos" sea una entrada distinta de
    // "los de estos servicios" y no dos claves que se pisan.
    queryKey: [
      PROFESSIONALS_KEY,
      serviceIds === undefined || serviceIds.length === 0 ? null : [...serviceIds].sort(),
    ] as const,
    queryFn: ({ signal }) => fetchProfessionals(serviceIds, signal),
    staleTime: 10 * 60 * 1000,
  });

export function useProfessionals(serviceIds?: string[], enabled = true) {
  return useQuery({ ...professionalsQueryOptions(serviceIds), enabled });
}
