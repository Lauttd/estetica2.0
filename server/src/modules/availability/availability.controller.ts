// =============================================================================
// KAYA KALPA — Controlador de disponibilidad
// =============================================================================

import type { Request, Response } from 'express';
import { ok } from '../../utils/http';
import { validatedQuery } from '../../middlewares/validate';
import { availabilityService } from './availability.service';
import type { AvailabilityQueryInput } from './availability.validation';

export const availabilityController = {
  async get(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<AvailabilityQueryInput>(req);
    ok(res, await availabilityService.getAvailability(query));
  },
};
