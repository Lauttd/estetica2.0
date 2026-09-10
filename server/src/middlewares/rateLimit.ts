// =============================================================================
// KAYA KALPA — Límites de uso
// =============================================================================
// Tres limitadores con criterios distintos, porque protegen cosas distintas:
//
//   · apiLimiter     — techo general, contra scraping del catálogo.
//   · authLimiter    — fuerza bruta contra el login del panel.
//   · bookingLimiter — evita que alguien llene la agenda con reservas falsas.
//
// Todos responden con el mismo formato de error que el resto de la API, vía el
// manejador central. Si no, el cliente recibiría el texto por defecto de la
// librería ("Too many requests, please try again later") y tendría que
// distinguir dos formatos distintos.
//
// IMPORTANTE: detrás de un proxy inverso hay que poner TRUST_PROXY=true en el
// .env. Si no, todos los pedidos parecen venir de la IP del proxy y el límite se
// agota entre todos los visitantes a la vez.
// =============================================================================

import rateLimit, { type Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { TooManyRequestsError } from '../utils/errors';
import { env } from '../config/env';

/** Respuesta común: se delega al manejador central para no duplicar el formato. */
const handler: Options['handler'] = (_req, _res, next) => {
  next(new TooManyRequestsError());
};

function createLimiter(options: Partial<Options>): RequestHandler {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
    // En desarrollo el límite estorba más de lo que protege: al recargar la
    // página varias veces seguidas se llega al tope y se pierde tiempo
    // averiguando por qué la API dejó de responder.
    skip: () => env.isDevelopment,
    ...options,
  });
}

/** Techo general de la API pública. */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

/**
 * Login y refresco de token.
 *
 * `skipSuccessfulRequests` es lo que lo hace útil: un login correcto no consume
 * cupo, así que el límite se agota solo con intentos fallidos. Sin eso, un
 * panel con varias personas trabajando se bloquearía a sí mismo en un día
 * normal de uso.
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

/**
 * Reserva de turnos y envío del formulario de contacto.
 *
 * El margen es amplio a propósito: una persona reservando dos o tres turnos
 * seguidos, o corrigiendo el formulario, no debería toparse con el límite.
 */
export const bookingLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
});

/** Consultas de disponibilidad: son de solo lectura pero muy repetidas. */
export const availabilityLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
});
