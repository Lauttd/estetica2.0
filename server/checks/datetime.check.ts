// =============================================================================
// KAYA KALPA — Verificación de la aritmética de fechas e intervalos
// =============================================================================
// Comprueba las dos piezas de las que depende todo el sistema de turnos:
//
//   · que un instante se convierta al día y la hora correctos del salón,
//   · que la resta de intervalos y la generación de horarios den lo esperado.
//
// Son cálculos donde un error no se nota hasta que alguien llega a un turno que
// no era, así que conviene poder comprobarlos de un comando:
//
//   npm run check:datetime        (desde server/, o --workspace=server)
//
// Todavía no hay un framework de tests instalado; cuando lo haya, esto se migra
// a tests de verdad sin cambiar las comprobaciones.
// =============================================================================

import {
  addDays,
  ceilToStep,
  floorToStep,
  formatDateOnly,
  parseDateOnly,
  salonDayEnd,
  salonDayStart,
  salonMinutesOfDay,
  toDateOnly,
  weekdayOf,
  zonedTimeToInstant,
} from '../src/utils/datetime';
import { overlaps, slotsIn, subtract, merge } from '../src/utils/intervals';

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass += 1;
    console.log(`  ✓  ${label}`);
  } else {
    fail += 1;
    console.log(`  ✗  ${label}\n       esperado: ${e}\n       obtenido: ${a}`);
  }
}

const D = parseDateOnly('2026-09-15'); // 15 de septiembre de 2026

console.log('\n── Conversión de reloj de pared a instante ──');
// Formosa es UTC-3 todo el año: las 16:00 del salón son las 19:00 UTC.
check(
  '16:00 del salón -> 19:00 UTC',
  zonedTimeToInstant(D, 16 * 60).toISOString(),
  '2026-09-15T19:00:00.000Z',
);
check(
  'medianoche del salón -> 03:00 UTC',
  zonedTimeToInstant(D, 0).toISOString(),
  '2026-09-15T03:00:00.000Z',
);
check(
  'inicio del día',
  salonDayStart(D).toISOString(),
  '2026-09-15T03:00:00.000Z',
);
check(
  'fin del día (medianoche siguiente)',
  salonDayEnd(D).toISOString(),
  '2026-09-16T03:00:00.000Z',
);

console.log('\n── La trampa del cambio de día ──');
// 02:30 UTC del día 16 son las 23:30 del día 15 en Formosa. Un turno de las
// 23:30 pertenece al día 15. `toISOString().slice(0,10)` daría "2026-09-16".
const tarde = new Date('2026-09-16T02:30:00.000Z');
check('23:30 del día 15 sigue siendo el día 15', toDateOnly(tarde), '2026-09-15');
check('y son las 23:30, no las 02:30', salonMinutesOfDay(tarde), 23 * 60 + 30);
check(
  'el ingenuo toISOString habría dado otro día',
  tarde.toISOString().slice(0, 10),
  '2026-09-16',
);

console.log('\n── Ida y vuelta en todo el día ──');
let roundTripOk = true;
for (let min = 0; min < 24 * 60; min += 7) {
  const instant = zonedTimeToInstant(D, min);
  if (salonMinutesOfDay(instant) !== min || toDateOnly(instant) !== '2026-09-15') {
    roundTripOk = false;
    console.log(`       falla en el minuto ${min}`);
    break;
  }
}
check('los 1440 minutos del día vuelven idénticos', roundTripOk, true);

console.log('\n── Día de la semana ──');
// Cálculo independiente: el 1/1/1970 fue jueves (4).
const epochDays = Math.floor(D.getTime() / 86_400_000);
check('15/09/2026 es martes (2)', weekdayOf(D), (epochDays + 4) % 7);
check('16/09/2026 es miércoles (3)', weekdayOf(addDays(D, 1)), (epochDays + 5) % 7);
check('formato de salida', formatDateOnly(D), '2026-09-15');

console.log('\n── Álgebra de intervalos ──');
check(
  'restar bloqueos de un día partido',
  subtract(
    [
      { start: 540, end: 780 }, // 09:00-13:00
      { start: 960, end: 1200 }, // 16:00-20:00
    ],
    [
      { start: 570, end: 600 }, // turno 09:30-10:00
      { start: 960, end: 1020 }, // turno 16:00-17:00
    ],
  ),
  [
    { start: 540, end: 570 },
    { start: 600, end: 780 },
    { start: 1020, end: 1200 },
  ],
);

check(
  'turnos consecutivos NO se pisan (rango semiabierto)',
  overlaps({ start: 960, end: 1020 }, { start: 1020, end: 1080 }),
  false,
);
check(
  'un minuto de superposición sí cuenta',
  overlaps({ start: 960, end: 1020 }, { start: 1019, end: 1080 }),
  true,
);
check(
  'fusionar horarios que se tocan',
  merge([
    { start: 540, end: 780 },
    { start: 780, end: 1020 },
  ]),
  [{ start: 540, end: 1020 }],
);

console.log('\n── Generación de horarios ──');
check(
  'turnos de 60 min en un hueco de 2 h, cada 15 min',
  slotsIn({ start: 960, end: 1080 }, 15, 60),
  [960, 975, 990, 1005, 1020],
);
check(
  'el último horario entra justo contra el cierre',
  slotsIn({ start: 960, end: 1080 }, 15, 60).at(-1)! + 60,
  1080,
);
check(
  'un servicio más largo que el hueco no genera horarios',
  slotsIn({ start: 960, end: 1020 }, 15, 90),
  [],
);
check(
  'la grilla se alinea a la hora, no al inicio del hueco',
  slotsIn({ start: 970, end: 1080 }, 15, 60),
  [975, 990, 1005, 1020],
);

console.log('\n── Redondeos ──');
check('16:07 hacia arriba, paso 15', ceilToStep(967, 15), 975);
check('16:07 hacia abajo, paso 15', floorToStep(967, 15), 960);
check('un valor ya alineado no se mueve', ceilToStep(960, 15), 960);

console.log(`\n  Resultado: ${pass} correctas, ${fail} fallidas\n`);
process.exit(fail > 0 ? 1 : 0);
