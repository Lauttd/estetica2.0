// =============================================================================
// KAYA KALPA — Estados de turno que ocupan la agenda
// =============================================================================
// Está acá, y no dentro de un módulo, porque lo usan dos que no se conocen entre
// sí: disponibilidad (para saber qué turnos restar) y reservas (para saber cuáles
// cuentan como activos). Si cada uno tuviera su propia lista, tarde o temprano una
// cambiaría sin la otra y la disponibilidad ofrecería horarios ya tomados.
//
// Tiene que coincidir con el `WHERE` del constraint `bookings_no_overlap` de la
// migración `booking_overlap_guard`: es la misma definición de "turno que ocupa",
// escrita una vez en SQL (para el motor de base de datos) y otra en TypeScript
// (para la aplicación). Si se agrega un estado acá, hay que agregarlo también allá.
// =============================================================================

import { BookingStatus } from '@prisma/client';

/** Los estados en los que un turno sigue reservando su franja horaria. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

/** Los estados en los que el turno ya no ocupa lugar y es histórico. */
export const CLOSED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
];
