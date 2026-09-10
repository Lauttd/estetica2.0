// =============================================================================
// KAYA KALPA — Panel: agenda de turnos
// =============================================================================

import type { Request, Response } from 'express';
import { ok, paginationMeta } from '../../utils/http';
import { validatedBody, validatedParams, validatedQuery } from '../../middlewares/validate';
import { bookingsAdminService } from '../bookings/bookings.admin.service';
import type {
  ListBookingsAdminQuery,
  UpdateBookingStatusBody,
} from '../bookings/bookings.admin.validation';
import { actorFrom } from './admin.shared';

interface IdParams {
  id: string;
}

export const bookingsAdminController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListBookingsAdminQuery>(req);
    const { items, total } = await bookingsAdminService.list(query);

    ok(res, items, paginationMeta(query.page, query.perPage, total));
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await bookingsAdminService.getById(id));
  },

  /**
   * Confirmar, cancelar, completar o marcar ausente.
   *
   * `PATCH` y no `PUT` porque cambia un solo campo del turno. Quién lo cambió
   * sale de la sesión y no del cuerpo: si el cliente pudiera mandar el autor, el
   * historial no serviría para nada.
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const { status, reason } = validatedBody<UpdateBookingStatusBody>(req);

    ok(res, await bookingsAdminService.changeStatus(id, status, actorFrom(req), reason));
  },
};
