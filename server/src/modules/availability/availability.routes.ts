// =============================================================================
// KAYA KALPA — Rutas de disponibilidad
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { availabilityLimiter } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import { availabilityController } from './availability.controller';
import { availabilityQuerySchema } from './availability.validation';

export const availabilityRouter = Router();

// Es la ruta pública que más se repite: el asistente de turnos la consulta cada
// vez que alguien cambia de día o de profesional, así que un visitante curioso
// genera muchas más peticiones acá que en el resto del catálogo. El techo general
// de la API (300 cada 15 minutos) es el mismo para todo; este es más ajustado
// porque el patrón de uso de esta ruta en particular lo admite.
availabilityRouter.get(
  '/',
  availabilityLimiter,
  validate({ query: availabilityQuerySchema }),
  asyncHandler(availabilityController.get),
);
