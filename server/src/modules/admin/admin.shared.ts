// =============================================================================
// KAYA KALPA — Lo que comparten los controladores del panel
// =============================================================================

import type { Request } from 'express';
import { currentAdmin } from '../../middlewares/authGuard';
import type { AdminActor } from '../bookings/bookings.admin.service';

/**
 * Quién está haciendo el pedido, para las operaciones que dejan rastro.
 *
 * Envuelve `currentAdmin` en vez de leer `req.admin` directo por dos razones: el
 * `req.admin` es opcional en el tipo —la mayoría de las rutas no está detrás del
 * guarda— y porque así queda en un solo lugar la decisión de qué se guarda en el
 * historial cuando alguien del panel toca un turno.
 */
export function actorFrom(req: Request): AdminActor {
  const admin = currentAdmin(req);
  return { id: admin.id, role: admin.role };
}

/** El id de quien hace el pedido. Atajo para los casos que solo necesitan eso. */
export function actorId(req: Request): string {
  return currentAdmin(req).id;
}
