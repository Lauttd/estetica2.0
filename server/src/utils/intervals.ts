// =============================================================================
// KAYA KALPA — Álgebra de intervalos
// =============================================================================
// El motor de disponibilidad es, en el fondo, una resta de intervalos:
//
//     horario de atención  −  bloqueos  −  turnos ya tomados  =  huecos libres
//
// Todo eso se resuelve acá, sobre minutos desde la medianoche del salón. Trabajar
// con números en vez de `Date` evita dos problemas: no hay zonas horarias
// metidas en el medio, y un turno que cruza la medianoche no rompe nada.
//
// CONVENCIÓN: todos los intervalos son **semiabiertos**, `[inicio, fin)`. El
// inicio está incluido y el fin no. Es lo que permite que un turno que termina a
// las 13:00 y otro que empieza a las 13:00 sean consecutivos y no superpuestos,
// que es exactamente el caso de todos los días.
// =============================================================================

import type { MinutesOfDay } from './datetime';

export interface Interval {
  /** Incluido. */
  start: MinutesOfDay;
  /** Excluido. */
  end: MinutesOfDay;
}

/** Un intervalo con duración positiva. Los vacíos no se propagan. */
export function isValid(interval: Interval): boolean {
  return (
    Number.isFinite(interval.start) &&
    Number.isFinite(interval.end) &&
    interval.end > interval.start
  );
}

/**
 * ¿Se pisan dos intervalos semiabiertos?
 *
 * La condición `a.start < b.end && b.start < a.end` es la definición de solape
 * para rangos semiabiertos. Con `<=` en lugar de `<`, dos turnos consecutivos
 * (13:00 y 13:00) se considerarían superpuestos y se perdería la mitad de la
 * agenda.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** ¿`outer` contiene por completo a `inner`? */
export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && outer.end >= inner.end;
}

/** ¿Se pisa con alguno de la lista? */
export function overlapsAny(interval: Interval, others: readonly Interval[]): boolean {
  return others.some((other) => overlaps(interval, other));
}

export function duration(interval: Interval): number {
  return Math.max(0, interval.end - interval.start);
}

export function totalDuration(intervals: readonly Interval[]): number {
  return intervals.reduce((total, interval) => total + duration(interval), 0);
}

/**
 * Ordena y fusiona los intervalos que se tocan o se pisan.
 *
 * Se fusionan también los que solo se tocan (`fin === inicio`) porque el uso
 * típico es consolidar horarios de atención partidos: si la estética carga
 * 09:00–13:00 y 13:00–17:00 como dos filas, en la práctica es un solo bloque
 * continuo y así conviene tratarlo.
 */
export function merge(intervals: readonly Interval[]): Interval[] {
  const sorted = intervals
    .filter(isValid)
    .map((interval) => ({ ...interval }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push(interval);
    }
  }
  return merged;
}

/**
 * Recorta un intervalo a unos límites. Devuelve `null` si no queda nada.
 *
 * Sirve para no ofrecer turnos que empiecen antes de que abra o terminen después
 * de que cierre.
 */
export function clip(interval: Interval, bounds: Interval): Interval | null {
  const start = Math.max(interval.start, bounds.start);
  const end = Math.min(interval.end, bounds.end);
  return end > start ? { start, end } : null;
}

/**
 * Resta `holes` de `base`. Es la operación central del motor.
 *
 * Devuelve los tramos de `base` que no están cubiertos por ningún hueco.
 *
 *   base  = [09:00, 13:00), [16:00, 20:00)
 *   holes = [09:30, 10:00), [16:00, 17:00)
 *   =>      [09:00, 09:30), [10:00, 13:00), [17:00, 20:00)
 *
 * Se fusionan los dos conjuntos antes de operar: así no importa si los huecos
 * vienen desordenados, repetidos o superpuestos entre sí, que es justo lo que
 * pasa cuando se combinan bloqueos con turnos ya tomados.
 */
export function subtract(
  base: readonly Interval[],
  holes: readonly Interval[],
): Interval[] {
  const mergedHoles = merge(holes);
  const result: Interval[] = [];

  for (const block of merge(base)) {
    // Tramos del bloque que siguen vivos. Se van cortando hueco por hueco.
    let pieces: Interval[] = [block];

    for (const hole of mergedHoles) {
      // Los huecos están ordenados: una vez que uno empieza después del final
      // del bloque, ninguno de los que siguen lo va a tocar.
      if (hole.start >= block.end) break;

      const survivors: Interval[] = [];
      for (const piece of pieces) {
        if (!overlaps(piece, hole)) {
          survivors.push(piece);
          continue;
        }
        // Queda el tramo de la izquierda...
        if (hole.start > piece.start) {
          survivors.push({ start: piece.start, end: hole.start });
        }
        // ...y el de la derecha, si el hueco no llegó hasta el final.
        if (hole.end < piece.end) {
          survivors.push({ start: hole.end, end: piece.end });
        }
      }
      pieces = survivors;
      if (pieces.length === 0) break;
    }

    result.push(...pieces);
  }

  return result.sort((a, b) => a.start - b.start);
}

/**
 * Traduce un tramo libre a los horarios de inicio que caben dentro.
 *
 * `step` es cada cuántos minutos se ofrece un turno (la granularidad de la
 * agenda) y `serviceDuration` lo que dura el turno.
 *
 * El último inicio posible es `end - serviceDuration`, así el turno entra
 * completo: nunca se ofrece un horario que se corte contra el cierre.
 *
 *   free = [16:00, 18:00), step = 15, duration = 60
 *   =>     16:00, 16:15, 16:30, 16:45, 17:00
 *
 * El inicio se alinea a múltiplos del paso contados desde la medianoche, no desde
 * el arranque del tramo: si no, un hueco que empieza 16:10 generaría 16:10, 16:25,
 * 16:40… y la agenda quedaría desalineada según el día.
 */
export function slotsIn(
  free: Interval,
  step: number,
  serviceDuration: number,
): MinutesOfDay[] {
  if (step <= 0 || serviceDuration <= 0) return [];

  const latestStart = free.end - serviceDuration;
  if (latestStart < free.start) return [];

  const first = Math.ceil(free.start / step) * step;
  const slots: MinutesOfDay[] = [];
  for (let start = first; start <= latestStart; start += step) {
    slots.push(start);
  }
  return slots;
}
