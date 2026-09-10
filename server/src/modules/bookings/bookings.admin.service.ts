// =============================================================================
// KAYA KALPA — Turnos vistos desde el panel
// =============================================================================
// Está separado de `bookings.service.ts` a propósito, y no es una cuestión de
// tamaño: son dos superficies con reglas distintas. El servicio público trabaja
// con el código y el token de cancelación y no conoce al cliente; este trabaja con
// el id y ve el teléfono de la persona. Tenerlos en el mismo archivo haría fácil
// que una consulta del panel se colara en una respuesta pública, que es
// exactamente el error que hay que no cometer.
// =============================================================================

import { BookingStatus } from '@prisma/client';
import { isBookingOverlapError, prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../utils/errors';
import {
  formatDateOnly,
  formatMinutesOfDay,
  salonMinutesOfDay,
} from '../../utils/datetime';
import { formatBookingCode } from './booking-code';
import { bookingRepository, type AdminBookingRow } from './bookings.repository';
import {
  allowedTransitionsFrom,
  canTransition,
  DEFAULT_REASON,
  STATUS_LABELS,
} from './bookings.transitions';
import type {
  AdminBookingEntry,
  BookingServiceLine,
  ListBookingsAdminQuery,
} from './bookings.types';

/** Quién hizo el cambio, para el historial. Sale de la sesión del panel. */
export interface AdminActor {
  id: string;
  /** El rol del AdminUser: 'ADMIN' o 'STAFF'. */
  role: string;
}

function toServiceLines(row: AdminBookingRow): BookingServiceLine[] {
  return row.services.map((line) => ({
    serviceId: line.serviceId,
    name: line.nameSnapshot,
    priceCents: line.priceCentsSnapshot,
    durationMin: line.durationMinSnapshot,
  }));
}

function toAdminEntry(row: AdminBookingRow): AdminBookingEntry {
  return {
    id: row.id,
    // El código formateado, igual que en la respuesta pública: si el panel lo
    // mostrara crudo y el cliente lo dictara formateado, comparar los dos sería
    // una fuente de confusión al teléfono.
    code: formatBookingCode(row.code),
    status: row.status,
    date: formatDateOnly(row.date),
    startTime: formatMinutesOfDay(salonMinutesOfDay(row.startAt)),
    // Se deriva del instante guardado y no de `inicio + duración`: `endAt` es lo
    // que realmente se escribió, y sumar por separado daría un segundo cálculo
    // que puede discrepar del primero.
    endTime: formatMinutesOfDay(salonMinutesOfDay(row.endAt)),
    totalDurationMin: row.totalDurationMin,
    totalPriceCents: row.totalPriceCents,
    hasPriceOnRequest: row.hasPriceOnRequest,
    notes: row.notes,
    customer: {
      id: row.customer.id,
      firstName: row.customer.firstName,
      lastName: row.customer.lastName,
      phone: row.customer.phone,
      email: row.customer.email,
    },
    professional: {
      id: row.professional.id,
      name: row.professional.name,
      color: row.professional.color,
    },
    services: toServiceLines(row),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt.toISOString(),
    allowedTransitions: allowedTransitionsFrom(row.status),
  };
}

export const bookingsAdminService = {
  async list(query: ListBookingsAdminQuery) {
    const { items, total } = await bookingRepository.listForAdmin(query);
    return { items: items.map(toAdminEntry), total };
  },

  async getById(id: string): Promise<AdminBookingEntry> {
    const row = await bookingRepository.findByIdForAdmin(id);
    if (!row) throw new NotFoundError('No encontramos ese turno.');
    return toAdminEntry(row);
  },

  /**
   * Cambia el estado de un turno desde el panel.
   *
   * Tres cosas pueden salir mal y cada una tiene su respuesta:
   *
   *   · El cambio no está permitido desde el estado actual (ver
   *     `bookings.transitions.ts`). Es un 409 con el motivo, no un 400: el pedido
   *     está bien formado, lo que no da es el estado del turno.
   *
   *   · Alguien más lo cambió entre que el panel cargó la agenda y el clic. La
   *     escritura va con el estado de origen en el `where`, así que no pisa nada,
   *     pero el panel tiene que enterarse de que su pantalla quedó vieja.
   *
   *   · Reactivar un turno atendido o ausente (vuelve a ocupar la agenda) cuando
   *     otro turno ya se quedó con ese horario. Lo rechaza el constraint de
   *     Postgres y se traduce a un mensaje entendible.
   */
  async changeStatus(
    id: string,
    toStatus: BookingStatus,
    actor: AdminActor,
    reason?: string,
  ): Promise<AdminBookingEntry> {
    const current = await bookingRepository.findByIdForAdmin(id);
    if (!current) throw new NotFoundError('No encontramos ese turno.');

    const fromStatus = current.status;

    if (fromStatus === toStatus) {
      throw new ConflictError(
        `Ese turno ya está ${STATUS_LABELS[toStatus]}.`,
      );
    }

    if (!canTransition(fromStatus, toStatus)) {
      throw new ConflictError(
        `Un turno ${STATUS_LABELS[fromStatus]} no puede pasar a ${STATUS_LABELS[toStatus]}.` +
          (fromStatus === BookingStatus.CANCELLED
            ? ' El horario ya se liberó: si hay que atender a esa persona, hay que reservar de nuevo.'
            : ''),
      );
    }

    try {
      const changed = await prisma.$transaction((tx) =>
        bookingRepository.changeStatus(tx, id, fromStatus, toStatus, {
          reason: reason ?? DEFAULT_REASON[toStatus],
          actorType: actor.role,
          actorId: actor.id,
        }),
      );

      if (!changed) {
        throw new ConflictError(
          'Alguien más cambió el estado de ese turno mientras lo mirabas. Recargá la agenda para ver cómo quedó.',
        );
      }
    } catch (error) {
      // El turno vuelve a ocupar la agenda y ese horario ya es de otro. Se explica
      // qué pasó en vez de devolver un error del servidor por algo que es una
      // situación previsible del salón.
      if (isBookingOverlapError(error)) {
        throw new ConflictError(
          'Ese horario ya lo ocupa otro turno, así que no se puede reactivar. Si el cliente va a venir, reservale un horario nuevo.',
          { cause: error },
        );
      }
      throw error;
    }

    // Se relee en vez de parchear la fila que ya se tenía: el historial y los
    // campos de cancelación los escribió la transacción, y adivinar acá cómo
    // quedaron sería duplicar esa lógica.
    return bookingsAdminService.getById(id);
  },
};
