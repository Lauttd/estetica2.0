// =============================================================================
// KAYA KALPA — Rutas del módulo de categorías
// =============================================================================
// Es un listado sin parámetros: la respuesta es corta (7 categorías) y se cachea
// entera, así que no hay paginación que validar ni controlador separado que
// justifique un archivo propio.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';
import { categoriesService } from './categories.service';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await categoriesService.list());
  }),
);
