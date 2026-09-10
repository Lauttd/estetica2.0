// =============================================================================
// KAYA KALPA — Controladores del catálogo
// =============================================================================
// Solo traducen HTTP a llamadas del servicio. No hay lógica de negocio acá: si
// aparece una condición, va en `services.service.ts`.
// =============================================================================

import type { Request, Response } from 'express';
import { ok, paginationMeta } from '../../utils/http';
import { validatedParams, validatedQuery } from '../../middlewares/validate';
import { servicesService } from './services.service';
import type { ListServicesQuery } from './services.types';

export const servicesController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListServicesQuery>(req);
    const { items, total } = await servicesService.list(query);

    ok(res, items, paginationMeta(query.page, query.perPage, total));
  },

  async detail(req: Request, res: Response): Promise<void> {
    const { slug } = validatedParams<{ slug: string }>(req);
    ok(res, await servicesService.getBySlug(slug));
  },
};
