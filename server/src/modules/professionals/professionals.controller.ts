// =============================================================================
// KAYA KALPA — Controladores del módulo de profesionales
// =============================================================================

import type { Request, Response } from 'express';
import { ok } from '../../utils/http';
import { validatedQuery } from '../../middlewares/validate';
import { professionalsService } from './professionals.service';
import type { ListProfessionalsQuery } from './professionals.validation';

export const professionalsController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListProfessionalsQuery>(req);
    ok(res, await professionalsService.list(query.serviceIds ?? []));
  },
};
