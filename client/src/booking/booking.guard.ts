// =============================================================================
// KAYA KALPA — Hasta dónde se puede llegar
// =============================================================================
// El asistente tiene las direcciones de todos sus pasos, así que cualquiera puede
// escribir `/turnos/resumen` con el carrito vacío. Sin este control, esa pantalla
// se dibujaría con datos que no existen —un turno sin servicios, sin día y sin
// hora— y el error aparecería recién al confirmar, del lado del servidor, con un
// mensaje que no le sirve a nadie.
//
// POR QUÉ ES UN MÓDULO APARTE Y NO UN `if` EN EL LAYOUT
//
// Porque es una decisión pura sobre el estado del asistente: no mira el DOM, no
// pide nada y no depende de React. Eso la hace verificable sola, y hace que el día
// que alguien agregue un paso tenga un solo lugar donde decir qué necesita ese
// paso para poder mostrarse.
// =============================================================================

import type { BookingStepKey } from '@/routes/paths';
import { BOOKING_STEPS, FIRST_BOOKING_STEP } from './booking.steps';
import { isSlotValidFor, type ChosenSlot, type CustomerDraft } from './booking.types';

export interface BookingProgress {
  serviceIds: string[];
  date: string | null;
  professionalId: string | null;
  slot: ChosenSlot | null;
  customer: CustomerDraft | null;
}

/**
 * Qué necesita cada paso para poder mostrarse.
 *
 * Cada uno dice su condición **entera**, sin dar por sentado que los anteriores se
 * cumplen: el paso de horario exige que haya servicios y fecha, no solo que haya
 * fecha. Es más repetitivo de leer y es a propósito — una tabla donde cada fila se
 * entiende sola no se rompe cuando alguien cambia la de arriba.
 *
 * Quién los encadena es el recorrido de `furthestStepIndex`, que avanza mientras
 * se cumplan y se detiene en el primero que no.
 */
const REQUIREMENTS: Record<BookingStepKey, (progress: BookingProgress) => boolean> = {
  // No necesita nada: es donde se empieza.
  services: () => true,

  // Elegir profesional es opcional —"cualquiera disponible" es una respuesta
  // válida— pero para llegar hay que haber elegido al menos un servicio.
  professional: (p) => p.serviceIds.length > 0,

  date: (p) => p.serviceIds.length > 0,

  slot: (p) => p.serviceIds.length > 0 && p.date !== null,

  /**
   * Los datos personales se piden recién cuando el horario sirve.
   *
   * El horario se comprueba contra la selección actual y no solo contra que
   * exista: elegir un horario y después agregar un servicio al carrito deja ese
   * horario inválido —el turno ahora dura más y ya no entra en ese hueco—, y sin
   * esta comprobación el asistente llegaría al resumen con un horario que el
   * servidor va a rechazar.
   */
  details: (p) =>
    p.serviceIds.length > 0 && p.date !== null && isSlotValidFor(p.slot, p),

  summary: (p) =>
    p.serviceIds.length > 0 &&
    p.date !== null &&
    isSlotValidFor(p.slot, p) &&
    p.customer !== null,
};

/**
 * El paso más lejano al que se puede llegar con el estado actual.
 *
 * Avanza por la lista de pasos mientras cada uno se pueda mostrar, y se detiene en
 * el primero que no.
 *
 * El paso 0 no puede fallar —su condición es `true`—, así que el recorrido siempre
 * tiene un lugar donde quedarse y esto nunca devuelve "ningún paso".
 */
function furthestStepIndex(progress: BookingProgress): number {
  let reached = 0;

  for (let index = 0; index < BOOKING_STEPS.length; index += 1) {
    const step = BOOKING_STEPS[index];
    // `noUncheckedIndexedAccess` obliga a contemplar el índice fuera de rango,
    // aunque el `for` no pueda pasarse.
    if (step === undefined) break;

    // La tabla cubre todas las claves, así que `undefined` es imposible; el
    // chequeo está porque con `noUncheckedIndexedAccess` el acceso por una clave
    // que es unión se tipa como posiblemente ausente, y tratarlo como si no lo
    // fuera sería afirmar algo que el compilador no puede verificar.
    const requirement = REQUIREMENTS[step.key];
    if (requirement === undefined || !requirement(progress)) break;

    reached = index;
  }

  return reached;
}

/** Si se puede mostrar el paso que está en esa posición. */
export function isStepReachable(index: number, progress: BookingProgress): boolean {
  return index >= 0 && index <= furthestStepIndex(progress);
}

/**
 * La dirección del paso más lejano al que se puede llegar.
 *
 * Es a dónde se manda a alguien que pidió una pantalla para la que su estado no
 * alcanza: si escribió `/turnos/resumen` con el carrito vacío, vuelve a servicios,
 * y si ya eligió servicios y día pero el horario quedó viejo, vuelve a horario.
 * Devuelve el paso inicial cuando no hay nada elegido, que es el caso de la
 * primera visita.
 *
 * Devuelve una dirección y no un paso para poder recorrer la lista sin indexarla:
 * el índice que sale de `furthestStepIndex` es un número, y con
 * `noUncheckedIndexedAccess` un número puede no corresponder a ningún elemento
 * aunque acá se sepa que sí.
 */
export function reachableStepPath(progress: BookingProgress): string {
  let path = FIRST_BOOKING_STEP.path;

  for (const step of BOOKING_STEPS) {
    const requirement = REQUIREMENTS[step.key];
    if (requirement === undefined || !requirement(progress)) break;

    path = step.path;
  }

  return path;
}
