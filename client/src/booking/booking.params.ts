// =============================================================================
// KAYA KALPA — El día y el profesional, en la dirección
// =============================================================================
// Son los dos únicos datos del asistente que van en la URL, y por eso tienen su
// propio módulo: leerlos y escribirlos pasa en cuatro pantallas distintas, y
// hacerlo a mano en cada una es la forma más fácil de que una escriba `fecha` y
// otra `dia`.
// =============================================================================

import { BOOKING_PARAMS } from '@/routes/search-params';
import { parseDateOnly } from '@/utils/format';

export interface BookingParams {
  /** `'YYYY-MM-DD'`, o `null` si todavía no se eligió. */
  date: string | null;
  /** Id del profesional, o `null` para "el que esté disponible". */
  professionalId: string | null;
}

/**
 * Lee los dos parámetros de una cadena de consulta.
 *
 * Acepta las dos formas que devuelven los hooks de React Router: `useLocation()`
 * da la cadena `'?fecha=…'` y `useSearchParams()` da el objeto ya parseado. Las dos
 * sirven para construir un `URLSearchParams`, así que aceptar ambas evita que cada
 * pantalla tenga que convertir lo que ya tiene.
 *
 * Valida la forma de la fecha y descarta lo que no la tenga: `?fecha=mañana` en
 * una dirección escrita a mano llegaría a la consulta de disponibilidad y
 * volvería un error del servidor por algo que el asistente puede resolver solo
 * —tratándolo como "no hay fecha elegida" y mostrando el selector—.
 *
 * Se valida con `parseDateOnly`, que además de la forma comprueba que el día
 * exista: `2026-02-30` cumple el patrón y no es una fecha.
 */
export function bookingParamsFrom(search: string | URLSearchParams): BookingParams {
  const params = new URLSearchParams(search);

  const rawDate = params.get(BOOKING_PARAMS.date);
  const date = rawDate !== null && parseDateOnly(rawDate) !== null ? rawDate : null;

  const professionalId = params.get(BOOKING_PARAMS.professional);

  return {
    date,
    professionalId: professionalId === null || professionalId === '' ? null : professionalId,
  };
}

/**
 * Los parámetros para una dirección del asistente, conservando lo que ya había.
 *
 * Se parte de los actuales y se cambia solo lo que se pide, con `undefined` para
 * "no toques esto" y `null` para "sácalo". Esa distinción es la que permite
 * cambiar el día sin perder el profesional y elegir profesional sin perder el día,
 * sin que ninguna pantalla tenga que armar la dirección entera.
 */
export function withBookingParams(
  current: URLSearchParams,
  changes: { date?: string | null; professionalId?: string | null },
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (changes.date !== undefined) {
    if (changes.date === null) next.delete(BOOKING_PARAMS.date);
    else next.set(BOOKING_PARAMS.date, changes.date);
  }

  if (changes.professionalId !== undefined) {
    if (changes.professionalId === null) next.delete(BOOKING_PARAMS.professional);
    else next.set(BOOKING_PARAMS.professional, changes.professionalId);
  }

  return next;
}

/** La dirección completa de un paso, con los parámetros puestos. */
export function bookingPathWith(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query.length === 0 ? path : `${path}?${query}`;
}
