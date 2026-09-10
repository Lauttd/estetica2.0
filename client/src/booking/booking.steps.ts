// =============================================================================
// KAYA KALPA — Los pasos del asistente de turnos
// =============================================================================
// §19 describe nueve pasos; acá son seis pantallas, y cada una junta los pasos que
// la persona hace de corrido:
//
//   servicios     ← pasos 1, 2 y 3 (categoría, servicio, información)
//   profesional   ← paso 4
//   fecha         ← paso 5
//   horario       ← pasos 6 y 7 (ver los horarios y elegir uno)
//   datos         ← paso 8
//   resumen       ← paso 9
//
// Elegir categoría, servicio y ver la información es una sola cosa en la práctica:
// el catálogo ya tiene el filtro por categoría arriba, la grilla de servicios
// debajo y el detalle en un modal, así que partirla en tres pantallas serían tres
// "siguiente" para hacer lo que se hace de una sentada. Ver los horarios y elegir
// uno tampoco se separa: la lista *es* el selector.
//
// Lo que **no** se junta es la fecha con el horario. Son dos pasos porque son dos
// errores distintos —la fecha quedó fuera de la ventana de reserva, el horario se
// ocupó mientras completabas el formulario— y cada uno tiene que devolver a la
// persona al lugar donde está el problema. Juntarlos obligaría a adivinar a cuál
// de los dos volver.
//
// La lista está ordenada y el orden es el del asistente. De acá salen el indicador
// de progreso y las flechas de "volver", así que agregar un paso en el medio no
// requiere tocar ninguna pantalla.
// =============================================================================

import { PATHS, type BookingStepKey } from '@/routes/paths';

export interface BookingStep {
  key: BookingStepKey;
  /** La dirección completa, para enlazar. */
  path: string;
  /** Cómo se llama en el indicador de progreso. Corto: entra en un teléfono. */
  label: string;
}

/**
 * El paso donde arranca el asistente.
 *
 * Está separado y exportado porque hay dos lugares que necesitan "el primero" sin
 * haber recorrido nada: `/turnos` a secas, que redirige acá, y el respaldo del
 * recorrido de pasos. Escribirlo dos veces sería la forma más fácil de que un día
 * el asistente arranque en un lado y la redirección mande al otro.
 */
export const FIRST_BOOKING_STEP: BookingStep = {
  key: 'services',
  path: PATHS.bookingStepPath('services'),
  label: 'Servicios',
};

export const BOOKING_STEPS: readonly BookingStep[] = [
  FIRST_BOOKING_STEP,
  { key: 'professional', path: PATHS.bookingStepPath('professional'), label: 'Profesional' },
  { key: 'date', path: PATHS.bookingStepPath('date'), label: 'Día' },
  { key: 'slot', path: PATHS.bookingStepPath('slot'), label: 'Horario' },
  { key: 'details', path: PATHS.bookingStepPath('details'), label: 'Tus datos' },
  { key: 'summary', path: PATHS.bookingStepPath('summary'), label: 'Confirmar' },
];

/**
 * En qué lugar del asistente está una dirección.
 *
 * Devuelve `-1` si la dirección no es la de ningún paso. Se compara contra la
 * dirección entera y sin la barra final, porque `/turnos/fecha/` y `/turnos/fecha`
 * son la misma pantalla y no pueden caer en posiciones distintas.
 */
export function bookingStepIndex(pathname: string): number {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return BOOKING_STEPS.findIndex((step) => step.path === normalized);
}
