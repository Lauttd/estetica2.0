// =============================================================================
// KAYA KALPA — Panel: usuarios del sistema
// =============================================================================
// El único grupo de rutas del panel reservado al rol ADMIN. Las demás las puede
// usar también STAFF: quien atiende el salón necesita confirmar turnos y mirar
// los mensajes, pero no decidir quién más entra al sistema.
//
// Quién hace el pedido sale siempre de la sesión, nunca del cuerpo. Es lo que
// permite rechazar que alguien se dé de baja a sí mismo o se cambie el rol.
// =============================================================================

import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../utils/http';
import { validatedBody, validatedParams } from '../../middlewares/validate';
import { authAdminService } from '../auth/auth.admin.service';
import type {
  CreateAdminUserBody,
  ResetAdminPasswordBody,
  UpdateAdminUserBody,
} from '../auth/auth.admin.validation';
import { actorId } from './admin.shared';

interface IdParams {
  id: string;
}

export const usersAdminController = {
  async list(req: Request, res: Response): Promise<void> {
    ok(res, await authAdminService.list(actorId(req)));
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateAdminUserBody>(req);
    created(res, await authAdminService.create(body, actorId(req)));
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateAdminUserBody>(req);
    ok(res, await authAdminService.update(id, body, actorId(req)));
  },

  /**
   * Ponerle una contraseña nueva a otra persona, para cuando se la olvidó.
   *
   * Responde 204 y no el usuario: lo único que cambió es un hash que no se
   * devuelve nunca, así que no hay nada que mostrar.
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<ResetAdminPasswordBody>(req);
    await authAdminService.resetPassword(id, body, actorId(req));
    noContent(res);
  },
};
