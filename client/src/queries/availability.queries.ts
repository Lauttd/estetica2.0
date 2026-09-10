import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchAvailability, type AvailabilityQuery } from '@/api/availability.api';

/**
 * La clave de caché de la disponibilidad.
 *
 * Está exportada porque la invalidación se hace por prefijo desde otro módulo —el
 * asistente descarta todo lo de disponibilidad cuando el servidor le dice que el
 * horario se ocupó— y armar ese prefijo a mano en dos lugares sería la forma más
 * fácil de que un día dejen de coincidir y la lista vieja siga apareciendo.
 */
export const AVAILABILITY_KEY = 'availability' as const;

/**
 * Los horarios de un día.
 *
 * POR QUÉ NO SE CACHEA COMO EL CATÁLOGO
 *
 * El catálogo aguanta media hora en caché sin problema: un precio que cambió hace
 * diez minutos no le hace mal a nadie. La disponibilidad no: cada minuto que pasa
 * es un minuto más en el que alguien pudo reservar uno de esos horarios. Pero
 * tampoco conviene pedirla de nuevo cada vez que se toca "atrás", porque ir y
 * volver entre el día y el horario es parte normal de elegir.
 *
 * Medio minuto es el punto medio: no se repite la petición mientras alguien
 * completa el paso, y si dejó la pantalla abierta y volvió, la lista se rearma.
 * Además, cuando el servidor rechaza una reserva porque el horario se ocupó, el
 * asistente invalida este prefijo entero y la lista se pide de nuevo en el acto.
 */
export const availabilityQueryOptions = (query: AvailabilityQuery) =>
  queryOptions({
    // Los servicios van ordenados dentro de la clave por el mismo motivo por el
    // que van ordenados en la petición: que el orden en que se agregaron al
    // carrito no cree dos entradas de caché para la misma consulta.
    queryKey: [
      AVAILABILITY_KEY,
      query.date,
      query.professionalId ?? null,
      [...query.serviceIds].sort(),
    ] as const,
    queryFn: ({ signal }) => fetchAvailability(query, signal),
    staleTime: 30 * 1000,
  });

export function useAvailability(query: AvailabilityQuery, enabled = true) {
  return useQuery({ ...availabilityQueryOptions(query), enabled });
}
