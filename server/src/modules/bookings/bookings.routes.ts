// =============================================================================
// KAYA KALPA — Rutas de turnos
// =============================================================================
// Públicas: el cliente reserva sin crear cuenta. Eso es una decisión de producto,
// no un descuido —pedir registro para sacar un turno pierde clientas— y es la
// razón por la que la cancelación se protege con un token y no con una sesión.
//
// El límite propio va en las dos rutas que ESCRIBEN, no en la que consulta: lo
// que hay que frenar es que alguien llene la agenda con reservas falsas o
// cancele en masa, no que alguien mire su propio turno tres veces.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middlewares/validate';
import { bookingLimiter } from '../../middlewares/rateLimit';
import { bookingsController } from './bookings.controller';
import {
  bookingCodeParamSchema,
  bookingLookupQuerySchema,
  cancelTokenSchema,
  createBookingSchema,
} from './bookings.validation';

export const bookingsRouter = Router();

bookingsRouter.post(
  '/',
  bookingLimiter,
  validate({ body: createBookingSchema }),
  asyncHandler(bookingsController.create),
);

bookingsRouter.get(
  '/:code',
  validate({ params: bookingCodeParamSchema, query: bookingLookupQuerySchema }),
  asyncHandler(bookingsController.getByCode),
);

// `PATCH` y no `DELETE`: la fila queda, con estado CANCELLED. Borrarla liberaría
// el horario igual, pero se perdería el registro de que ese turno existió.
bookingsRouter.patch(
  '/:code/cancel',
  bookingLimiter,
  validate({ params: bookingCodeParamSchema, body: cancelTokenSchema }),
  asyncHandler(bookingsController.cancel),
);
