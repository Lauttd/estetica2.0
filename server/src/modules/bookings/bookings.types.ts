// =============================================================================
// KAYA KALPA — Tipos del módulo de turnos
// =============================================================================

import type { BookingStatus } from '@prisma/client';
import type { DateOnly, MinutesOfDay } from '../../utils/datetime';

export interface CreateBookingInput {
  serviceIds: string[];
  /**
   * Opcional. Sin él, el turno se le asigna al primer profesional disponible
   * según el orden de prioridad que la estética configura en el panel.
   */
  professionalId?: string;
  date: DateOnly;
  /** Minutos desde la medianoche del salón. Es el valor que devuelve /availability. */
  startMin: MinutesOfDay;
  customer: {
    firstName: string;
    lastName: string;
    /** Como lo escriba el cliente. Se normaliza antes de guardarlo. */
    phone: string;
    email?: string;
    notes?: string;
  };
}

export interface BookingServiceLine {
  serviceId: string;
  name: string;
  /** `null` = precio a consultar. Se guarda así, sin inventar un cero. */
  priceCents: number | null;
  durationMin: number;
}

/**
 * Un turno tal como se le muestra al cliente.
 *
 * DOS NIVELES DE ACCESO, a propósito:
 *
 *   · Con solo el código —que es lo que el cliente dicta o anota— se ve cuándo es
 *     el turno. Nada personal: ni nombre, ni teléfono, ni el token.
 *   · Con el token que se entrega al reservar se ve todo, y se puede cancelar.
 *
 * El código es corto y se dice en voz alta, así que no alcanza como secreto: si
 * por sí solo permitiera cancelar, cualquiera que lo escuche podría dar de baja
 * el turno de otra persona. El token es un UUID, no se dicta y no se adivina.
 */
export interface BookingDetail {
  /** El código como se muestra: 'KK-7F3K9M'. */
  code: string;
  status: BookingStatus;
  date: DateOnly;
  /** 'HH:MM' en hora del salón. */
  startTime: string;
  endTime: string;
  totalDurationMin: number;
  /** Suma de los precios cargados. Si `hasPriceOnRequest`, el total es parcial. */
  totalPriceCents: number;
  /** `true` si algún servicio del turno no tiene precio cargado. */
  hasPriceOnRequest: boolean;
  professional: {
    id: string;
    name: string;
  };
  services: BookingServiceLine[];
  /** `true` mientras el turno se pueda cancelar. */
  canCancel: boolean;
  /**
   * Solo viaja cuando la consulta trajo el token correcto, o en la respuesta del
   * alta. Es lo que el frontend guarda para poder cancelar más adelante.
   */
  cancelToken?: string;
}

// -----------------------------------------------------------------------------
// Panel
// -----------------------------------------------------------------------------

/**
 * Los filtros de la agenda del panel.
 *
 * El nombre coincide con el del tipo que infiere `bookings.admin.validation.ts`
 * a propósito: son la misma cosa vista desde los dos lados —lo que el esquema
 * produce y lo que el repositorio consume— y se llaman igual para que nadie tenga
 * que averiguar si son dos conceptos distintos. Que sigan coincidiendo no queda
 * librado a la memoria: el controlador pasa uno donde el servicio espera el otro,
 * y si se separan, esa llamada deja de compilar.
 */
export interface ListBookingsAdminQuery {
  /** Un día concreto. Tiene prioridad sobre el rango si vinieran los dos. */
  date?: Date;
  from?: Date;
  to?: Date;
  status?: BookingStatus;
  professionalId?: string;
  page: number;
  perPage: number;
}

/**
 * Un turno tal como lo ve el panel.
 *
 * Incluye al cliente con su teléfono —la agenda se trabaja llamando o
 * escribiendo— y el historial de cambios, que es lo que permite responder
 * "¿quién canceló esto?".
 */
export interface AdminBookingEntry {
  id: string;
  code: string;
  status: BookingStatus;
  date: DateOnly;
  startTime: string;
  endTime: string;
  totalDurationMin: number;
  totalPriceCents: number;
  hasPriceOnRequest: boolean;
  notes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    /** Formato internacional sin '+': 5493705194299. El panel lo muestra como quiera. */
    phone: string;
    email: string | null;
  };
  professional: { id: string; name: string; color: string };
  services: BookingServiceLine[];
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  /**
   * A qué estados se puede pasar desde el actual.
   *
   * Lo decide el servidor y no el panel: son las mismas reglas que aplica al
   * aceptar el cambio, y tenerlas en un solo lado evita que el botón ofrezca algo
   * que después la API rechaza.
   */
  allowedTransitions: BookingStatus[];
}
