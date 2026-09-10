import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchBookingByCode } from '@/api/bookings.api';

/**
 * El espacio de nombres de los turnos vistos por el cliente.
 *
 * Está exportado por el mismo motivo que el de disponibilidad: la cancelación
 * invalida este prefijo desde otro módulo, y armar el prefijo a mano en dos
 * lugares es la forma más fácil de que un día dejen de coincidir y la pantalla
 * siga diciendo "confirmado" después de cancelar.
 */
export const BOOKINGS_KEY = 'bookings' as const;

/**
 * Un turno, por su código.
 *
 * EL TOKEN VA EN LA CLAVE, Y ESO ES DELIBERADO
 *
 * La misma dirección devuelve dos respuestas distintas según el token: sin él,
 * solo cuándo es el turno; con él, también los datos y la posibilidad de
 * cancelar. Si la clave no lo incluyera, entrar primero sin token dejaría la
 * respuesta pobre en caché y la pantalla no ofrecería cancelar aunque el
 * navegador tuviera el token guardado.
 *
 * `staleTime` corto: un turno cambia de estado cuando la estética lo confirma o
 * lo atiende, y la persona que está mirando su código merece ver el estado de
 * ahora, no el de hace cinco minutos.
 */
export const bookingByCodeQueryOptions = (code: string, token: string | null) =>
  queryOptions({
    queryKey: [BOOKINGS_KEY, 'detail', code, token] as const,
    queryFn: ({ signal }) => fetchBookingByCode(code, token ?? undefined, signal),
    staleTime: 30 * 1000,
  });

export function useBookingByCode(code: string, token: string | null) {
  return useQuery(bookingByCodeQueryOptions(code, token));
}
