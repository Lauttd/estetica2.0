// =============================================================================
// KAYA KALPA — Reserva de turnos
// =============================================================================
// Es el módulo que cierra §20: convertir una elección del cliente en un turno,
// sin que dos personas puedan quedarse con el mismo horario.
//
// EL PUNTO CLAVE
//
// El horario que manda el cliente NO se cree. Se vuelve a preguntar al motor de
// disponibilidad si ese horario sigue existiendo, y esa pregunta se hace DENTRO
// de la misma transacción que escribe el turno, con la agenda del profesional
// bloqueada. Entre la respuesta de `/availability` y el `POST /bookings` pueden
// pasar minutos, y en ese rato el horario se pudo ocupar, bloquear o dejar de
// existir. Verificar afuera de la transacción sería verificar el pasado.
// =============================================================================

import { BookingStatus } from '@prisma/client';
import { isBookingOverlapError, isUniqueViolation, prisma } from '../../config/prisma';
import { AppError, ErrorCode, NotFoundError, SlotTakenError } from '../../utils/errors';
import {
  addMinutes,
  formatDateOnly,
  formatMinutesOfDay,
  parseDateOnly,
  salonMinutesOfDay,
  zonedTimeToInstant,
} from '../../utils/datetime';
import { normalizePhone } from '../../utils/phone';
import { availabilityService } from '../availability/availability.service';
import { serviceRepository } from '../services/services.repository';
import { formatBookingCode, normalizeBookingCode } from './booking-code';
import { bookingRepository, type BookingWrite } from './bookings.repository';
import type { BookingDetail, CreateBookingInput } from './bookings.types';
import { DEFAULT_BOOKING_DURATION_MIN } from '../shared/booking-policy';

/** Cuántas veces se reintenta si el código generado choca con uno existente. */
const CODE_RETRIES = 3;

type BookingRow = NonNullable<Awaited<ReturnType<typeof bookingRepository.findByCode>>>;
type ServiceRow = Awaited<ReturnType<typeof serviceRepository.findManyForBooking>>[number];

// -----------------------------------------------------------------------------
// Traducción de la fila a la respuesta
// -----------------------------------------------------------------------------

/**
 * Arma la respuesta para el cliente.
 *
 * `includeToken` decide si viaja el token de cancelación. Se incluye solo cuando
 * la consulta lo trajo corregido, o en la respuesta del alta, que es el único
 * momento en que el cliente lo recibe.
 */
function toDetail(row: BookingRow, includeToken: boolean): BookingDetail {
  const startMin = salonMinutesOfDay(row.startAt);

  return {
    code: formatBookingCode(row.code),
    status: row.status,
    // `formatDateOnly` y no `toISOString().slice(0, 10)`: lo segundo devuelve el
    // día en UTC y para un turno de las 22:00 en Argentina mostraría el siguiente.
    date: formatDateOnly(row.date),
    startTime: formatMinutesOfDay(startMin),
    endTime: formatMinutesOfDay(startMin + row.totalDurationMin),
    totalDurationMin: row.totalDurationMin,
    totalPriceCents: row.totalPriceCents,
    hasPriceOnRequest: row.hasPriceOnRequest,
    professional: { id: row.professional.id, name: row.professional.name },
    services: row.services.map((line) => ({
      serviceId: line.serviceId,
      name: line.nameSnapshot,
      priceCents: line.priceCentsSnapshot,
      durationMin: line.durationMinSnapshot,
    })),
    canCancel:
      row.status === BookingStatus.PENDING || row.status === BookingStatus.CONFIRMED,
    ...(includeToken ? { cancelToken: row.cancelToken } : {}),
  };
}

// -----------------------------------------------------------------------------
// Armado de la escritura
// -----------------------------------------------------------------------------

/**
 * Arma los datos que van a la base.
 *
 * Las tres fechas son distintas y cada una tiene su motivo:
 *
 *   startAt        el instante en que empieza, en UTC
 *   endAt          lo que se le muestra al cliente: inicio + duración
 *   occupiedUntil  lo que bloquea la agenda: endAt + el recambio del profesional
 *
 * Se guarda una copia del nombre, el precio y la duración de cada servicio: si
 * mañana la estética cambia la lista de precios, los turnos ya reservados siguen
 * diciendo lo que decían cuando se reservaron.
 */
function buildWrite(args: {
  input: CreateBookingInput;
  customerId: string;
  professionalId: string;
  bufferMin: number;
  services: ServiceRow[];
}): BookingWrite {
  const { input, customerId, professionalId, bufferMin, services } = args;

  const target = parseDateOnly(input.date);
  const startAt = zonedTimeToInstant(target, input.startMin);

  const totalDurationMin = DEFAULT_BOOKING_DURATION_MIN;
  const endAt = addMinutes(startAt, totalDurationMin);
  const occupiedUntil = addMinutes(endAt, bufferMin);

  // Un servicio sin precio suma cero al total, pero enciende la bandera para que
  // el frontend muestre "a consultar" en vez de un total que parece definitivo.
  const hasPriceOnRequest = services.some((service) => service.priceCents === null);
  const totalPriceCents = services.reduce(
    (total, service) => total + (service.priceCents ?? 0),
    0,
  );

  return {
    customerId,
    professionalId,
    date: target,
    startAt,
    endAt,
    occupiedUntil,
    totalPriceCents,
    hasPriceOnRequest,
    totalDurationMin,
    notes: input.customer.notes ?? null,
    services: services.map((service, index) => ({
      serviceId: service.id,
      nameSnapshot: service.name,
      priceCentsSnapshot: service.priceCents,
      durationMinSnapshot: DEFAULT_BOOKING_DURATION_MIN,
      sortOrder: service.sortOrder ?? index,
    })),
  };
}

/**
 * Intenta el alta con un profesional concreto, dentro de una transacción.
 *
 * Devuelve `null` si el horario dejó de estar disponible, para que quien llama
 * pruebe con el siguiente candidato. Cualquier otro problema se propaga.
 */
async function tryCreate(
  input: CreateBookingInput,
  professionalId: string,
  phone: string,
): Promise<BookingDetail | null> {
  const request = { ...input, professionalId };

  for (let attempt = 0; attempt < CODE_RETRIES; attempt += 1) {
    try {
      const row = await prisma.$transaction(async (tx) => {
        // 1. Bloquear la agenda. A partir de acá, ninguna otra reserva de este
        //    profesional para este día avanza hasta que esta transacción cierre.
        await bookingRepository.lockAgenda(tx, professionalId, input.date);

        // 2. Reverificar con la agenda ya bloqueada. Es el paso que hace que el
        //    horario ofrecido sea el horario entregado.
        const stillFree = await availabilityService.candidatesFor(
          request,
          input.startMin,
          tx,
        );
        if (!stillFree.includes(professionalId)) return null;

        // 3. El profesional y sus reglas, leídos dentro de la transacción.
        const professional = await bookingRepository.findProfessional(tx, professionalId);
        if (!professional) return null;

        const [customer, services] = await Promise.all([
          bookingRepository.upsertCustomer(tx, {
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            phone,
            email: input.customer.email,
          }),
          serviceRepository.findManyForBooking(input.serviceIds, tx),
        ]);

        // 4. Escribir. Si el constraint rechaza el solapamiento, la excepción
        //    sale de acá y la transacción se deshace entera.
        return bookingRepository.create(
          tx,
          buildWrite({
            input,
            customerId: customer.id,
            professionalId,
            bufferMin: professional.bufferMin,
            services,
          }),
        );
      });

      return row ? toDetail(row, true) : null;
    } catch (error) {
      // El código de turno choca con uno existente: se reintenta con otro.
      if (isUniqueViolation(error, 'code')) continue;

      // El motor de la base rechazó el solapamiento. Es la red de seguridad: si se
      // llegó acá, la verificación de disponibilidad no lo vio —por una carrera
      // muy fina, o por un turno cargado a mano en el medio—, pero el turno NO se
      // creó. Se trata como el caso normal de "se ocupó", no como un error.
      if (isBookingOverlapError(error)) return null;

      throw error;
    }
  }

  // Se agotaron los reintentos de código. Con casi 900 millones de combinaciones
  // es prácticamente imposible, así que se reporta como error del servidor en vez
  // de inventar una respuesta.
  throw new Error('No se pudo asignar un código de turno libre.');
}

// -----------------------------------------------------------------------------
// Servicio
// -----------------------------------------------------------------------------

export const bookingsService = {
  /**
   * Reserva un turno.
   *
   * El recorrido es: normalizar el teléfono, preguntar quién puede atender ese
   * horario, y después intentar el alta con cada candidato hasta que uno lo
   * consiga.
   *
   * Se prueba con más de un candidato porque, si el cliente no eligió profesional,
   * que uno se haya ocupado en el último segundo no significa que el turno sea
   * imposible: puede quedar otro. Si el cliente sí eligió, la lista tiene un solo
   * candidato y el reintento no ocurre.
   */
  async create(input: CreateBookingInput): Promise<BookingDetail> {
    const phone = normalizePhone(input.customer.phone);
    if (!phone) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'No pudimos interpretar el teléfono. Escribilo con código de área, por ejemplo 3705 194299.',
        {
          details: [
            {
              field: 'body.customer.phone',
              message: 'Ingresá un teléfono con código de área.',
            },
          ],
        },
      );
    }

    const candidates = await availabilityService.candidatesFor(
      { serviceIds: input.serviceIds, professionalId: input.professionalId, date: input.date },
      input.startMin,
    );

    // Un solo error para las dos formas de que el horario no esté: que no lo
    // pueda atender nadie, o que se haya ocupado mientras el cliente decidía.
    // Desde afuera son el mismo hecho —el horario no está— y la recuperación es
    // la misma: volver al paso de horarios y recargarlos. Distinguirlos obligaría
    // al wizard a tratar dos casos para hacer exactamente lo mismo.
    if (candidates.length === 0) throw new SlotTakenError();

    for (const professionalId of candidates) {
      const detail = await tryCreate(input, professionalId, phone);
      if (detail) return detail;
    }

    // Se probó con todos los que podían atenderlo y ninguno lo consiguió.
    throw new SlotTakenError();
  },

  /** Un turno por código. Solo devuelve el token si la consulta lo trajo. */
  async getByCode(rawCode: string, token?: string): Promise<BookingDetail> {
    const row = await findOrFail(rawCode);
    const authorized = token !== undefined && token === row.cancelToken;
    return toDetail(row, authorized);
  },

  /**
   * Cancela un turno.
   *
   * Exige el token, no solo el código: el código se dicta en voz alta y se anota
   * en un papel, así que si alcanzara para cancelar, cualquiera que lo escuche
   * podría dar de baja el turno de otra persona.
   *
   * Cancelar libera el horario: el turno pasa a CANCELLED y el constraint —que
   * solo mira PENDING y CONFIRMED— deja de tenerlo en cuenta.
   */
  async cancel(rawCode: string, token: string): Promise<BookingDetail> {
    const row = await findOrFail(rawCode);

    // Mismo mensaje que "no existe" a propósito: así, con un token equivocado, no
    // se confirma siquiera que el código corresponda a un turno real.
    if (token !== row.cancelToken) throw notFound();

    if (row.status !== BookingStatus.PENDING && row.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        409,
        ErrorCode.BOOKING_ALREADY_CANCELLED,
        row.status === BookingStatus.CANCELLED
          ? 'Ese turno ya estaba cancelado.'
          : 'Ese turno ya no se puede cancelar. Escribinos por WhatsApp y lo vemos.',
      );
    }

    const cancelled = await prisma.$transaction((tx) =>
      bookingRepository.cancel(tx, row.id, row.status, 'Cancelado por el cliente', 'CUSTOMER'),
    );

    // Se relee en vez de responder con la fila que ya se tenía, que todavía dice
    // CONFIRMED.
    const current = await findOrFail(rawCode);

    // Si `cancel` no modificó nada, alguien más tocó el turno en el medio, y hay
    // dos desenlaces posibles:
    //
    //   · Otro pedido de cancelación ganó la carrera. El turno está cancelado, que
    //     es lo que el cliente pidió: se responde igual, sin distinguir quién llegó
    //     primero.
    //   · Lo completaron desde el panel en ese mismo instante. Entonces NO se
    //     canceló, y responder 200 sería mentirle: el cliente creería que dio de
    //     baja un turno que sigue en pie.
    if (!cancelled && current.status !== BookingStatus.CANCELLED) {
      throw new AppError(
        409,
        ErrorCode.BOOKING_ALREADY_CANCELLED,
        'Ese turno ya no se puede cancelar. Escribinos por WhatsApp y lo vemos.',
      );
    }

    return toDetail(current, true);
  },
};

// -----------------------------------------------------------------------------
// Interno
// -----------------------------------------------------------------------------

function notFound(): NotFoundError {
  return new NotFoundError('No encontramos ningún turno con ese código.');
}

/** Busca por código, normalizándolo antes y fallando con el mismo mensaje siempre. */
async function findOrFail(rawCode: string): Promise<BookingRow> {
  const code = normalizeBookingCode(rawCode);
  if (!code) throw notFound();

  const row = await bookingRepository.findByCode(code);
  if (!row) throw notFound();

  return row;
}
