// =============================================================================
// KAYA KALPA — Logger
// =============================================================================
// Un solo logger para todo el backend. En producción emite JSON (para que lo
// consuma el hosting); en desarrollo, texto legible.
//
// `redact` no es decorativo: sin esa lista, el header Authorization y el cuerpo
// de un login terminan escritos en disco en texto plano.
// =============================================================================

import pino from 'pino';
import { env } from './env';

const REDACTED = '[redactado]';

/**
 * Rutas que nunca deben llegar al log. Se redactan en cualquier nivel, no solo
 * en las que parecen obvias: `req.body` aparece completo cuando se loguea una
 * petición fallida.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.newPassword',
  'req.body.currentPassword',
  'req.body.confirmPassword',
  'password',
  'passwordHash',
  'token',
  'cancelToken',
  'accessToken',
  'refreshToken',
  'tokenHash',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACT_PATHS, censor: REDACTED },

  // Solo en desarrollo: `pino-pretty` es una devDependency y en producción no
  // está instalado, así que pedirlo ahí haría fallar el arranque.
  transport: env.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
        },
      }
    : undefined,

  // Nombres cortos: los logs de una API se leen de a miles de líneas.
  base: env.isProduction ? { service: 'kaya-kalpa-api' } : undefined,
});

export type Logger = typeof logger;
