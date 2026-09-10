// =============================================================================
// KAYA KALPA — Rutas públicas de contacto
// =============================================================================
// Una sola ruta, y es de escritura: es el segundo endpoint público que crea
// filas. Por eso lleva `bookingLimiter` y no el límite general — el margen es
// amplio para una persona escribiendo (20 por hora), pero corta una ráfaga
// automatizada que llene la bandeja del panel.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { bookingLimiter } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import { contactController } from './contact.controller';
import { createContactMessageSchema } from './contact.validation';

export const contactRouter = Router();

contactRouter.post(
  '/',
  bookingLimiter,
  validate({ body: createContactMessageSchema }),
  asyncHandler(contactController.create),
);
