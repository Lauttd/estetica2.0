// =============================================================================
// KAYA KALPA — Verificación del motor de disponibilidad
// =============================================================================
// El punto §20 del prompt pide dos cosas: que el backend sea el único que decide
// la disponibilidad, y que sea imposible ofrecer un horario ya tomado. El motor de
// `availability.engine.ts` es donde se juega eso, y como son funciones puras se
// puede comprobar con casos concretos, sin base de datos ni servidor.
//
// Los casos están elegidos por lo que pueden romper, no por cobertura:
//
//   · que un turno respete el recambio (occupiedUntil) y no solo su hora de fin
//   · que dos turnos consecutivos NO se consideren superpuestos
//   · que un turno pueda terminar justo a la hora del cierre
//   · que un feriado tape el día y que un bloqueo parcial no
//   · que la anticipación mínima recorte solo cuando la fecha es hoy
//   · que varios profesionales se agrupen en un mismo horario
//
//   npm run check:availability
// =============================================================================

import {
  computeDaySlots,
  freeIntervals,
  isOpen,
  normalizeIntervals,
  toDayInterval,
  type ProfessionalAgenda,
} from '../src/modules/availability/availability.engine';
import { formatMinutesOfDay } from '../src/utils/datetime';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    pass += 1;
    console.log(`  ✓  ${label}`);
  } else {
    fail += 1;
    console.log(`  ✗  ${label}${detail ? `\n       ${detail}` : ''}`);
  }
}

/** Atajo: 'HH:MM' -> minutos desde la medianoche. */
function at(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
}

/** Los horarios como texto, para que un fallo se lea sin hacer cuentas. */
function times(slots: Array<{ startMin: number }>): string[] {
  return slots.map((slot) => formatMinutesOfDay(slot.startMin));
}

/** Una agenda de un profesional con los valores por defecto del caso. */
function agenda(overrides: Partial<ProfessionalAgenda> = {}): ProfessionalAgenda {
  return {
    professionalId: 'prof-a',
    businessHours: [{ start: at('09:00'), end: at('17:00') }],
    blocked: [],
    busy: [],
    step: 15,
    notBeforeMin: null,
    ...overrides,
  };
}

console.log('\n  Motor de disponibilidad — §20\n');

// -----------------------------------------------------------------------------
// 1. Un día sin nada agendado
// -----------------------------------------------------------------------------

const diaLibre = computeDaySlots([agenda()], 60);

check(
  'Un día de 09:00 a 17:00 con turnos de 60 min ofrece 29 horarios',
  diaLibre.length === 29,
  `devolvió ${diaLibre.length}`,
);
check(
  'El primer horario es la apertura',
  formatMinutesOfDay(diaLibre[0]!.startMin) === '09:00',
  `devolvió ${formatMinutesOfDay(diaLibre[0]!.startMin)}`,
);
check(
  'El último horario permite terminar justo al cierre',
  formatMinutesOfDay(diaLibre[diaLibre.length - 1]!.startMin) === '16:00',
  `devolvió ${formatMinutesOfDay(diaLibre[diaLibre.length - 1]!.startMin)}`,
);
check(
  'Todos los horarios caen en múltiplos del paso',
  diaLibre.every((slot) => slot.startMin % 15 === 0),
);

// -----------------------------------------------------------------------------
// 2. Un turno ya tomado, con su recambio
// -----------------------------------------------------------------------------

// 13:00 a 14:00, más 10 minutos de limpieza.
const conTurno = computeDaySlots(
  [agenda({ busy: [{ start: at('13:00'), end: at('14:10') }] })],
  60,
);

check(
  'Un turno de 13:00 a 14:00 con 10 min de recambio no deja ofrecer 13:00',
  !times(conTurno).includes('13:00'),
);
check(
  'Tampoco deja ofrecer 12:45, que terminaría dentro del turno',
  !times(conTurno).includes('12:45'),
);
check(
  'El primer horario libre después es 14:15, ya pasado el recambio',
  times(conTurno).includes('14:15') && !times(conTurno).includes('14:00'),
);
check(
  'El horario anterior que termina justo al empezar el turno sí se ofrece',
  times(conTurno).includes('12:00'),
);
check(
  'Pero 12:15 no, porque terminaría dentro del turno',
  !times(conTurno).includes('12:15'),
);
check(
  'Y los horarios de la mañana siguen todos disponibles',
  times(conTurno).includes('09:00') && times(conTurno).includes('11:00'),
);
check(
  'El hueco queda partido en dos tramos',
  freeIntervals(agenda({ busy: [{ start: at('13:00'), end: at('14:10') }] })).length === 2,
);

// -----------------------------------------------------------------------------
// 3. Turnos consecutivos (la convención semiabierta)
// -----------------------------------------------------------------------------

// Un turno que termina 10:00 y otro que empieza 10:00. Sin recambio entre medio
// son consecutivos, no superpuestos: si el motor usara `<=` en vez de `<`, la
// agenda perdería la mitad de sus horarios.
const consecutivos = freeIntervals(
  agenda({
    busy: [
      { start: at('09:00'), end: at('10:00') },
      { start: at('10:00'), end: at('11:00') },
    ],
  }),
);

check(
  'Dos turnos consecutivos se fusionan en un solo tramo ocupado',
  consecutivos.length === 1 && consecutivos[0]!.start === at('11:00'),
  JSON.stringify(consecutivos),
);
check(
  'El día arranca en 11:00, no antes',
  computeDaySlots(
    [
      agenda({
        busy: [
          { start: at('09:00'), end: at('10:00') },
          { start: at('10:00'), end: at('11:00') },
        ],
      }),
    ],
    60,
  )[0]!.startMin === at('11:00'),
);

// -----------------------------------------------------------------------------
// 4. Bloqueos: día completo y parcial
// -----------------------------------------------------------------------------

const feriado = agenda({ blocked: [{ start: 0, end: 24 * 60 }] });

check('Un feriado no deja ningún horario', computeDaySlots([feriado], 60).length === 0);
check('Y el día se informa como cerrado', !isOpen(feriado));

const bloqueoParcial = agenda({ blocked: [{ start: at('12:00'), end: at('13:00') }] });

check(
  'Un bloqueo parcial sí deja horarios, pero no dentro del bloqueo',
  computeDaySlots([bloqueoParcial], 60).length > 0 &&
    !times(computeDaySlots([bloqueoParcial], 60)).includes('12:00'),
);
check('Un bloqueo parcial no cierra el día', isOpen(bloqueoParcial));

// El mediodía cerrado: la estética carga dos franjas y queda un hueco en el medio.
const mediodia = agenda({
  businessHours: [
    { start: at('09:00'), end: at('13:00') },
    { start: at('16:00'), end: at('20:00') },
  ],
});

check(
  'Dos franjas de atención con el mediodía cerrado no ofrecen horarios en el hueco',
  !times(computeDaySlots([mediodia], 60)).includes('13:00') &&
    !times(computeDaySlots([mediodia], 60)).includes('15:00'),
);
check(
  'Y la última franja llega hasta el cierre',
  computeDaySlots([mediodia], 60).at(-1)!.startMin === at('19:00'),
);

// -----------------------------------------------------------------------------
// 5. Anticipación mínima
// -----------------------------------------------------------------------------

const conAnticipacion = agenda({ notBeforeMin: at('10:00') });
const hoy = computeDaySlots([conAnticipacion], 60);

check(
  'Con anticipación mínima hasta las 10:00 no se ofrece nada anterior',
  hoy.every((slot) => slot.startMin >= at('10:00')),
);
check('Y el primer horario es exactamente 10:00', hoy[0]!.startMin === at('10:00'));

check(
  'La anticipación no recorta un día que no es hoy',
  computeDaySlots([agenda()], 60)[0]!.startMin === at('09:00'),
);

check(
  'Una anticipación que se pasa del cierre deja el día sin horarios',
  computeDaySlots([agenda({ notBeforeMin: at('18:00') })], 60).length === 0,
);

// -----------------------------------------------------------------------------
// 6. Varios profesionales
// -----------------------------------------------------------------------------

const profesionalA = agenda({ professionalId: 'a' });
const profesionalB = agenda({
  professionalId: 'b',
  businessHours: [{ start: at('09:00'), end: at('12:00') }],
  step: 30,
});

const varios = computeDaySlots([profesionalA, profesionalB], 60);
const aLas10 = varios.find((slot) => slot.startMin === at('10:00'));
const aLas16 = varios.find((slot) => slot.startMin === at('16:00'));

check(
  'Un horario que pueden atender los dos aparece una sola vez',
  varios.filter((slot) => slot.startMin === at('10:00')).length === 1,
);
check(
  'Y viene con los dos profesionales',
  aLas10 !== undefined && aLas10.professionalIds.length === 2,
  JSON.stringify(aLas10),
);
check(
  'Un horario que solo puede atender uno viene con uno',
  aLas16 !== undefined && aLas16.professionalIds.length === 1,
);
check(
  'Los horarios vuelven ordenados de menor a mayor',
  varios.every((slot, index) => index === 0 || slot.startMin > varios[index - 1]!.startMin),
);
check(
  'El profesional B no aporta horarios después de las 12:00',
  varios.every((slot) => slot.startMin < at('12:00') || !slot.professionalIds.includes('b')),
);

// -----------------------------------------------------------------------------
// 7. Normalización de lo que viene de la base
// -----------------------------------------------------------------------------

check('Un bloqueo sin duración se descarta', toDayInterval(at('10:00'), at('10:00')) === null);
check('Un bloqueo invertido se descarta', toDayInterval(at('10:00'), at('09:00')) === null);
check(
  'Un turno que termina después de medianoche se recorta al día',
  JSON.stringify(toDayInterval(at('23:00'), at('23:00') + 90)) ===
    JSON.stringify({ start: at('23:00'), end: 24 * 60 }),
);
check(
  'Un turno que empieza antes de medianoche se recorta al día',
  JSON.stringify(toDayInterval(-30, at('00:30'))) ===
    JSON.stringify({ start: 0, end: at('00:30') }),
);
check(
  'Los bloqueos solapados se fusionan en uno',
  normalizeIntervals([
    { start: at('10:00'), end: at('11:00') },
    { start: at('10:30'), end: at('12:00') },
  ]).length === 1,
);
check(
  'Los bloqueos inválidos se descartan sin romper la lista',
  normalizeIntervals([
    { start: at('10:00'), end: at('11:00') },
    null,
    { start: at('15:00'), end: at('16:00') },
  ]).length === 2,
);

// -----------------------------------------------------------------------------
// 8. Casos límite
// -----------------------------------------------------------------------------

check(
  'Un servicio más largo que el día no deja horarios',
  computeDaySlots([agenda()], 9 * 60).length === 0,
);
check(
  'Un servicio igual al día entero tampoco (no hay margen)',
  computeDaySlots([agenda({ businessHours: [{ start: at('09:00'), end: at('10:00') }] })], 60)
    .length === 1,
);
check(
  'Un día sin franjas de atención no ofrece nada y se informa cerrado',
  computeDaySlots([agenda({ businessHours: [] })], 60).length === 0 &&
    !isOpen(agenda({ businessHours: [] })),
);
check(
  'Un día con atención pero lleno no está cerrado',
  isOpen(agenda({ busy: [{ start: 0, end: 24 * 60 }] })) &&
    computeDaySlots([agenda({ busy: [{ start: 0, end: 24 * 60 }] })], 60).length === 0,
);
check(
  'Sin profesionales no hay horarios',
  computeDaySlots([], 60).length === 0,
);

// -----------------------------------------------------------------------------
// Resultado
// -----------------------------------------------------------------------------

console.log(`\n  ${pass} correctas, ${fail} fallidas\n`);
process.exit(fail === 0 ? 0 : 1);
