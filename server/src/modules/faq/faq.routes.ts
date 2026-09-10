// =============================================================================
// KAYA KALPA — Rutas del módulo de preguntas frecuentes
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';
import { faqService } from './faq.service';

export const faqRouter = Router();

faqRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await faqService.list());
  }),
);
