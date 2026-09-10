// =============================================================================
// KAYA KALPA — Consultas del motor de disponibilidad
// =============================================================================
// Las consultas que necesita un cálculo de disponibilidad, todas acotadas al día
// y a los profesionales que se están evaluando. Se hacen de una sola vez y no
// dentro de un bucle: con cuatro profesionales, consultar por profesional serían
// veinte viajes a la base para armar una única respuesta.
//
// Todas reciben un cliente de base (`db`). En el uso normal es el cliente global;
// el módulo de reservas les pasa la transacción abierta, para que la verificación
// de disponibilidad y el alta del turno ocurran en la misma operación atómica. Es
// la diferencia entre "estaba libre hace un momento" y "está libre ahora".
// =============================================================================

import { prisma, type Db } from '../../config/prisma';
import { ACTIVE_BOOKING_STATUSES } from '../shared/booking-status';

export const availabilityRepository = {
  /**
   * Profesionales activos que pueden realizar TODOS los servicios indicados.
   *
   * Trae también las reglas de agenda (`minLeadMin`, `maxAdvanceDays`), que son
   * internas y por eso no están en la consulta pública de profesionales: acá se
   * usan para calcular, no se devuelven al cliente.
   */
  async findProfessionalsForServices(
    serviceIds: string[],
    professionalId?: string,
    db: Db = prisma,
  ) {
    return db.professional.findMany({
      where: {
        active: true,
        ...(professionalId ? { id: professionalId } : {}),
        // Un `some` por servicio, en `AND`: hace falta que los pueda hacer todos.
        AND: serviceIds.map((serviceId) => ({
          services: {
            some: {
              serviceId,
              service: { active: true, category: { active: true } },
            },
          },
        })),
      },
      select: {
        id: true,
        name: true,
        slotStepMin: true,
        minLeadMin: true,
        maxAdvanceDays: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  /** Franjas de atención cargadas para ese día de la semana. */
  async findBusinessHours(professionalIds: string[], weekday: number, db: Db = prisma) {
    return db.businessHour.findMany({
      where: { professionalId: { in: professionalIds }, weekday, active: true },
      select: { professionalId: true, startMin: true, endMin: true },
      orderBy: { startMin: 'asc' },
    });
  },

  /**
   * Días bloqueados que afectan a estos profesionales.
   *
   * Un bloqueo con `professionalId` nulo es global (feriado, vacaciones de la
   * estética entera) y afecta a todos; uno con profesional es una ausencia suya.
   */
  async findBlockedDates(date: Date, professionalIds: string[], db: Db = prisma) {
    return db.blockedDate.findMany({
      where: {
        date,
        OR: [{ professionalId: { in: professionalIds } }, { professionalId: null }],
      },
      select: { professionalId: true },
    });
  },

  /** Bloqueos parciales del día (un trámite, una capacitación, un rato ocupado). */
  async findBlockedTimes(date: Date, professionalIds: string[], db: Db = prisma) {
    return db.blockedTime.findMany({
      where: {
        date,
        OR: [{ professionalId: { in: professionalIds } }, { professionalId: null }],
      },
      select: { professionalId: true, startMin: true, endMin: true },
    });
  },

  /**
   * Turnos vigentes que tocan ese día.
   *
   * Se filtra por `date` y no por rango de instantes a propósito: la columna
   * `date` es el día del salón, ya calculado al reservar, así que la consulta no
   * hace aritmética de zonas horarias y usa el índice `[date, professionalId, status]`.
   *
   * Se traen `startAt` y `occupiedUntil` —no `endAt`— porque lo que bloquea la
   * agenda es el turno más su limpieza.
   */
  async findBusyBookings(date: Date, professionalIds: string[], db: Db = prisma) {
    return db.booking.findMany({
      where: {
        date,
        professionalId: { in: professionalIds },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      select: { professionalId: true, startAt: true, occupiedUntil: true },
    });
  },
};
