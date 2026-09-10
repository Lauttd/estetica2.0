// =============================================================================
// KAYA KALPA — Rutas de autenticación
// =============================================================================
// Montadas en `/api/auth`. Las cuatro primeras son públicas —son la puerta— y
// `me` y `change-password` exigen estar adentro.
//
// `authLimiter` va en las tres que aceptan credenciales. Es el que frena la
// fuerza bruta, y no consume cupo con los intentos exitosos: ver `rateLimit.ts`.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../middlewares/authGuard';
import { authLimiter } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import { authController } from './auth.controller';
import { changePasswordSchema, loginSchema } from './auth.validation';

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

// Sin validador de cuerpo: lo único que usa es la cookie. Ponerle un esquema
// vacío solo agregaría un paso que no comprueba nada.
authRouter.post('/refresh', authLimiter, asyncHandler(authController.refresh));

authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.get('/me', authGuard, asyncHandler(authController.me));

authRouter.patch(
  '/change-password',
  authGuard,
  authLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);
