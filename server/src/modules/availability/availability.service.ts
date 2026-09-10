// =============================================================================
// KAYA KALPA — Disponibilidad: consulta y armado de agendas
// =============================================================================
// Acá está la parte con entrada/salida del motor: traducir instantes a minutos del
// salón, juntar los datos de un día y llamar a las funciones puras de
// `availability.engine.ts`.
//
// El punto §20 del prompt es explícito: la disponibilidad la decide el backend.
// Por eso este servicio es el único lugar del sistema que responde "¿qué horarios
// hay?", y el frontend se limita a dibujar lo que devuelve.
//
// Se expone en dos formas, y las dos usan el mismo cálculo:
//
//   · `getAvailability` — la respuesta completa del día, para el asistente.
//   · `candidatesFor`   — quiénes pueden atender un horario concreto, ahora.
//
// La segunda es la que usa el módulo de reservas, tanto para elegir profesional
// como para reverificar dentro de la transacción. Que las dos pasen por el mismo
// camino es lo que garantiza que lo que se ofreció sea lo que se verifica.
// =============================================================================

import { env } from '../../config/env';
import { prisma, type Db } from '../../config/prisma';
import { AppError, ErrorCode, NotFoundError } from '../../utils/errors';
import {
  diffInDays,
  formatMinutesOfDay,
  parseDateOnly,
  salonMinutesFromDayStart,
  salonMinutesOfDay,
  todayInSalon,
  weekdayOf,
  type DateOnly,
} from '../../utils/datetime';
import { serviceRepository } from '../services/services.repository';
import {
  computeDaySlots,
  FULL_DAY,
  isOpen,
  normalizeIntervals,
  toDayInterval,
  type ProfessionalAgenda,
  type SlotOption,
} from './availability.engine';
import { availabilityRepository } from './availability.repository';
import type { AvailabilityQuery, AvailabilityResult } from './availability.types';

/** Lo mínimo para calcular: qué servicios, para qué día y para quién. */
export interface SlotRequest {
  serviceIds: string[];
  professionalId?: string;
  date: DateOnly;
}

/** Fila de agenda con las reglas propias del profesional. */
type ProfessionalRow = Awaited<
  ReturnType<typeof availabilityRepository.findProfessionalsForServices>
>[number];

/** El día ya resuelto: los datos que se cargaron una sola vez. */
interface DayData {
  target: Date;
  /** `true` si la fecha consultada es hoy, que es cuando hay que recortar lo que ya pasó. */
  isToday: boolean;
  /** Hora actual en minutos. Solo tiene sentido si `isToday`. */
  nowMin: number;
  hours: Awaited<ReturnType<typeof availabilityRepository.findBusinessHours>>;
  blockedDates: Awaited<ReturnType<typeof availabilityRepository.findBlockedDates>>;
  blockedTimes: Awaited<ReturnType<typeof availabilityRepository.findBlockedTimes>>;
  bookings: Awaited<ReturnType<typeof availabilityRepository.findBusyBookings>>;
}

/** El día calculado, más el dato que necesitan quienes tienen que decidir si es un error. */
interface DayPlan {
  date: DateOnly;
  totalDurationMin: number;
  closed: boolean;
  slots: SlotOption[];
  /** Cuántos profesionales pueden hacer los servicios pedidos. 0 = ninguno. */
  matchedProfessionals: number;
}

// -----------------------------------------------------------------------------
// Validaciones previas
// -----------------------------------------------------------------------------

/**
 * Comprueba que los servicios existan, estén activos y se puedan reservar online.
 *
 * Devuelve la duración total del turno, que es lo que el motor usa para saber si
 * un horario entra. Un servicio sin duración cargada no se puede agendar: no hay
 * forma de saber cuándo termina, así que se rechaza en vez de asumir un valor.
 */
async function resolveDuration(serviceIds: string[], db: Db): Promise<number> {
  // Se descartan los repetidos antes de consultar: si el cliente manda dos veces
  // el mismo servicio, la comparación de cantidades de abajo fallaría sin motivo.
  const unique = [...new Set(serviceIds)];
  const services = await serviceRepository.findManyForBooking(unique, db);

  if (services.length !== unique.length) {
    throw new NotFoundError(
      'Alguno de los servicios elegidos ya no está disponible. Actualizá la página y volvé a intentar.',
    );
  }

  const durations = services.map((service) => {
    if (!service.bookable || !service.durationMin) {
      throw new AppError(
        400,
        ErrorCode.SERVICE_NOT_BOOKABLE,
        `"${service.name}" todavía no se puede reservar online. Escribinos por WhatsApp y lo coordinamos.`,
      );
    }
    return service.durationMin;
  });

  return durations.reduce((total, minutes) => total + minutes, 0);
}

/**
 * Cuántos días faltan para la fecha pedida, validando que esté dentro de la ventana.
 *
 * Devuelve el número de días porque quien llama lo necesita además para comparar
 * contra el límite propio de cada profesional: así la resta se hace una sola vez.
 */
function daysAheadWithinWindow(dateOnly: DateOnly): number {
  const daysAhead = diffInDays(parseDateOnly(todayInSalon()), parseDateOnly(dateOnly));

  if (daysAhead < 0) {
    throw new AppError(
      400,
      ErrorCode.OUTSIDE_BOOKING_WINDOW,
      'Esa fecha ya pasó. Elegí una fecha a partir de hoy.',
    );
  }

  if (daysAhead > env.MAX_ADVANCE_DAYS) {
    throw new AppError(
      400,
      ErrorCode.OUTSIDE_BOOKING_WINDOW,
      `Todavía no se pueden reservar turnos con más de ${env.MAX_ADVANCE_DAYS} días de anticipación.`,
    );
  }

  return daysAhead;
}

// -----------------------------------------------------------------------------
// Armado de la agenda de cada profesional
// -----------------------------------------------------------------------------

function buildAgenda(professional: ProfessionalRow, day: DayData): ProfessionalAgenda {
  const isMine = (professionalId: string | null): boolean =>
    professionalId === null || professionalId === professional.id;

  const businessHours = day.hours
    .filter((hour) => hour.professionalId === professional.id)
    .map((hour) => toDayInterval(hour.startMin, hour.endMin))
    .filter((interval) => interval !== null);

  // Un día bloqueado entero tapa todo, así que no vale la pena mirar además los
  // bloqueos parciales: el resultado es el mismo y se ahorra el trabajo.
  const dayBlocked = day.blockedDates.some((row) => isMine(row.professionalId));
  const blocked = dayBlocked
    ? [FULL_DAY]
    : normalizeIntervals(
        day.blockedTimes
          .filter((row) => isMine(row.professionalId))
          .map((row) => toDayInterval(row.startMin, row.endMin)),
      );

  const busy = normalizeIntervals(
    day.bookings
      .filter((booking) => booking.professionalId === professional.id)
      .map((booking) =>
        toDayInterval(
          salonMinutesFromDayStart(booking.startAt, day.target),
          salonMinutesFromDayStart(booking.occupiedUntil, day.target),
        ),
      ),
  );

  return {
    professionalId: professional.id,
    businessHours,
    blocked,
    busy,
    step: professional.slotStepMin,
    // Si el día no es hoy, ningún horario pasó todavía y no hay nada que recortar.
    notBeforeMin: day.isToday ? day.nowMin + professional.minLeadMin : null,
  };
}

// -----------------------------------------------------------------------------
// Cálculo
// -----------------------------------------------------------------------------

/**
 * Resuelve el día completo. Es el único camino de cálculo del sistema.
 *
 * No decide si la ausencia de profesionales es un error: eso depende de quién
 * pregunta. El asistente tiene que responder 404 si el cliente nombró a alguien
 * que no existe; la reserva, simplemente, no tiene candidatos.
 */
async function planDay(request: SlotRequest, db: Db): Promise<DayPlan> {
  const totalDurationMin = await resolveDuration(request.serviceIds, db);
  const daysAhead = daysAheadWithinWindow(request.date);

  const professionals = await availabilityRepository.findProfessionalsForServices(
    request.serviceIds,
    request.professionalId,
    db,
  );

  if (professionals.length === 0) {
    return {
      date: request.date,
      totalDurationMin,
      closed: true,
      slots: [],
      matchedProfessionals: 0,
    };
  }

  // Cada profesional puede tener su propio límite de anticipación. Si ninguno
  // llega hasta la fecha pedida, la fecha está fuera de la ventana de todos.
  const eligible = professionals.filter(
    (professional) => daysAhead <= professional.maxAdvanceDays,
  );

  if (eligible.length === 0) {
    throw new AppError(
      400,
      ErrorCode.OUTSIDE_BOOKING_WINDOW,
      'Todavía no se pueden reservar turnos para esa fecha. Probá con una más cercana.',
    );
  }

  const professionalIds = eligible.map((professional) => professional.id);
  const target = parseDateOnly(request.date);
  const isToday = request.date === todayInSalon();

  // Las cuatro consultas van juntas: son independientes entre sí y en serie
  // sumarían cuatro veces la latencia de la base.
  const [hours, blockedDates, blockedTimes, bookings] = await Promise.all([
    availabilityRepository.findBusinessHours(professionalIds, weekdayOf(target), db),
    availabilityRepository.findBlockedDates(target, professionalIds, db),
    availabilityRepository.findBlockedTimes(target, professionalIds, db),
    availabilityRepository.findBusyBookings(target, professionalIds, db),
  ]);

  const day: DayData = {
    target,
    isToday,
    nowMin: salonMinutesOfDay(new Date()),
    hours,
    blockedDates,
    blockedTimes,
    bookings,
  };

  const agendas = eligible.map((professional) => buildAgenda(professional, day));

  return {
    date: request.date,
    totalDurationMin,
    // Se calcula sobre las agendas y no sobre `slots`: un día abierto pero
    // completo tiene la lista vacía y aun así no está cerrado.
    closed: !agendas.some(isOpen),
    slots: computeDaySlots(agendas, totalDurationMin),
    matchedProfessionals: professionals.length,
  };
}

// -----------------------------------------------------------------------------
// Servicio
// -----------------------------------------------------------------------------

export const availabilityService = {
  /** La respuesta completa del día, tal como la consume el asistente de turnos. */
  async getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    const plan = await planDay(query, prisma);

    if (query.professionalId && plan.matchedProfessionals === 0) {
      throw new AppError(
        404,
        ErrorCode.PROFESSIONAL_UNAVAILABLE,
        'Ese profesional no está disponible para los servicios elegidos.',
      );
    }

    return {
      date: plan.date,
      totalDurationMin: plan.totalDurationMin,
      closed: plan.closed,
      slots: plan.slots.map((slot) => ({
        startMin: slot.startMin,
        startTime: formatMinutesOfDay(slot.startMin),
        professionalIds: slot.professionalIds,
      })),
    };
  },

  /**
   * Quiénes pueden atender ese horario exacto, calculado en este momento.
   *
   * Es la pregunta que hace la reserva antes de escribir, y la que vuelve a hacer
   * dentro de la transacción. Devuelve una lista vacía si el horario ya no sirve
   * —se ocupó, se bloqueó el día, o el profesional dejó de estar disponible—, sin
   * distinguir el motivo: para quien reserva son todos el mismo caso.
   *
   * La lista viene en el orden de prioridad de la estética (`sortOrder`), así que
   * el primero es al que le corresponde el turno cuando el cliente no eligió.
   */
  async candidatesFor(request: SlotRequest, startMin: number, db: Db = prisma): Promise<string[]> {
    const plan = await planDay(request, db);
    return plan.slots.find((slot) => slot.startMin === startMin)?.professionalIds ?? [];
  },
};
