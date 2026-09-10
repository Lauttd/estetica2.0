// =============================================================================
// KAYA KALPA — Cliente de Prisma
// =============================================================================
// Una sola instancia por proceso. En desarrollo `tsx watch` recarga el módulo
// en cada guardado y, sin el singleton colgado de `globalThis`, cada recarga
// abriría un pool de conexiones nuevo hasta agotar las de Postgres.
//
// ATENCIÓN: este proyecto tiene objetos creados a mano en las migraciones (el
// constraint EXCLUDE que impide el doble turno, más dos índices parciales).
// `prisma db push` compara contra la base viva, no los conoce, y los borraría.
// El flujo correcto es `migrate dev --create-only` -> revisar -> `migrate dev`.
// =============================================================================

import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
  });

  if (env.isDevelopment) {
    // En desarrollo se loguean solo las consultas lentas: loguear todas hace
    // ilegible la consola con el tráfico normal del panel.
    client.$on('query', (event) => {
      if (event.duration >= 200) {
        logger.warn(
          { durationMs: event.duration, query: event.query },
          'Consulta lenta',
        );
      }
    });
  }

  client.$on('warn', (event) => {
    logger.warn({ prisma: event.message }, 'Aviso de Prisma');
  });

  client.$on('error', (event) => {
    logger.error({ prisma: event.message }, 'Error de Prisma');
  });

  return client;
}

/**
 * En desarrollo el módulo se recarga en cada guardado; se reutiliza la misma
 * conexión. En producción se crea una sola vez de todos modos.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/** Cierra el pool. Se llama desde el apagado ordenado del servidor. */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Cualquiera de los dos clientes con los que se puede consultar: el normal o el
 * de una transacción abierta.
 *
 * Existe para que las funciones de consulta puedan recibir la transacción y
 * participar de ella. Es lo que permite que la verificación de disponibilidad y
 * el alta del turno ocurran en la misma transacción, que es la única forma de que
 * la verificación siga siendo cierta en el momento de insertar.
 */
export type Db = PrismaClient | Prisma.TransactionClient;

/** ¿El error es un choque contra un índice único de Prisma? */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  if (!field) return true;

  const target = (error.meta as { target?: string[] | string } | undefined)?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === 'string' && target.includes(field);
}

/**
 * ¿La base responde? Lo usa `/api/health`. Un `SELECT 1` (y no una consulta al
 * catálogo) para que mida la conexión y nada más.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ err: error }, 'La base de datos no responde');
    return false;
  }
}

/**
 * ¿El error es una violación del constraint que impide el doble turno?
 *
 * Hay que reconocerlo por varias vías porque el constraint se creó a mano en una
 * migración y Prisma no lo tiene en su schema: según cómo lo devuelva el motor,
 * llega como error crudo o como error desconocido, y en ningún caso con un
 * código `P2002` de los que Prisma sí sabe traducir.
 */
export function isBookingOverlapError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const dbCode = (error.meta as { code?: string } | undefined)?.code;
    if (dbCode === '23P01') return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('bookings_no_overlap') ||
    message.includes('23P01') ||
    message.includes('exclusion constraint')
  );
}
