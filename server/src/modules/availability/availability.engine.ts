// =============================================================================
// KAYA KALPA — Motor de disponibilidad
// =============================================================================
// Es el corazón del sistema de turnos y la respuesta al punto §20 del prompt: el
// frontend NUNCA decide qué horarios están libres, solo dibuja lo que devuelve
// este motor.
//
// Todo lo de este archivo son funciones puras: entran intervalos, salen horarios.
// No hay base de datos, ni reloj, ni zona horaria. Eso es deliberado — permite
// verificar el motor con casos concretos sin levantar nada, y deja la parte difícil
// (consultar, convertir instantes) en `availability.service.ts`, que es donde se
// puede y se debe testear contra datos reales.
//
// LA CUENTA
//
//     libres  =  atención  −  (bloqueos  ∪  turnos ya tomados)
//     horarios =  inicios que caben dentro de cada tramo libre
//
// Todo en minutos desde la medianoche del salón. Ver `utils/intervals.ts` para la
// convención de intervalos semiabiertos, que es la que hace que un turno que
// termina 13:00 y otro que empieza 13:00 sean consecutivos y no superpuestos.
// =============================================================================

import type { MinutesOfDay } from '../../utils/datetime';
import { clip, merge, slotsIn, subtract, type Interval } from '../../utils/intervals';

/**
 * Tope de horarios devueltos por día.
 *
 * Un día de 12 horas con paso de 15 minutos son 48 horarios, así que el tope no
 * molesta en el uso normal. Está para que una configuración absurda (paso de 1
 * minuto, atención de 24 horas) no genere una respuesta enorme.
 */
export const MAX_SLOTS_PER_DAY = 200;

/**
 * La agenda de un profesional para un día concreto.
 *
 * Es la foto completa de lo que ocupa su tiempo ese día. El motor no consulta
 * nada más.
 */
export interface ProfessionalAgenda {
  professionalId: string;

  /**
   * Ventanas de atención del día, en minutos desde la medianoche.
   *
   * Se espera que vengan sin fusionar: si la estética carga 09:00–13:00 y
   * 14:00–20:00 como dos filas, acá llegan las dos y el motor las trata como
   * corresponde (con el mediodía cerrado).
   */
  businessHours: Interval[];

  /**
   * Bloqueos parciales y feriados, ya resueltos a intervalos del día.
   *
   * Un bloqueo de día completo llega como `[0, 1440)`, así que el motor no
   * necesita distinguir "feriado" de "ausencia de 2 horas": los dos son lo mismo
   * desde el punto de vista de la disponibilidad.
   */
  blocked: Interval[];

  /**
   * Turnos ya tomados, como `[inicio, occupiedUntil)`.
   *
   * El fin es `occupiedUntil` y no `endAt` a propósito: lo que bloquea la agenda
   * es el turno más su limpieza. Por eso un turno que el cliente ve como
   * "16:00 a 17:00" le impide a otro empezar 17:00 si hay 10 minutos de recambio.
   *
   * La contrapartida es que el turno NUEVO solo necesita que le entre su propia
   * duración: puede terminar justo a la hora del cierre, porque la limpieza
   * posterior queda fuera del horario de atención y no le quita el lugar a nadie.
   */
  busy: Interval[];

  /** Cada cuántos minutos se ofrece un inicio. */
  step: number;

  /**
   * Primer horario ofrecible, en minutos desde la medianoche del día consultado.
   *
   * Es `null` cuando el día consultado no es hoy: si es otro día, ningún horario
   * "ya pasó" y no hay nada que recortar. Cuando sí es hoy, vale
   * `hora actual + anticipación mínima del profesional`, que es distinta para cada
   * uno — de ahí que viva en la agenda y no sea un parámetro suelto del motor.
   */
  notBeforeMin: MinutesOfDay | null;
}

/**
 * Un horario disponible y quién puede atenderlo.
 *
 * `professionalIds` viene siempre, incluso cuando el cliente ya eligió a uno:
 * así el frontend no tiene dos formas de respuesta que manejar. Con un solo
 * profesional la lista tiene un elemento.
 */
export interface SlotOption {
  startMin: MinutesOfDay;
  professionalIds: string[];
}

/**
 * Los tramos del día en que el profesional está efectivamente libre.
 *
 * Se fusionan los bloqueos con los turnos antes de restar, en una sola operación:
 * da igual que vengan desordenados, repetidos o superpuestos entre sí, que es
 * exactamente lo que pasa cuando coinciden un feriado y un turno cargado encima.
 */
export function freeIntervals(agenda: ProfessionalAgenda): Interval[] {
  return subtract(agenda.businessHours, [...agenda.blocked, ...agenda.busy]);
}

/**
 * ¿Ese profesional atiende ese día, más allá de que tenga lugar o no?
 *
 * Sirve para distinguir dos situaciones que el frontend muestra distinto: el día
 * en que la estética no abre ("cerrado") y el día en que abre pero está completo
 * ("no quedan horarios"). Se calcula sin los turnos tomados, justamente para que
 * un día lleno no se confunda con un día cerrado.
 */
export function isOpen(agenda: ProfessionalAgenda): boolean {
  return subtract(agenda.businessHours, agenda.blocked).length > 0;
}

/**
 * Los horarios de inicio que ofrece una agenda, sin mirar a los demás.
 *
 * Se descartan los anteriores a `notBeforeMin`, que es lo que impide ofrecer un
 * turno para dentro de diez minutos cuando la anticipación mínima es de dos horas.
 */
export function slotsForAgenda(
  agenda: ProfessionalAgenda,
  totalDurationMin: number,
): MinutesOfDay[] {
  const slots: MinutesOfDay[] = [];

  for (const free of freeIntervals(agenda)) {
    for (const start of slotsIn(free, agenda.step, totalDurationMin)) {
      if (agenda.notBeforeMin !== null && start < agenda.notBeforeMin) continue;
      slots.push(start);
    }
  }

  return slots;
}

/**
 * Los horarios del día, agrupados, con los profesionales que puede atender cada uno.
 *
 * Cuando el cliente no eligió profesional, el mismo horario puede aparecer en
 * varias agendas; se devuelve una sola vez con la lista de quiénes pueden tomarlo.
 * El frontend usa esa lista para mostrar "3 disponibles" o para asignar el turno
 * automáticamente al confirmar.
 *
 * El resultado viene ordenado cronológicamente y sin repetir, porque el asistente
 * lo muestra como una grilla y un horario duplicado sería un botón repetido.
 */
export function computeDaySlots(
  agendas: readonly ProfessionalAgenda[],
  totalDurationMin: number,
): SlotOption[] {
  const byStart = new Map<MinutesOfDay, string[]>();

  for (const agenda of agendas) {
    for (const start of slotsForAgenda(agenda, totalDurationMin)) {
      const professionals = byStart.get(start);
      if (professionals) {
        professionals.push(agenda.professionalId);
      } else {
        byStart.set(start, [agenda.professionalId]);
      }
    }
  }

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .slice(0, MAX_SLOTS_PER_DAY)
    .map(([startMin, professionalIds]) => ({ startMin, professionalIds }));
}

/** El día completo, de 00:00 a 24:00. Es el límite de todo lo que pasa en un día. */
export const FULL_DAY: Interval = { start: 0, end: 24 * 60 };

/**
 * Arma un intervalo del día a partir de dos minutos, descartando lo que no sirve.
 *
 * Hace dos cosas que conviene tener juntas, porque las dos son "normalizar lo que
 * vino de la base antes de que el motor lo use":
 *
 *  - **Descarta los que no tienen duración.** Un `endMin` menor o igual que
 *    `startMin` es un error de carga, y sin este control restaría un intervalo
 *    vacío —inofensivo— o, peor, uno invertido que rompería la resta. Descartarlo
 *    deja el día como si ese bloqueo no existiera, que es el lado seguro: se
 *    ofrece un horario que la estética puede rechazar, en vez de desaparecer el
 *    día entero. Lo mismo protege contra un turno mal cargado en la base, donde
 *    un `occupiedUntil` anterior al `startAt` haría estragos.
 *
 *  - **Recorta al día.** Un turno puede terminar después de la medianoche —su
 *    `occupiedUntil` cae en el día siguiente— y esos minutos de más no
 *    corresponden a la grilla que se está calculando. Recortarlos hace que el
 *    turno bloquee correctamente el final del día en vez de desbordarlo.
 */
export function toDayInterval(
  startMin: MinutesOfDay,
  endMin: MinutesOfDay,
): Interval | null {
  if (!(endMin > startMin)) return null;
  return clip({ start: startMin, end: endMin }, FULL_DAY);
}

/** Descarta los intervalos inválidos y fusiona los que se pisan o se tocan. */
export function normalizeIntervals(intervals: Array<Interval | null>): Interval[] {
  return merge(intervals.filter((interval): interval is Interval => interval !== null));
}
