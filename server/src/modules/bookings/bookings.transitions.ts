// =============================================================================
// KAYA KALPA — Qué cambios de estado permite cada estado
// =============================================================================
// El panel no puede dejar el turno en cualquier estado: hay combinaciones que
// rompen cosas. Esta tabla es la única definición de esas reglas, y la usan los
// dos lados —el servicio, para aceptar o rechazar el cambio, y la respuesta, para
// decirle al panel qué botones mostrar—. Si estuvieran escritas dos veces, el
// panel ofrecería un botón que la API después rechaza, que es la peor forma de
// fallar: el usuario ya hizo el clic.
//
// POR QUÉ CADA UNA
//
//   CANCELLED es terminal. Cancelar libera el horario —el constraint de la
//   migración `booking_overlap_guard` deja de contar la fila—, así que para
//   cuando alguien quisiera revivir el turno ese horario ya se le pudo haber
//   vendido a otra persona. Reactivarlo chocaría contra el constraint y Postgres
//   lo rechazaría con 23P01. Ofrecer el botón sería ofrecer algo que la base no
//   permite: si el turno se canceló por error, lo correcto es reservarlo de nuevo.
//
//   COMPLETED y NO_SHOW sí vuelven a CONFIRMED. En esos dos estados la franja
//   quedó libre para el constraint —son "pasado"—, y las dos razones para volver
//   son reales: se marcó completado el turno equivocado, o el cliente llegó tarde
//   y finalmente se lo atendió. El riesgo de que el horario ya esté ocupado por
//   otro turno existe y no se esconde: la transacción lo detecta y responde con
//   un mensaje claro en vez de un 500.
//
//   Desde PENDING y CONFIRMED se puede marcar NO_SHOW directamente, sin pasar por
//   CONFIRMED: la estética trabaja el día entero y carga los estados a la noche,
//   cuando ya sabe quién vino y quién no. Obligarla a confirmar un turno para
//   después marcarlo como ausente sería inventar una precisión que no tuvo.
// =============================================================================

import { BookingStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  // Deshacer un tipeo. El turno vuelve a ocupar la agenda.
  [BookingStatus.COMPLETED]: [BookingStatus.CONFIRMED],
  // El cliente llegó tarde y se lo terminó atendiendo.
  [BookingStatus.NO_SHOW]: [BookingStatus.CONFIRMED],
  [BookingStatus.CANCELLED]: [],
};

/** Los estados a los que se puede pasar desde `status`. Puede ser vacío. */
export function allowedTransitionsFrom(status: BookingStatus): BookingStatus[] {
  return [...ALLOWED_TRANSITIONS[status]];
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Cómo se nombra cada estado en un mensaje.
 *
 * Va acá y no en el frontend porque el error que explica por qué un cambio no se
 * permite se arma en el servidor, y decir "de CONFIRMED a PENDING" a alguien que
 * atiende un salón no explica nada.
 */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'pendiente',
  [BookingStatus.CONFIRMED]: 'confirmado',
  [BookingStatus.COMPLETED]: 'atendido',
  [BookingStatus.CANCELLED]: 'cancelado',
  [BookingStatus.NO_SHOW]: 'ausente',
};

/**
 * Motivo por defecto que queda anotado en el historial cuando el panel no
 * escribe uno.
 *
 * El historial no se muestra en ningún lado todavía, pero es lo único que
 * permite reconstruir después por qué un turno terminó como terminó. Un renglón
 * vacío ahí es un dato perdido para siempre.
 */
export const DEFAULT_REASON: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Vuelto a pendiente desde el panel',
  [BookingStatus.CONFIRMED]: 'Confirmado desde el panel',
  [BookingStatus.COMPLETED]: 'Marcado como atendido desde el panel',
  [BookingStatus.CANCELLED]: 'Cancelado desde el panel',
  [BookingStatus.NO_SHOW]: 'El cliente no se presentó',
};
