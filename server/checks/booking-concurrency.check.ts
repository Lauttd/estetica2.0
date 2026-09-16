// =============================================================================
// KAYA KALPA — Verificación de la garantía contra el doble turno (§20)
// =============================================================================
// El motor de disponibilidad ya está probado como función pura en
// `availability.check.ts`. Eso comprueba que los horarios que se ofrecen son los
// correctos. Lo que falta comprobar es lo otro: que si veinte personas reservan
// el mismo horario a la vez, una sola se lo lleve.
//
// Eso no se puede probar con funciones puras, porque el problema no está en el
// cálculo sino en la carrera entre calcular y escribir. Hay que provocarla de
// verdad: disparar los pedidos en paralelo y contar qué pasó.
//
// SE COMPRUEBAN LAS DOS MITADES DE LA GARANTÍA
//
//   1. Por la API, que es el camino normal: veinte `POST /api/bookings` a la vez
//      para el mismo profesional, fecha y horario. Tiene que haber exactamente un
//      201 y diecinueve 409 limpios, sin stack ni mensaje interno.
//
//   2. Por SQL directo, salteando la aplicación entera: dos `INSERT` con el mismo
//      horario. Es la comprobación de que la protección no depende de que el
//      código se acuerde de verificar. Si algún día alguien escribe por fuera de
//      la API —una carga manual, un script—, el constraint sigue ahí.
//
// Ninguna de las dos alcanza sola: la primera sola no dice nada si el código
// dejara de verificar; la segunda sola no dice nada sobre lo que ve el cliente.
//
// REQUISITOS
//
//   · El servidor tiene que estar corriendo (npm run dev)
//   · La base tiene que estar arriba (docker compose up -d)
//   · NODE_ENV no puede ser production, porque el límite de reservas por IP
//     cortaría el experimento antes de que empiece
//
//   npm run check:concurrency
// =============================================================================

import { BookingStatus } from '@prisma/client';
import { disconnectPrisma, prisma } from '../src/config/prisma';
import { env } from '../src/config/env';

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

const BASE_URL = `http://localhost:${env.PORT}/api`;

/** Cuántos pedidos simultáneos se disparan. */
const CONCURRENT = 20;

interface Attempt {
  status: number;
  body: unknown;
}

/** Los códigos que crea esta prueba, para poder borrar exactamente esos. */
const createdCodes = new Set<string>();

/**
 * Las clientas que crea esta prueba, para poder borrar exactamente esas.
 *
 * POR ID Y NO POR NOMBRE
 *
 * Esto era `deleteMany({ firstName: 'Prueba' })`, y estaba mal por dos motivos que
 * se suman. El primero: `ui-flow.mjs` —la verificación del cliente— también carga
 * clientas que se llaman "Prueba", así que esta limpieza se las llevaba puestas. El
 * segundo: fallaba. Esas clientas ajenas tienen turnos que esta prueba no conoce y
 * por lo tanto no borra, así que el `DELETE` moría con una violación de clave ajena
 * y la verificación entera se cortaba antes de llegar a la mitad de lo que mide.
 * Una verificación que se rompe por datos que no son suyos enseña a ignorarla.
 *
 * Se juntan de dos maneras porque se crean de dos maneras: las que inserta
 * directamente esta prueba se anotan al crearlas, y las que crea la API no se
 * pueden anotar —el servidor no devuelve el id de la clienta, y hace bien— así que
 * se llega a ellas por los turnos que esta prueba reservó.
 */
const createdCustomerIds = new Set<string>();

/**
 * Todas las clientas que esta prueba creó, sumando todas las limpiezas.
 *
 * `createdCustomerIds` se vacía en cada limpieza —son las que hay que borrar
 * ahora—, y esto es el acumulado: lo que la comprobación final cuenta para decir
 * que no quedó nada. Se comprueba sobre el total y no sobre la última tanda porque
 * las tandas anteriores también fueron clientas de esta prueba, y que la última
 * haya quedado limpia no dice nada de ellas.
 *
 * Que exista además es lo que impide que la comprobación final pase por no haber
 * mirado nada: contar sobre un conjunto vacío da cero sobrantes sin haber
 * comprobado absolutamente nada.
 */
const allCreatedCustomerIds = new Set<string>();

/** Los que inserta por SQL, que no pasan por la API y no se registran solos. */
const SQL_CODES = ['SQLAAA', 'SQLBBB', 'SQLCCC', 'SQLDDD', 'SQLEEE'];

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} respondió ${response.status}`);
  }
  return ((await response.json()) as { data: T }).data;
}

/** Un pedido de reserva. No lanza: devuelve el código HTTP y el cuerpo. */
async function postBooking(payload: unknown): Promise<Attempt> {
  const response = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

function bookingPayload(args: {
  serviceId: string;
  date: string;
  startMin: number;
  professionalId?: string;
  phone: string;
}): unknown {
  return {
    serviceIds: [args.serviceId],
    date: args.date,
    startMin: args.startMin,
    ...(args.professionalId ? { professionalId: args.professionalId } : {}),
    customer: {
      firstName: 'Prueba',
      lastName: `Concurrente ${args.phone.slice(-4)}`,
      phone: args.phone,
    },
  };
}

/**
 * Da formato 'YYYY-MM-DD' a una fecha, leyéndola en hora LOCAL.
 *
 * No se usa `toISOString().slice(0, 10)`: eso devuelve el día en UTC, y como
 * Argentina está tres horas atrás, cualquier hora local anterior a las 21:00 cae
 * en el día siguiente. Una prueba que corre a las 22:00 buscaría los horarios del
 * día equivocado.
 */
function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Busca el primer día con horarios, de acá a ocho semanas.
 *
 * Se empieza a 45 días para que la fecha quede lejos de la anticipación mínima y
 * de la ventana de reserva, sea cual sea su configuración. A partir de ahí se
 * avanza día por día: si el primero cae domingo —o feriado, o bloqueado— se pasa
 * al siguiente.
 */
async function findOpenDay(
  serviceId: string,
  professionalId: string,
): Promise<{ date: string; daysAhead: number; slots: Array<{ startMin: number }> } | null> {
  const target = new Date();
  target.setDate(target.getDate() + 45);

  for (let offset = 0; offset < 56; offset += 1) {
    const candidate = new Date(target);
    candidate.setDate(candidate.getDate() + offset);
    const dateOnly = toDateOnly(candidate);

    const availability = await getJson<{ slots: Array<{ startMin: number }> }>(
      `/availability?serviceIds=${serviceId}&professionalId=${professionalId}&date=${dateOnly}`,
    );

    if (availability.slots.length > 0) {
      return { date: dateOnly, daysAhead: 45 + offset, slots: availability.slots };
    }
  }

  return null;
}

/**
 * Borra lo que creó esta prueba, y nada más.
 *
 * A propósito NO se hace `deleteMany({})`: esta prueba corre contra la misma base
 * que el resto del desarrollo, y un borrado total se llevaría puestos los turnos
 * reales que alguien haya estado cargando a mano para probar. Se borra por código
 * de turno y por id de clienta, que son las dos cosas que esta prueba conoce con
 * certeza porque las generó ella. Cualquier filtro por nombre —o por cualquier
 * otro dato que otra cosa pueda compartir— borra también lo que no es suyo.
 *
 * Devuelve los ids de las clientas que borró, para que quien llama pueda
 * comprobar que efectivamente no quedó ninguna.
 */
async function cleanup(): Promise<string[]> {
  const codes = [
    ...SQL_CODES,
    ...[...createdCodes].map((code) => code.replace(/^KK-/, '')),
  ];

  // Las clientas detrás de los turnos de esta prueba. Se juntan ANTES de borrar
  // los turnos: después ya no habría forma de llegar a ellas.
  const behindBookings = await prisma.booking.findMany({
    where: { code: { in: codes } },
    select: { customerId: true },
    distinct: ['customerId'],
  });
  for (const row of behindBookings) createdCustomerIds.add(row.customerId);

  const customers = [...createdCustomerIds];

  await prisma.booking.deleteMany({ where: { code: { in: codes } } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });

  for (const id of customers) allCreatedCustomerIds.add(id);

  createdCodes.clear();
  createdCustomerIds.clear();

  return customers;
}

async function main(): Promise<void> {
  console.log('\n  Garantía contra el doble turno — §20\n');

  if (env.isProduction) {
    console.log('  Esta prueba no corre con NODE_ENV=production: el límite de');
    console.log('  reservas por IP cortaría los pedidos antes de medir nada.\n');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Preparación
  // ---------------------------------------------------------------------------
  console.log('── Preparación ──');

  let serviceId: string;
  let professionalId: string;
  let date: string;

  try {
    const services = await getJson<Array<{ id: string; bookableOnline: boolean }>>(
      '/services?perPage=100',
    );
    const service = services.find((item) => item.bookableOnline);
    if (!service) throw new Error('No hay ningún servicio reservable en línea.');
    serviceId = service.id;

    const professionals = await getJson<Array<{ id: string }>>(
      `/professionals?serviceIds=${serviceId}`,
    );
    const professional = professionals[0];
    if (!professional) throw new Error('No hay ningún profesional activo.');
    professionalId = professional.id;

    // Se busca el día en vez de fijarlo. La estética atiende de lunes a sábado,
    // así que una fecha cualquiera a 45 días puede caer domingo y no tener ningún
    // horario —que es exactamente lo que pasó la primera vez que se corrió esto—.
    // Además la agenda es configurable: si mañana cambian los días de atención,
    // esta prueba tiene que seguir encontrando un día hábil sola.
    const found = await findOpenDay(serviceId, professionalId);
    if (!found) {
      throw new Error(
        'No se encontró ningún día con horarios en las próximas 8 semanas. ' +
          '¿Están cargados los horarios de atención? (ver CONFLICTOS.md)',
      );
    }
    date = found.date;

    console.log(`  Servicio:      ${serviceId}`);
    console.log(`  Profesional:   ${professionalId}`);
    console.log(`  Fecha:         ${date} (en ${found.daysAhead} días)`);
    console.log(`  Horarios ese día: ${found.slots.length}`);
    console.log('');

    // Se empieza de cero, para que un turno de una corrida anterior no ocupe el
    // horario que se va a disputar.
    await cleanup();

    // -------------------------------------------------------------------------
    // 1. Veinte reservas simultáneas, con profesional fijo
    // -------------------------------------------------------------------------
    // Con el profesional fijado hay un único candidato posible, así que un solo
    // pedido puede ganar. Es el caso puro de doble reserva.

    const slot = found.slots[0]!.startMin;

    console.log(`── ${CONCURRENT} reservas simultáneas al mismo horario ──`);

    const attempts = await Promise.all(
      Array.from({ length: CONCURRENT }, (_unused, index) =>
        postBooking(
          bookingPayload({
            serviceId,
            professionalId,
            date,
            startMin: slot,
            // Un teléfono distinto por intento: si no, todos serían la misma
            // clienta y el upsert las mezclaría en una sola ficha.
            //
            // Diez dígitos exactos (área 370 + siete), que es lo que exige el
            // normalizador. Con once el pedido se rechaza por teléfono inválido y
            // la prueba mide lo que no quiere medir.
            phone: `370500${String(index).padStart(4, '0')}`,
          }),
        ),
      ),
    );

    const created = attempts.filter((attempt) => attempt.status === 201);
    const rejected = attempts.filter((attempt) => attempt.status === 409);
    const other = attempts.filter(
      (attempt) => attempt.status !== 201 && attempt.status !== 409,
    );

    for (const attempt of created) {
      const code = (attempt.body as { data?: { code?: string } }).data?.code;
      if (code) createdCodes.add(code);
    }

    check(
      `Se creó exactamente un turno (${created.length} de ${CONCURRENT})`,
      created.length === 1,
      `Estados: ${attempts.map((a) => a.status).join(', ')}`,
    );
    check(
      `Los otros ${CONCURRENT - 1} fueron rechazados con 409`,
      rejected.length === CONCURRENT - 1,
      `Estados inesperados: ${other.map((a) => `${a.status} ${JSON.stringify(a.body)}`).join(' | ')}`,
    );

    // §38: el rechazo tiene que ser un error de negocio, no un volcado técnico.
    const everyRejectionIsClean = rejected.every((attempt) => {
      const error = (attempt.body as { error?: Record<string, unknown> }).error;
      if (!error) return false;
      const serialized = JSON.stringify(attempt.body);
      return (
        typeof error.code === 'string' &&
        typeof error.message === 'string' &&
        !serialized.includes('stack') &&
        !serialized.includes('prisma') &&
        !serialized.includes('constraint') &&
        !serialized.includes('bookings_no_overlap') &&
        !serialized.includes('at Object.') &&
        !serialized.includes('node_modules')
      );
    });
    check('Ningún rechazo filtra el stack ni el nombre del constraint', everyRejectionIsClean);

    const codes = new Set(
      rejected.map((attempt) => (attempt.body as { error?: { code?: string } }).error?.code),
    );
    check(
      'Todos los rechazos hablan de un horario ocupado, no de un error interno',
      codes.size > 0 && [...codes].every((code) => code === 'SLOT_TAKEN'),
      `Códigos vistos: ${[...codes].join(', ')}`,
    );

    // La prueba que cierra el círculo: la base tiene que tener un turno, no veinte.
    const stored = await prisma.booking.count({
      where: { professionalId, date: new Date(`${date}T00:00:00.000Z`) },
    });
    check(`En la base quedó un solo turno (${stored})`, stored === 1);

    // -------------------------------------------------------------------------
    // 2. Sin profesional elegido: uno por profesional, y no más
    // -------------------------------------------------------------------------
    // Sin profesional fijado, la API le asigna el primero que pueda. Con dos
    // profesionales disponibles, dos clientas simultáneas pueden quedarse las dos
    // con el horario —cada una con quien puede atenderla—, y eso está bien. Lo
    // que no puede pasar es que haya más turnos que profesionales.

    console.log('\n── Sin elegir profesional: un turno por profesional ──');

    await cleanup();

    const available = await getJson<Array<{ id: string }>>(
      `/professionals?serviceIds=${serviceId}`,
    );
    const expected = Math.min(available.length, CONCURRENT);

    const attemptsAny = await Promise.all(
      Array.from({ length: CONCURRENT }, (_unused, index) =>
        postBooking(
          bookingPayload({
            serviceId,
            date,
            startMin: slot,
            phone: `370600${String(index).padStart(4, '0')}`,
          }),
        ),
      ),
    );

    const createdAny = attemptsAny.filter((attempt) => attempt.status === 201);
    for (const attempt of createdAny) {
      const code = (attempt.body as { data?: { code?: string } }).data?.code;
      if (code) createdCodes.add(code);
    }

    check(
      `Se crearon ${expected} turnos, uno por profesional (${createdAny.length})`,
      createdAny.length === expected,
      `Profesionales disponibles: ${available.length}, creados: ${createdAny.length}`,
    );

    // El recuento se limita a los turnos que acaba de crear esta prueba. Sin el
    // `where` contaría la tabla entera, y entonces esto fallaría por cualquier
    // turno ajeno —uno cargado a mano para probar, o la resaca de un script
    // suelto— en vez de por un doble turno de verdad. Una comprobación que falla
    // por lo que no mira enseña a ignorarla, y el día que avise de algo real ya
    // nadie la va a leer.
    //
    // El `length > 0` no es adorno: sin él, una lista vacía daría `every` sobre
    // nada, que es `true`, y la prueba pasaría por no haber mirado nada.
    const justCreated = [...createdCodes].map((code) => code.replace(/^KK-/, ''));
    const assigned = await prisma.booking.groupBy({
      by: ['professionalId'],
      where: { code: { in: justCreated } },
      _count: { _all: true },
    });
    check(
      'Ningún profesional quedó con dos turnos en el mismo horario',
      assigned.length > 0 && assigned.every((row) => row._count._all === 1),
      assigned.map((row) => `${row.professionalId}: ${row._count._all}`).join(', '),
    );

    // -------------------------------------------------------------------------
    // 3. La red de seguridad, salteando la aplicación
    // -------------------------------------------------------------------------
    // Hasta acá se comprobó que la API se comporta. Esto comprueba otra cosa: que
    // aunque la API no estuviera, la base tampoco aceptaría el solapamiento. Es
    // la mitad que protege contra una carga hecha a mano o un script suelto.

    console.log('\n── El constraint, salteando la API ──');

    await cleanup();

    const customer = await prisma.customer.create({
      data: { firstName: 'Prueba', lastName: 'SQL', phone: '3705000099' },
    });
    // Anotada para poder borrarla: es una clienta que no tiene turnos que la
    // delaten —los `INSERT` de abajo se borran por código, no por clienta— así que
    // si no se anota acá, `cleanup()` no tendría forma de llegar a ella.
    createdCustomerIds.add(customer.id);

    const base = {
      customerId: customer.id,
      professionalId,
      date: new Date(`${date}T00:00:00.000Z`),
      status: BookingStatus.PENDING,
      totalPriceCents: 0,
      totalDurationMin: 60,
    };

    await prisma.booking.create({
      data: {
        ...base,
        code: 'SQLAAA',
        startAt: new Date(`${date}T12:00:00.000Z`),
        endAt: new Date(`${date}T13:00:00.000Z`),
        occupiedUntil: new Date(`${date}T13:00:00.000Z`),
      },
    });
    check('El primer turno insertado por SQL entró', true);

    // Solapado a propósito: empieza media hora después, dentro del anterior.
    let overlapRejected = false;
    let overlapMessage = '';
    try {
      await prisma.booking.create({
        data: {
          ...base,
          code: 'SQLBBB',
          startAt: new Date(`${date}T12:30:00.000Z`),
          endAt: new Date(`${date}T13:30:00.000Z`),
          occupiedUntil: new Date(`${date}T13:30:00.000Z`),
        },
      });
    } catch (error) {
      overlapRejected = true;
      overlapMessage = error instanceof Error ? error.message : String(error);
    }

    check(
      'La base rechaza el solapamiento aunque nadie haya verificado antes',
      overlapRejected,
      'El segundo INSERT entró: el constraint no está haciendo su trabajo.',
    );
    check(
      'Y el rechazo viene del constraint de solapamiento',
      overlapMessage.includes('bookings_no_overlap') ||
        overlapMessage.includes('23P01') ||
        overlapMessage.includes('exclusion constraint'),
      overlapMessage.slice(0, 300),
    );

    // Un turno cancelado NO tiene que bloquear: es lo que hace que cancelar
    // devuelva el horario al mercado.
    await prisma.booking.update({
      where: { code: 'SQLAAA' },
      data: { status: BookingStatus.CANCELLED },
    });

    let afterCancelAccepted = false;
    try {
      await prisma.booking.create({
        data: {
          ...base,
          code: 'SQLCCC',
          startAt: new Date(`${date}T12:30:00.000Z`),
          endAt: new Date(`${date}T13:30:00.000Z`),
          occupiedUntil: new Date(`${date}T13:30:00.000Z`),
        },
      });
      afterCancelAccepted = true;
    } catch {
      afterCancelAccepted = false;
    }

    check(
      'Un turno cancelado libera el horario y el solapamiento se acepta',
      afterCancelAccepted,
      'El constraint sigue bloqueando un turno cancelado.',
    );

    // Un turno del mismo horario pero de OTRO profesional tiene que entrar: el
    // constraint es por profesional, no global.
    //
    // Las clientas se crean DESPUÉS del `cleanup`, no antes: la limpieza se lleva
    // las clientas que esta prueba anotó, así que una creada antes quedaría
    // borrada y los `INSERT` de acá abajo morirían por clave foránea en vez de por
    // lo que se quiere medir.
    await cleanup();

    const secondProfessional = await prisma.professional.findFirst({
      where: { active: true, id: { not: professionalId } },
      select: { id: true },
    });

    if (secondProfessional) {
      const [customerA, customerB] = await Promise.all([
        prisma.customer.create({
          data: { firstName: 'Prueba', lastName: 'SQL', phone: '3705000099' },
        }),
        prisma.customer.create({
          data: { firstName: 'Prueba', lastName: 'SQL2', phone: '3705000098' },
        }),
      ]);
      createdCustomerIds.add(customerA.id);
      createdCustomerIds.add(customerB.id);

      const window = {
        date: new Date(`${date}T00:00:00.000Z`),
        startAt: new Date(`${date}T12:00:00.000Z`),
        endAt: new Date(`${date}T13:00:00.000Z`),
        occupiedUntil: new Date(`${date}T13:00:00.000Z`),
        status: BookingStatus.PENDING,
        totalPriceCents: 0,
        totalDurationMin: 60,
      };

      await prisma.booking.create({
        data: { ...window, customerId: customerA.id, professionalId, code: 'SQLDDD' },
      });

      let otherAccepted = false;
      try {
        await prisma.booking.create({
          data: {
            ...window,
            customerId: customerB.id,
            professionalId: secondProfessional.id,
            code: 'SQLEEE',
          },
        });
        otherAccepted = true;
      } catch {
        otherAccepted = false;
      }

      check(
        'Dos profesionales distintos pueden tener el mismo horario',
        otherAccepted,
        'El constraint está bloqueando de más: es por profesional, no global.',
      );
    }

    // -------------------------------------------------------------------------
    // Limpieza
    // -------------------------------------------------------------------------
    await cleanup();

    const leftovers = await prisma.booking.count({ where: { code: { in: SQL_CODES } } });

    /**
     * Las clientas se cuentan por id y no por nombre.
     *
     * Por nombre se contaban las de `ui-flow.mjs` —que también se llama "Prueba"
     * su clienta de prueba—, y entonces esta comprobación fallaba por datos ajenos
     * que esta prueba ni creó ni tiene por qué limpiar. Por id se cuenta
     * exactamente lo que esta corrida creó, que es lo único que puede decir si la
     * limpieza funcionó.
     */
    const testCustomers = await prisma.customer.count({
      where: { id: { in: [...allCreatedCustomerIds] } },
    });
    check(
      `No quedaron datos de la prueba (${leftovers} turnos, ${testCustomers} clientas)`,
      leftovers === 0 && testCustomers === 0 && allCreatedCustomerIds.size > 0,
      allCreatedCustomerIds.size === 0
        ? 'Esta corrida no creó ninguna clienta: la comprobación no miró nada.'
        : `Se crearon y borraron ${allCreatedCustomerIds.size} clientas.`,
    );
  } catch (error) {
    fail += 1;
    console.log(`\n  ✗  La prueba no pudo completarse:`);
    console.log(`     ${error instanceof Error ? error.message : String(error)}`);
    console.log('     ¿Está el servidor corriendo en ' + BASE_URL + '?');
    try {
      await cleanup();
    } catch {
      // Si la limpieza también falla, el error original es el que importa.
    }
  }

  console.log(`\n  ${pass} correctas, ${fail} fallidas\n`);
  await disconnectPrisma();
  process.exit(fail === 0 ? 0 : 1);
}

void main();
