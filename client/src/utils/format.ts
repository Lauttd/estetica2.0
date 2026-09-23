// =============================================================================
// KAYA KALPA — Formato de duraciones y fechas
// =============================================================================

/**
 * Una duración en minutos, como se lee: `45` → `"45 min"`, `90` → `"1 h 30 min"`.
 *
 * La API manda minutos porque es la unidad con la que se calcula todo del lado
 * del servidor; pasarlos a horas y minutos es una decisión de presentación y vive
 * acá.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * Una duración que puede no estar cargada.
 *
 * `null` no es cero: significa que la estética todavía no confirmó cuánto dura el
 * servicio (§41 prohíbe inventarlo), y eso es distinto de "dura 0 minutos". El
 * texto lo dice en vez de mostrar un guion, que se lee como un error del sitio.
 */
export function formatDurationOrPending(
  minutes: number | null,
  pending = 'Duración a confirmar',
): string {
  return minutes === null ? pending : formatDuration(minutes);
}

/**
 * Un formateador reutilizable: construir uno de estos carga datos de locale y en
 * una lista de veinte fechas eso se nota.
 */
const dayMonthFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
});

const longDateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const weekdayFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

const dayOfMonthFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric' });

/**
 * Un día de calendario `'YYYY-MM-DD'` a texto: `"15 de septiembre"`.
 *
 * POR QUÉ NO ALCANZA CON `new Date(value)`
 *
 * `new Date('2026-09-15')` se interpreta como medianoche **UTC**. En Argentina,
 * que está tres horas atrás, eso es el 14 de septiembre a las 21: y la fecha que
 * se muestra es la del día anterior. El error es de un día, aparece solo en
 * algunas pantallas, y es de los que se descubren cuando una clienta llega el día
 * equivocado.
 *
 * Por eso los días de calendario se arman con sus tres números y el constructor
 * local: así no hay zona horaria que los corra. Vale para todo lo que la API
 * serialice con `formatDateOnly` del servidor.
 */
export function formatDateOnly(value: string): string {
  const parsed = parseDateOnly(value);
  return parsed === null ? value : dayMonthFormatter.format(parsed);
}

/** El mismo día, con el nombre del día de la semana: `"martes 15 de septiembre"`. */
export function formatLongDateOnly(value: string): string {
  const parsed = parseDateOnly(value);
  return parsed === null ? value : longDateFormatter.format(parsed);
}

/**
 * El día de la semana, corto: `"jue"`.
 *
 * Es para los botones de los próximos días, donde el ancho lo decide la fila de
 * siete y no el texto. Se pide el corto al formateador en vez de recortar el
 * largo: "miércoles".slice(0, 3) da "mié", pero "sábado" daría "sáb" y "jueves"
 * daría "jue" por casualidad — recortar acierta por suerte, y el formateador
 * acierta por regla.
 */
export function formatWeekdayShort(value: string): string {
  const parsed = parseDateOnly(value);
  return parsed === null ? value : weekdayFormatter.format(parsed);
}

/** Los turnos online solo se ofrecen de lunes a viernes. */
export function isWeekend(value: string): boolean {
  const parsed = parseDateOnly(value);
  if (parsed === null) return false;
  const day = parsed.getDay();
  return day === 0 || day === 6;
}

/** El número del día solo: `"15"`. Va debajo del día de la semana en el botón. */
export function formatDayOfMonth(value: string): string {
  const parsed = parseDateOnly(value);
  return parsed === null ? value : dayOfMonthFormatter.format(parsed);
}

/**
 * `'YYYY-MM-DD'` a una fecha local, o `null` si no tiene esa forma.
 *
 * Devuelve `null` en vez de una fecha inválida a propósito: quien llama tiene que
 * decidir qué mostrar cuando el dato no sirve, y una `Invalid Date` se cuela
 * hasta la pantalla como "Invalid Date" sin que nadie lo note en el código.
 */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;

  const [, year, month, day] = match;
  if (year === undefined || month === undefined || day === undefined) return null;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Una fecha local a `'YYYY-MM-DD'`.
 *
 * **No se usa `toISOString().slice(0, 10)`**, que es la forma en que esto se
 * escribe mal el 90 % de las veces. `toISOString` convierte a UTC: a las 22 de un
 * martes en Argentina ya es miércoles en UTC, así que el selector de fecha
 * ofrecería el día siguiente al que la persona cree que es, y un turno reservado
 * "para mañana" quedaría para pasado. Se arman los tres números con los métodos
 * locales, que es la misma razón por la que `parseDateOnly` existe.
 */
export function toDateOnly(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Hoy, como día de calendario del salón.
 *
 * Se calcula con la hora del navegador, que es la de la persona. Para quien
 * reserva desde Formosa coincide con la del salón; para quien lo hace desde otro
 * país puede diferir en un día, y el servidor es el que tiene la última palabra
 * —si la fecha quedó fuera de la ventana, responde `OUTSIDE_BOOKING_WINDOW` y el
 * asistente lo explica—.
 */
export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

/**
 * Suma días a un día de calendario.
 *
 * Se pasa por el constructor local y no por milisegundos: sumar `24 * 60 * 60 *
 * 1000` falla el día que el país cambia de hora, porque ese día tiene 23 o 25
 * horas y la cuenta cae en el día equivocado.
 */
export function addDays(dateOnly: string, days: number): string {
  const parsed = parseDateOnly(dateOnly);
  if (parsed === null) return dateOnly;

  parsed.setDate(parsed.getDate() + days);
  return toDateOnly(parsed);
}
