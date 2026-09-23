// =============================================================================
// KAYA KALPA — Arranque del servidor
// =============================================================================
// Levanta la app y se ocupa de cerrarla bien.
//
// El apagado ordenado no es un adorno: si el proceso muere de golpe mientras
// escribe un turno, la transacción queda a medias. Node cierra el proceso al
// recibir SIGTERM (lo que hace Docker al reiniciar), así que hay que interceptarlo
// y darle tiempo a terminar lo que está en curso.
// =============================================================================

import type { Server } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma, isDatabaseReachable } from './config/prisma';
import { startBookingReminderWorker } from './modules/bookings/booking-mail.service';

/** Cuánto se espera a que terminen las peticiones en curso antes de cortar todo. */
const SHUTDOWN_GRACE_MS = 10_000;

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  const reminderWorker = startBookingReminderWorker();
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      timezone: env.timezone,
      corsOrigins: env.corsOrigins,
    },
    `KAYA KALPA API escuchando en http://localhost:${env.PORT}`,
  );

  // Se avisa pero no se aborta el arranque: el endpoint /api/health ya reporta
  // 503 mientras la base no esté, y así el hosting muestra el problema real en
  // vez de un contenedor que reinicia en bucle sin decir por qué.
  void isDatabaseReachable().then((reachable) => {
    if (!reachable) {
      logger.error(
        'La base de datos no responde. Revisá que Postgres esté levantado ' +
          '(npm run db:up) y que DATABASE_URL sea correcta.',
      );
    }
  });

  server.once('close', () => {
    if (reminderWorker !== null) clearInterval(reminderWorker);
  });
});

// -----------------------------------------------------------------------------
// Apagado ordenado
// -----------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  // Un segundo Ctrl+C no debería disparar un segundo apagado en paralelo.
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Cerrando el servidor…');

  // Red de seguridad: si alguna conexión se queda colgada, no se espera para
  // siempre. `unref` permite que el proceso termine antes si todo salió bien.
  const forceExit = setTimeout(() => {
    logger.error('El cierre tardó demasiado: se fuerza la salida.');
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  forceExit.unref();

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'Error al cerrar el servidor HTTP');
    }

    try {
      await disconnectPrisma();
    } catch (disconnectError) {
      logger.error({ err: disconnectError }, 'Error al cerrar la conexión a la base');
    }

    clearTimeout(forceExit);
    logger.info('Servidor cerrado.');
    process.exit(error ? 1 : 0);
  });

  // Las conexiones keep-alive no se cierran solas con `close()` y son la causa
  // habitual de que un apagado se quede esperando. Las inactivas se cortan ya;
  // las que están procesando algo terminan solas.
  server.closeIdleConnections();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// -----------------------------------------------------------------------------
// Fallos no controlados
// -----------------------------------------------------------------------------

/**
 * Una promesa rechazada sin manejar deja el proceso en un estado del que no se
 * sabe nada. Se registra y se cierra: es preferible que el hosting levante un
 * proceso limpio a seguir atendiendo con estado inconsistente.
 */
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Promesa rechazada sin manejar');
  void shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Excepción no capturada');
  void shutdown('uncaughtException');
});
