// =============================================================================
// KAYA KALPA — Fechas y horas del salón
// =============================================================================
// Toda la aritmética de fechas del sistema pasa por acá. Nada fuera de este
// archivo debería usar `getHours()`, `setDate()` ni `toISOString()`.
//
// El problema que resuelve: el servidor puede estar en cualquier zona horaria
// (UTC en un hosting, la del desarrollador en su máquina) pero la estética abre
// y cierra en hora de Formosa. Si se mezclan las dos, un turno de las 20:00 se
// guarda como las 23:00 o como el día siguiente, según dónde corra el proceso.
//
// La regla es una sola: **los instantes son UTC, los días calendario son del
// salón**. Y las dos representaciones nunca se mezclan sin convertir.
//
// Argentina no aplica horario de verano, así que en la práctica el
// desplazamiento es siempre -03:00. Igual el cálculo es genérico: si algún día
// se configura otra zona, sigue funcionando.
// =============================================================================

import { env } from '../config/env';

/** Un día del calendario del salón, en formato 'YYYY-MM-DD'. */
export type DateOnly = string;

/** Minutos transcurridos desde la medianoche del salón. 540 = 09:00. */
export type MinutesOfDay = number;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export const MINUTES_IN_DAY = 24 * 60;

/** Zona horaria de la estética. Es la que manda para todo lo que ve el cliente. */
export const SALON_TIMEZONE = env.timezone;

// -----------------------------------------------------------------------------
// Formateo en una zona horaria
// -----------------------------------------------------------------------------

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

// `Intl.DateTimeFormat` es caro de construir y esto se llama en un bucle por
// cada slot de cada día. Se cachea por zona horaria.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      // 'h23' y no 'hour12: false': con hour12 algunas versiones de ICU
      // devuelven '24' para la medianoche, y eso rompe toda la aritmética.
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Cómo se ve un instante en el reloj de pared del salón. */
function zonedPartsOf(instant: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((candidate) => candidate.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/**
 * Cuánto adelanta el reloj del salón respecto de UTC, en milisegundos.
 * Para Formosa da -10.800.000 (-3 h).
 *
 * Se calcula en vez de hardcodear -3 para que el sistema siga siendo correcto si
 * alguna vez se configura una zona con horario de verano.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedPartsOf(instant, timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  // Se descartan los milisegundos de los dos lados: el formato no los expone y
  // dejarlos introduciría un error de hasta 999 ms.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// -----------------------------------------------------------------------------
// Días calendario
// -----------------------------------------------------------------------------

/**
 * Un día calendario se representa como un `Date` en la medianoche UTC de ese
 * día. Es la convención que espera Prisma para las columnas `@db.Date`, y la
 * única que no se corre de día al viajar entre zonas horarias.
 *
 * Ojo: eso significa que este `Date` **no es un instante real**. Para eso está
 * `salonDayStart()`.
 */
export function parseDateOnly(value: DateOnly): Date {
  if (!isValidDateOnly(value)) {
    throw new RangeError(`Fecha inválida: ${JSON.stringify(value)}`);
  }
  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * ¿Es una fecha 'YYYY-MM-DD' que existe de verdad?
 *
 * No alcanza con el formato: `2026-02-30` lo cumple y no es un día. Por eso se
 * reconstruye la fecha y se verifica que vuelva al mismo texto — así el 30 de
 * febrero, que JavaScript convertiría en el 2 de marzo, se rechaza.
 */
export function isValidDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const reconstructed = new Date(Date.UTC(year, month - 1, day));
  return (
    reconstructed.getUTCFullYear() === year &&
    reconstructed.getUTCMonth() === month - 1 &&
    reconstructed.getUTCDate() === day
  );
}

/**
 * Serializa un `Date` de columna `@db.Date` a 'YYYY-MM-DD'.
 *
 * Nunca `toISOString().slice(0, 10)`: eso devuelve el día en UTC, y si el valor
 * llegara con hora (por ejemplo, un `new Date()` que se coló), para un cliente
 * en Argentina mostraría el día siguiente.
 */
export function formatDateOnly(date: Date): DateOnly {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** ¿Qué día del salón es este instante? Un turno de las 23:00 en UTC-3 es hoy. */
export function toDateOnly(instant: Date, timeZone = SALON_TIMEZONE): DateOnly {
  const parts = zonedPartsOf(instant, timeZone);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/** El día de hoy, tal como lo ve la estética. */
export function todayInSalon(timeZone = SALON_TIMEZONE): DateOnly {
  return toDateOnly(new Date(), timeZone);
}

/**
 * Día de la semana. 0 = domingo … 6 = sábado, igual que `Date.getDay()` y que la
 * columna `weekday` de `business_hours`.
 */
export function weekdayOf(dateOnly: Date): number {
  return dateOnly.getUTCDay();
}

export function addDays(dateOnly: Date, amount: number): Date {
  return new Date(dateOnly.getTime() + amount * MS_PER_DAY);
}

/** Días calendario entre dos fechas, sin contar fracciones. */
export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// -----------------------------------------------------------------------------
// Conversión entre reloj de pared e instante
// -----------------------------------------------------------------------------

/**
 * "El 15 de septiembre a las 16:00 en el salón" -> el instante UTC que eso
 * representa.
 *
 * Se hace en dos pasadas a propósito: la primera estima el desplazamiento con un
 * valor aproximado y la segunda lo corrige con el instante ya ajustado. En una
 * zona con horario de verano, la primera estimación puede caer del otro lado del
 * cambio y dar una hora corrida; la segunda pasada lo resuelve.
 */
export function zonedTimeToInstant(
  dateOnly: Date,
  minutesOfDay: MinutesOfDay,
  timeZone = SALON_TIMEZONE,
): Date {
  const naive =
    Date.UTC(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate(),
    ) +
    minutesOfDay * MS_PER_MINUTE;

  const firstGuess = new Date(naive - timeZoneOffsetMs(new Date(naive), timeZone));
  return new Date(naive - timeZoneOffsetMs(firstGuess, timeZone));
}

/** El instante en que arranca el día del salón (00:00 hora local). */
export function salonDayStart(
  dateOnly: Date,
  timeZone = SALON_TIMEZONE,
): Date {
  return zonedTimeToInstant(dateOnly, 0, timeZone);
}

/** El instante en que termina el día del salón (24:00 = 00:00 del día siguiente). */
export function salonDayEnd(dateOnly: Date, timeZone = SALON_TIMEZONE): Date {
  return zonedTimeToInstant(addDays(dateOnly, 1), 0, timeZone);
}

/** Qué hora marca el reloj del salón en este instante, en minutos. */
export function salonMinutesOfDay(
  instant: Date,
  timeZone = SALON_TIMEZONE,
): MinutesOfDay {
  const parts = zonedPartsOf(instant, timeZone);
  return parts.hour * 60 + parts.minute;
}

/**
 * Convierte un instante a "minutos desde la medianoche del salón", pero contando
 * días enteros si el instante cae fuera de ese día.
 *
 * Un instante de las 00:30 del día siguiente devuelve 1470 (24 h + 30 min) en vez
 * de 30. Es lo que permite comparar un turno que se pasa de medianoche contra la
 * grilla de un día sin que dé un resultado negativo o envuelva a cero.
 */
export function salonMinutesFromDayStart(
  instant: Date,
  dateOnly: Date,
  timeZone = SALON_TIMEZONE,
): MinutesOfDay {
  const dayStart = salonDayStart(dateOnly, timeZone);
  return Math.round((instant.getTime() - dayStart.getTime()) / MS_PER_MINUTE);
}

// -----------------------------------------------------------------------------
// Utilidades varias
// -----------------------------------------------------------------------------

export function addMinutes(instant: Date, amount: number): Date {
  return new Date(instant.getTime() + amount * MS_PER_MINUTE);
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_MINUTE);
}

/** Redondea hacia arriba al siguiente múltiplo del paso. 16:07 con paso 15 -> 16:15. */
export function ceilToStep(minutes: MinutesOfDay, step: number): MinutesOfDay {
  if (step <= 1) return minutes;
  return Math.ceil(minutes / step) * step;
}

/** Redondea hacia abajo al múltiplo anterior del paso. 16:07 con paso 15 -> 16:00. */
export function floorToStep(minutes: MinutesOfDay, step: number): MinutesOfDay {
  if (step <= 1) return minutes;
  return Math.floor(minutes / step) * step;
}

/**
 * Minutos desde la medianoche -> 'HH:MM' de 24 horas.
 *
 * Se formatea acá y no con `toLocaleTimeString` porque este texto no se muestra
 * en el reloj del servidor sino en el del salón, y porque el mismo valor tiene
 * que verse igual en el backend, en el frontend y en los tests.
 *
 * No contempla valores fuera del día (negativos o ≥ 1440): los horarios de
 * atención se cargan dentro de un día, y un turno siempre empieza antes de la
 * medianoche porque tiene duración positiva.
 */
export function formatMinutesOfDay(minutes: MinutesOfDay): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
