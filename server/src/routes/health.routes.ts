// =============================================================================
// KAYA KALPA — Estado del servicio
// =============================================================================
// Lo consultan el hosting y docker-compose para saber si el proceso está sano.
// Comprueba la base de verdad (un `SELECT 1`): un servidor que responde pero no
// puede leer la base no está sano, y respondiendo 200 retrasaría el diagnóstico.
// =============================================================================

import { Router } from 'express';
import { env } from '../config/env';
import { isDatabaseReachable } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const databaseUp = await isDatabaseReachable();

    if (!databaseUp) {
      // 503 y no 500: no es un bug, es un servicio que todavía no puede atender.
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'El servicio no está disponible en este momento.',
        },
      });
      return;
    }

    res.status(200).json({
      data: {
        status: 'ok',
        database: 'up',
        environment: env.NODE_ENV,
        version: process.env.APP_VERSION ?? 'dev',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  }),
);
