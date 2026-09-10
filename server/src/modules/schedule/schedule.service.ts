// =============================================================================
// KAYA KALPA — Lógica de la agenda
// =============================================================================
// Las reglas que se aplican acá son las que evitan que el panel cargue una agenda
// imposible: franjas invertidas o superpuestas, bloqueos duplicados, horarios de
// un profesional que no existe. Ninguna de esas cosas rompe el sistema en el
// momento, pero dejan el motor de disponibilidad devolviendo días vacíos sin que
// nadie entienda por qué.
// =============================================================================

import { ConflictError, NotFoundError } from '../../utils/errors';
import { formatDateOnly, formatMinutesOfDay, parseDateOnly } from '../../utils/datetime';
import { scheduleRepository } from './schedule.repository';
import type {
  BlockedDateEntry,
  BlockedTimeEntry,
  BusinessHourEntry,
  TimeRange,
  WeekdaySchedule,
} from './schedule.types';
import type {
  CreateBlockedDateBody,
  CreateBlockedTimeBody,
  CreateBusinessHourBody,
  ListBlockedDatesQuery,
  ListBlockedTimesQuery,
  ListBusinessHoursQuery,
  UpdateBusinessHourBody,
} from './schedule.validation';

/** Los siete días, de domingo a sábado, en el orden de `weekday`. */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Arma el `TimeRange` con los minutos y su texto ya resuelto. */
function toRange(startMin: number, endMin: number): TimeRange {
  return {
    startMin,
    endMin,
    startTime: formatMinutesOfDay(startMin),
    endTime: formatMinutesOfDay(endMin),
  };
}

/**
 * Une franjas que se tocan o se superponen.
 *
 * Hace falta porque los horarios son POR PROFESIONAL y la web muestra "cuándo
 * abre la estética". Con dos profesionales que trabajan 09:00–13:00 y
 * 09:00–12:00, sin unir aparecerían dos franjas casi iguales; y con una que
 * trabaja 09:00–13:00 y otra 13:00–19:00, mostrarlas separadas sugeriría un corte
 * al mediodía que en realidad no existe.
 *
 * Se unen también las que se tocan exactamente (`startMin <= last.endMin`), que
 * es justo el caso del mediodía.
 */
function mergeRanges(ranges: Array<{ startMin: number; endMin: number }>): TimeRange[] {
  const sorted = [...ranges].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin,
  );

  const merged: Array<{ startMin: number; endMin: number }> = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];

    if (last && range.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, range.endMin);
      continue;
    }

    // Copia y no la referencia original: se mutan los extremos al unir, y hacerlo
    // sobre el objeto que devolvió Prisma ensuciaría el resultado del repositorio.
    merged.push({ startMin: range.startMin, endMin: range.endMin });
  }

  return merged.map((range) => toRange(range.startMin, range.endMin));
}

/**
 * Comprueba que el profesional exista y devuelve su nombre.
 *
 * `null` significa "todos", que no es un profesional sino la ausencia de uno: se
 * acepta sin consultar nada y devuelve `null` como nombre.
 */
async function resolveProfessional(professionalId: string | null): Promise<string | null> {
  if (professionalId === null) return null;

  const name = await scheduleRepository.findProfessionalName(professionalId);

  if (name === null) {
    throw new NotFoundError('No encontramos ese profesional.');
  }

  return name;
}

function toBusinessHourEntry(row: {
  id: string;
  professionalId: string;
  weekday: number;
  startMin: number;
  endMin: number;
  active: boolean;
  professional: { name: string };
}): BusinessHourEntry {
  return {
    id: row.id,
    professionalId: row.professionalId,
    professionalName: row.professional.name,
    weekday: row.weekday,
    active: row.active,
    ...toRange(row.startMin, row.endMin),
  };
}

export const scheduleService = {
  /**
   * El horario de atención de la estética, día por día.
   *
   * Son siete entradas siempre, incluidas las de los días cerrados: el frontend
   * tiene que poder pintar "Domingo: cerrado" sin deducir qué días faltan, y una
   * lista con huecos obligaría a reconstruirla en cada pantalla.
   */
  async listPublicHours(): Promise<WeekdaySchedule[]> {
    const rows = await scheduleRepository.listPublicBusinessHours();

    return WEEKDAYS.map((weekday) => {
      const ranges = mergeRanges(rows.filter((row) => row.weekday === weekday));
      return { weekday, closed: ranges.length === 0, ranges };
    });
  },

  // ---------------------------------------------------------------------------
  // Horarios de atención
  // ---------------------------------------------------------------------------

  async listBusinessHours(query: ListBusinessHoursQuery): Promise<BusinessHourEntry[]> {
    const rows = await scheduleRepository.listBusinessHours(query.professionalId);
    return rows.map(toBusinessHourEntry);
  },

  async createBusinessHour(body: CreateBusinessHourBody): Promise<BusinessHourEntry> {
    await resolveProfessional(body.professionalId);

    // El índice único de la tabla es `[professionalId, weekday, startMin]`, así
    // que el choque posible es exactamente este: dos franjas que arrancan a la
    // misma hora el mismo día. Dos franjas del mismo día que arrancan distinto
    // son válidas —es el turno partido de la mañana y la tarde—, aunque se
    // superpongan; de superponerse, el motor las resta dos veces y no molesta.
    if (
      await scheduleRepository.businessHourExists(
        body.professionalId,
        body.weekday,
        body.startMin,
      )
    ) {
      throw new ConflictError(
        `Ya hay una franja que empieza a las ${formatMinutesOfDay(body.startMin)} ese día.`,
      );
    }

    const created = await scheduleRepository.createBusinessHour(body);
    return scheduleService.getBusinessHour(created.id);
  },

  async getBusinessHour(id: string): Promise<BusinessHourEntry> {
    const row = await scheduleRepository.findBusinessHourDetail(id);

    if (!row) {
      throw new NotFoundError('No encontramos esa franja de atención.');
    }

    return toBusinessHourEntry(row);
  },

  async updateBusinessHour(
    id: string,
    body: UpdateBusinessHourBody,
  ): Promise<BusinessHourEntry> {
    const current = await scheduleRepository.findBusinessHourById(id);

    if (!current) {
      throw new NotFoundError('No encontramos esa franja de atención.');
    }

    // Solo se comprueba el choque si alguno de los tres campos del índice cambia.
    // Si no, editar solo el `active` de una franja chocaría contra sí misma.
    const weekday = body.weekday ?? current.weekday;
    const startMin = body.startMin ?? current.startMin;

    if (
      (weekday !== current.weekday || startMin !== current.startMin) &&
      (await scheduleRepository.businessHourExists(
        current.professionalId,
        weekday,
        startMin,
        id,
      ))
    ) {
      throw new ConflictError(
        `Ya hay una franja que empieza a las ${formatMinutesOfDay(startMin)} ese día.`,
      );
    }

    await scheduleRepository.updateBusinessHour(id, body);
    return scheduleService.getBusinessHour(id);
  },

  async deleteBusinessHour(id: string): Promise<void> {
    const current = await scheduleRepository.findBusinessHourById(id);

    if (!current) {
      throw new NotFoundError('No encontramos esa franja de atención.');
    }

    await scheduleRepository.deleteBusinessHour(id);
  },

  // ---------------------------------------------------------------------------
  // Días bloqueados
  // ---------------------------------------------------------------------------

  async listBlockedDates(query: ListBlockedDatesQuery): Promise<BlockedDateEntry[]> {
    const rows = await scheduleRepository.listBlockedDates(
      query.from ? parseDateOnly(query.from) : undefined,
      query.to ? parseDateOnly(query.to) : undefined,
    );

    return rows.map((row) => ({
      id: row.id,
      professionalId: row.professionalId,
      professionalName: row.professional?.name ?? null,
      date: formatDateOnly(row.date),
      reason: row.reason,
    }));
  },

  async createBlockedDate(body: CreateBlockedDateBody): Promise<BlockedDateEntry> {
    const professionalName = await resolveProfessional(body.professionalId);

    const date = parseDateOnly(body.date);

    // Ver `blockedDateExists`: el índice único no cubre los bloqueos globales
    // porque en SQL dos NULL no chocan entre sí.
    if (await scheduleRepository.blockedDateExists(body.professionalId, date)) {
      throw new ConflictError(
        body.professionalId === null
          ? 'Ese día ya está bloqueado para toda la estética.'
          : 'Ese profesional ya tiene ese día bloqueado.',
      );
    }

    const created = await scheduleRepository.createBlockedDate({
      professionalId: body.professionalId,
      date,
      reason: body.reason ?? null,
    });

    // Se devuelve la fila ya armada para que el panel la inserte sin recargar el
    // listado. El nombre sale de la comprobación de arriba, no de otra consulta.
    return {
      id: created.id,
      professionalId: body.professionalId,
      professionalName,
      date: body.date,
      reason: body.reason ?? null,
    };
  },

  async deleteBlockedDate(id: string): Promise<void> {
    const current = await scheduleRepository.findBlockedDateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese bloqueo.');
    }

    await scheduleRepository.deleteBlockedDate(id);
  },

  // ---------------------------------------------------------------------------
  // Franjas bloqueadas
  // ---------------------------------------------------------------------------

  async listBlockedTimes(query: ListBlockedTimesQuery): Promise<BlockedTimeEntry[]> {
    const rows = await scheduleRepository.listBlockedTimes(
      query.date ? parseDateOnly(query.date) : undefined,
      query.professionalId,
    );

    return rows.map((row) => ({
      id: row.id,
      professionalId: row.professionalId,
      professionalName: row.professional?.name ?? null,
      date: formatDateOnly(row.date),
      reason: row.reason,
      ...toRange(row.startMin, row.endMin),
    }));
  },

  async createBlockedTime(body: CreateBlockedTimeBody): Promise<BlockedTimeEntry> {
    const professionalName = await resolveProfessional(body.professionalId);

    const date = parseDateOnly(body.date);

    const overlapping = await scheduleRepository.findOverlappingBlockedTimes({
      professionalId: body.professionalId,
      date,
      startMin: body.startMin,
      endMin: body.endMin,
    });

    if (overlapping.length > 0) {
      // El primero alcanza para explicar el choque; listarlos todos no aporta y
      // haría el mensaje ilegible con varios bloqueos encadenados.
      const first = overlapping[0] as { startMin: number; endMin: number };
      throw new ConflictError(
        `Se superpone con un bloqueo de ${formatMinutesOfDay(first.startMin)} a ${formatMinutesOfDay(first.endMin)}.`,
      );
    }

    const created = await scheduleRepository.createBlockedTime({
      professionalId: body.professionalId,
      date,
      startMin: body.startMin,
      endMin: body.endMin,
      reason: body.reason ?? null,
    });

    return {
      id: created.id,
      professionalId: body.professionalId,
      professionalName,
      date: body.date,
      reason: body.reason ?? null,
      ...toRange(body.startMin, body.endMin),
    };
  },

  async deleteBlockedTime(id: string): Promise<void> {
    // Se busca antes en vez de borrar y capturar el error: un `catch` alrededor
    // del `delete` se tragaría también una caída de conexión y la reportaría como
    // "no existe", que es justo el error que hace perder una tarde de trabajo.
    if (!(await scheduleRepository.findBlockedTimeById(id))) {
      throw new NotFoundError('No encontramos ese bloqueo.');
    }

    await scheduleRepository.deleteBlockedTime(id);
  },
};
