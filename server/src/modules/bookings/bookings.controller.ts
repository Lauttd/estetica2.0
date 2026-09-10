// =============================================================================
// KAYA KALPA — Controlador de turnos
// =============================================================================
// Los tres endpoints públicos del turno. Ninguno decide nada: traducen el pedido
// ya validado a una llamada del servicio y escriben la respuesta. Toda la lógica
// —incluida la verificación de disponibilidad— vive en `bookings.service`.
// =============================================================================

import type { Request, Response } from 'express';
import { created, ok } from '../../utils/http';
import { validatedBody, validatedParams, validatedQuery } from '../../middlewares/validate';
import { bookingsService } from './bookings.service';
import type {
  BookingCodeParams,
  BookingLookupQuery,
  CancelTokenBody,
  CreateBookingBody,
} from './bookings.validation';

export const bookingsController = {
  /** Alta del turno. Responde 201 con el código y el token de cancelación. */
  async create(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateBookingBody>(req);
    created(res, await bookingsService.create(body));
  },

  /**
   * Consulta por código.
   *
   * El token es opcional y viaja por query para que el enlace de confirmación
   * funcione como un solo link. Sin él la respuesta viene recortada: se ve cuándo
   * es el turno, pero nada personal.
   */
  async getByCode(req: Request, res: Response): Promise<void> {
    const { code } = validatedParams<BookingCodeParams>(req);
    const { token } = validatedQuery<BookingLookupQuery>(req);
    ok(res, await bookingsService.getByCode(code, token));
  },

  /**
   * Cancelación.
   *
   * Es `PATCH` y no `DELETE` porque la fila no se borra: el turno queda en la
   * base con estado CANCELLED, que es lo que libera el horario y deja el
   * historial de lo que pasó.
   */
  async cancel(req: Request, res: Response): Promise<void> {
    const { code } = validatedParams<BookingCodeParams>(req);
    const { token } = validatedBody<CancelTokenBody>(req);
    ok(res, await bookingsService.cancel(code, token));
  },
};
