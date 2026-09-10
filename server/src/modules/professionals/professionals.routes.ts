// =============================================================================
// KAYA KALPA — Rutas del módulo de profesionales
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validate';
import { professionalsController } from './professionals.controller';
import { listProfessionalsQuerySchema } from './professionals.validation';

export const professionalsRouter = Router();

professionalsRouter.get(
  '/',
  validate({ query: listProfessionalsQuerySchema }),
  asyncHandler(professionalsController.list),
);
