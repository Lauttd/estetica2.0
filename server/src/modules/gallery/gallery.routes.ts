// =============================================================================
// KAYA KALPA — Rutas públicas de la galería
// =============================================================================
// Un listado sin parámetros: son pocas fotos y se cachea entero, como el de
// categorías. No lleva controlador propio por el mismo motivo.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';
import { galleryService } from './gallery.service';

export const galleryRouter = Router();

galleryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await galleryService.list());
  }),
);
