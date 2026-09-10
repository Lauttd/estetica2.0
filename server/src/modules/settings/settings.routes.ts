// =============================================================================
// KAYA KALPA — Rutas del módulo de configuración
// =============================================================================
// Solo lectura pública por ahora. La escritura llega con el panel de
// administración (Fase 5), protegida por rol.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';
import { settingsService } from './settings.service';

export const settingsRouter = Router();

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await settingsService.getPublic());
  }),
);
