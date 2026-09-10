// =============================================================================
// KAYA KALPA — Acceso a datos de turnos
// =============================================================================
// Acá está la escritura del turno, y con ella la garantía de §20: que sea
// imposible que dos personas se queden con el mismo horario.
// =============================================================================

import { BookingStatus, type Prisma } from '@prisma/client';
import { prisma, type Db } from '../../config/prisma';
import { ACTIVE_BOOKING_STATUSES } from '../shared/booking-status';
import { generateBookingCode } from './booking-code';
import type { ListBookingsAdminQuery } from './bookings.types';

/** Lo que hace falta para escribir un turno, ya resuelto y verificado. */
export interface BookingWrite {
  professionalId: string;
  customerId: string;
  date: Date;
  startAt: Date;
  endAt: Date;
  occupiedUntil: Date;
  totalPriceCents: number;
  hasPriceOnRequest: boolean;
  totalDurationMin: number;
  notes: string | null;
  services: Array<{
    serviceId: string;
    nameSnapshot: string;
    priceCentsSnapshot: number | null;
    durationMinSnapshot: number;
    sortOrder: number;
  }>;
}

/** Cuántas veces se reintenta si el código generado choca con uno existente. */
const CODE_ATTEMPTS = 5;

export const bookingRepository = {
  /**
   * Toma el bloqueo de la agenda de un profesional para un día.
   *
   * Es el corazón de la garantía contra el doble turno, y conviene entender por
   * qué hacen falta DOS protecciones distintas:
   *
   *   · Este bloqueo (un `pg_advisory_xact_lock`) hace que las reservas del mismo
   *     profesional y el mismo día se atiendan de a una. Sin él, dos pedidos
   *     simultáneos podrían verificar los dos que el horario está libre, y decidir
   *     los dos que sí. Es lo que evita el error visible.
   *
   *   · El constraint `bookings_no_overlap` (ver la migración
   *     `booking_overlap_guard`) rechaza el solapamiento en el motor de la base,
   *     aunque alguien escriba por fuera de la API. Es la red que no se puede
   *     saltear.
   *
   * El bloqueo se libera solo al terminar la transacción, incluso si falla: es
   * `xact`, no de sesión. Y es por profesional y día, así que dos reservas para
   * profesionales distintos no se esperan entre sí.
   */
  async lockAgenda(
    tx: Db,
    professionalId: string,
    dateOnly: string,
  ): Promise<void> {
    // El segundo argumento tiene que ser un entero de 32 bits: la fecha como
    // YYYYMMDD (20260911) entra sin problema y es legible si hay que depurar.
    const dayKey = Number(dateOnly.replace(/-/g, ''));

    // Los dos `::int` NO son decorativos. `pg_advisory_xact_lock` tiene dos
    // formas —`(bigint)` y `(int, int)`— y no hay una `(integer, bigint)`:
    // `hashtext` ya devuelve `integer`, pero el número que llega desde Node se
    // parametriza como `bigint` y Postgres no encuentra la función. Sin el cast
    // falla con "function pg_advisory_xact_lock(integer, bigint) does not exist".
    //
    // Y va con `$executeRaw`, no `$queryRaw`: la función devuelve `void`, que
    // Prisma no puede deserializar. Como acá no se lee ningún valor —importa el
    // efecto de tomar el lock, no lo que devuelve—, la variante que no
    // deserializa columnas es la que corresponde.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${professionalId})::int, ${dayKey}::int)
    `;
  },

  /**
   * Da de alta el turno: el cliente, el turno, sus servicios y la entrada del
   * historial, todo junto.
   *
   * Tiene que correr dentro de una transacción. Si algo falla a mitad de camino
   * —por ejemplo, el constraint rechaza el solapamiento— no puede quedar un
   * cliente creado sin su turno.
   */
  async create(tx: Db, write: BookingWrite) {
    return tx.booking.create({
      data: {
        code: await nextAvailableCode(tx),
        customerId: write.customerId,
        professionalId: write.professionalId,
        date: write.date,
        startAt: write.startAt,
        endAt: write.endAt,
        occupiedUntil: write.occupiedUntil,
        status: BookingStatus.PENDING,
        totalPriceCents: write.totalPriceCents,
        hasPriceOnRequest: write.hasPriceOnRequest,
        totalDurationMin: write.totalDurationMin,
        notes: write.notes,
        services: { create: write.services },
        history: {
          create: {
            toStatus: BookingStatus.PENDING,
            actorType: 'CUSTOMER',
            reason: 'Turno reservado online',
          },
        },
      },
      select: BOOKING_SELECT,
    });
  },

  /** Un turno por código, con todo lo que se le muestra al cliente. */
  async findByCode(code: string, db: Db = prisma) {
    return db.booking.findUnique({
      where: { code },
      select: BOOKING_SELECT,
    });
  },

  /**
   * Cancela un turno.
   *
   * El `where` incluye el estado activo, así que si dos pedidos de cancelación
   * llegan juntos uno solo modifica la fila: el otro no encuentra nada que
   * actualizar y responde "ya estaba cancelado" en vez de pisar el historial.
   */
  async cancel(
    tx: Db,
    id: string,
    fromStatus: BookingStatus,
    reason: string,
    actorType: string,
  ) {
    const updated = await tx.booking.updateMany({
      where: { id, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: actorType,
      },
    });

    if (updated.count === 0) return false;

    await tx.bookingStatusLog.create({
      data: {
        bookingId: id,
        fromStatus,
        toStatus: BookingStatus.CANCELLED,
        actorType,
        reason,
      },
    });

    return true;
  },

  /**
   * Busca al cliente por teléfono o lo crea.
   *
   * El teléfono es único y ya viene normalizado, así que la misma persona que
   * reserva dos veces no genera dos fichas. Al actualizar solo se pisan el nombre
   * y el correo: las notas internas las carga la estética y no se tocan.
   */
  async upsertCustomer(
    tx: Db,
    data: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string | undefined;
    },
  ) {
    return tx.customer.upsert({
      where: { phone: data.phone },
      create: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email ?? null,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
      },
      select: { id: true },
    });
  },

  /** El profesional con lo que hace falta para calcular el fin del turno. */
  async findProfessional(tx: Db, id: string) {
    return tx.professional.findFirst({
      where: { id, active: true },
      select: { id: true, name: true, bufferMin: true },
    });
  },

  /**
   * Cuántos turnos vigentes le quedan por delante a un profesional.
   *
   * Lo usa el panel antes de dejar desactivar a alguien: los turnos ya tomados no
   * se cancelan solos, así que si se lo apaga sin mirar, la estética se entera el
   * día que el cliente llega y no hay quien lo atienda.
   *
   * Se compara por `date` —el día del salón— y no por `startAt`: un turno de hoy a
   * las 20:00 sigue siendo futuro a las 15:00, y comparar contra el instante
   * actual exigiría aritmética de zonas horarias para el mismo resultado.
   */
  async countUpcoming(professionalId: string, today: Date): Promise<number> {
    return prisma.booking.count({
      where: {
        professionalId,
        date: { gte: today },
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    });
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  /**
   * Turnos para la agenda del panel.
   *
   * Trae al cliente y su teléfono, que es lo que la estética necesita para
   * trabajar: la agenda del día se usa llamando o escribiendo, no solo mirando.
   * El `cancelToken` NO se incluye —es la llave del cliente para cancelar sin
   * cuenta, y el panel cancela por la ruta de administración—.
   */
  async listForAdmin(query: ListBookingsAdminQuery) {
    const where: Prisma.BookingWhereInput = {};

    if (query.date) where.date = query.date;
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      };
    }
    if (query.status) where.status = query.status;
    if (query.professionalId) where.professionalId = query.professionalId;

    const [items, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        select: ADMIN_BOOKING_SELECT,
        // Del más próximo al más lejano, y a igual día por hora: es el orden en
        // que se atiende la agenda.
        orderBy: [{ date: 'asc' }, { startAt: 'asc' }],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.booking.count({ where }),
    ]);

    return { items, total };
  },

  async findByIdForAdmin(id: string) {
    return prisma.booking.findUnique({ where: { id }, select: ADMIN_BOOKING_SELECT });
  },

  /**
   * Cambia el estado de un turno y deja la marca en el historial.
   *
   * El `where` incluye el estado del que se viene, igual que en `cancel`: si dos
   * personas del salón tocan el mismo turno a la vez —una lo confirma mientras la
   * otra lo cancela—, solo la primera modifica la fila. Sin esa guarda, la segunda
   * pisaría el cambio de la primera y el historial quedaría contando una historia
   * que no pasó.
   *
   * Las dos escrituras van en la misma transacción: un cambio de estado sin su
   * entrada en el historial es justamente el dato que después no se puede
   * reconstruir.
   */
  async changeStatus(
    tx: Db,
    id: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    meta: { reason: string; actorType: string; actorId?: string },
  ): Promise<boolean> {
    const updated = await tx.booking.updateMany({
      where: { id, status: fromStatus },
      data: {
        status: toStatus,
        // Al cancelar se guarda quién y cuándo. Al salir de cancelado no se
        // limpian: `cancelledAt` cuenta lo que pasó, y borrarlo reescribiría el
        // historial en vez de agregarle un capítulo.
        ...(toStatus === BookingStatus.CANCELLED
          ? { cancelledAt: new Date(), cancelledBy: meta.actorType }
          : {}),
      },
    });

    if (updated.count === 0) return false;

    await tx.bookingStatusLog.create({
      data: {
        bookingId: id,
        fromStatus,
        toStatus,
        reason: meta.reason,
        actorType: meta.actorType,
        actorId: meta.actorId ?? null,
      },
    });

    return true;
  },
};

// -----------------------------------------------------------------------------
// Interno
// -----------------------------------------------------------------------------

const BOOKING_SELECT = {
  id: true,
  code: true,
  status: true,
  date: true,
  startAt: true,
  endAt: true,
  totalDurationMin: true,
  totalPriceCents: true,
  hasPriceOnRequest: true,
  notes: true,
  cancelToken: true,
  cancelledAt: true,
  professional: { select: { id: true, name: true } },
  services: {
    select: {
      serviceId: true,
      nameSnapshot: true,
      priceCentsSnapshot: true,
      durationMinSnapshot: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

/**
 * Lo que ve el panel de un turno.
 *
 * Se diferencia de `BOOKING_SELECT` en dos cosas deliberadas: trae al cliente —al
 * panel le hace falta el nombre y el teléfono para trabajar— y NO trae el
 * `cancelToken`, que es la llave del cliente para cancelar sin cuenta.
 */
const ADMIN_BOOKING_SELECT = {
  id: true,
  code: true,
  status: true,
  date: true,
  startAt: true,
  endAt: true,
  occupiedUntil: true,
  totalDurationMin: true,
  totalPriceCents: true,
  hasPriceOnRequest: true,
  notes: true,
  cancelledAt: true,
  cancelledBy: true,
  createdAt: true,
  customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
  professional: { select: { id: true, name: true, color: true } },
  services: {
    select: {
      serviceId: true,
      nameSnapshot: true,
      priceCentsSnapshot: true,
      durationMinSnapshot: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

export type AdminBookingRow = Prisma.BookingGetPayload<{
  select: typeof ADMIN_BOOKING_SELECT;
}>;

/**
 * Un código que no esté usado.
 *
 * La probabilidad de chocar es ínfima —hay casi 900 millones de combinaciones—
 * pero no es cero, y el costo de que pase sin este control es un 500 en la cara
 * del cliente. Se comprueba contra la base y, si igual falla el índice único,
 * quien llama reintenta.
 */
async function nextAvailableCode(tx: Db): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = generateBookingCode();
    const existing = await tx.booking.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  // Con 900 millones de combinaciones, llegar acá significa que algo está muy mal
  // —o que alguien cargó turnos de prueba en masa—. Mejor fallar que arriesgarse a
  // devolver un código repetido.
  throw new Error('No se pudo generar un código de turno libre.');
}
