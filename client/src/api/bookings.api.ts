import { apiRequest } from '@/api/client';
import type { BookingDetail, CreateBookingInput } from '@/types/booking';

/**
 * Reserva el turno.
 *
 * La respuesta trae el `cancelToken`, y **guardarlo no es opcional**: no hay envío
 * de correo, así que ese token es lo único que permite cancelar el turno más
 * adelante. Si se pierde, el código que se le muestra a la persona sirve para
 * consultar cuándo es, pero no para darlo de baja.
 *
 * Puede fallar con `SLOT_TAKEN` aunque el horario se haya visto disponible hace un
 * instante: entre la consulta de disponibilidad y esta petición, otra persona pudo
 * haber reservado el mismo horario. El servidor lo vuelve a verificar dentro de la
 * transacción y lo rechaza; el asistente vuelve al paso de horario.
 */
export function createBooking(input: CreateBookingInput): Promise<BookingDetail> {
  return apiRequest<BookingDetail>('/bookings', { method: 'POST', body: input });
}

/**
 * Consulta un turno por su código.
 *
 * `token` es opcional y cambia lo que se ve: sin él, solo cuándo es el turno; con
 * él, también los datos y la posibilidad de cancelar. Se manda cuando se lo tiene
 * guardado de cuando se reservó.
 */
export function fetchBookingByCode(
  code: string,
  token?: string,
  signal?: AbortSignal,
): Promise<BookingDetail> {
  const params = new URLSearchParams();
  if (token !== undefined && token.length > 0) params.set('token', token);

  const query = params.toString();
  return apiRequest<BookingDetail>(
    `/bookings/${encodeURIComponent(code)}${query.length > 0 ? `?${query}` : ''}`,
    signal ? { signal } : {},
  );
}

/** Cancela el turno. El token es obligatorio: es lo que prueba que es de quien dice. */
export function cancelBooking(code: string, token: string): Promise<BookingDetail> {
  return apiRequest<BookingDetail>(`/bookings/${encodeURIComponent(code)}/cancel`, {
    method: 'PATCH',
    body: { token },
  });
}
