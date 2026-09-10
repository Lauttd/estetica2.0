// =============================================================================
// KAYA KALPA — Rutas del catálogo de servicios
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validate';
import { servicesController } from './services.controller';
import {
  listServicesQuerySchema,
  serviceSlugParamSchema,
} from './services.validation';

export const servicesRouter = Router();

servicesRouter.get(
  '/',
  validate({ query: listServicesQuerySchema }),
  asyncHandler(servicesController.list),
);

// Va después de `/` y no colisiona: Express distingue por cantidad de segmentos.
servicesRouter.get(
  '/:slug',
  validate({ params: serviceSlugParamSchema }),
  asyncHandler(servicesController.detail),
);
