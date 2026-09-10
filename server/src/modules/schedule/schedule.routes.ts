// =============================================================================
// KAYA KALPA — Rutas públicas de la agenda
// =============================================================================
// Lo único público es el horario de atención semanal: es lo que el pie de página
// y la página de contacto muestran. Los bloqueos y las franjas por profesional
// son información interna y viven detrás del panel.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/http';
import { scheduleService } from './schedule.service';

export const scheduleRouter = Router();

scheduleRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, { weekdays: await scheduleService.listPublicHours() });
  }),
);
