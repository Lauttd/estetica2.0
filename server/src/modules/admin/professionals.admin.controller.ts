// =============================================================================
// KAYA KALPA — Panel: profesionales
// =============================================================================

import type { Request, Response } from 'express';
import { created, ok } from '../../utils/http';
import { validatedBody, validatedParams } from '../../middlewares/validate';
import { professionalsService } from '../professionals/professionals.service';
import type {
  CreateProfessionalBody,
  ReplaceProfessionalServicesBody,
  UpdateProfessionalBody,
} from '../professionals/professionals.validation';

interface IdParams {
  id: string;
}

export const professionalsAdminController = {
  async list(_req: Request, res: Response): Promise<void> {
    ok(res, await professionalsService.listForAdmin());
  },

  async get(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await professionalsService.getByIdForAdmin(id));
  },

  async create(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateProfessionalBody>(req);
    created(res, await professionalsService.create(body));
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateProfessionalBody>(req);
    ok(res, await professionalsService.update(id, body));
  },

  /**
   * Reemplaza la lista completa de servicios que hace un profesional.
   *
   * Es un `PUT` y no un `POST` porque manda el conjunto entero, no una suma: el
   * panel tiene la lista de todos los servicios con casillas, y manda las que
   * quedaron tildadas. Con un `POST` que agregara, destildar no tendría forma de
   * expresarse.
   */
  async replaceServices(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const { serviceIds } = validatedBody<ReplaceProfessionalServicesBody>(req);
    ok(res, await professionalsService.replaceServices(id, serviceIds));
  },

  /**
   * Dar de baja a un profesional.
   *
   * El servicio rechaza la baja si le quedan turnos por delante: los turnos ya
   * tomados no se cancelan solos, y si se lo apaga sin mirar, la estética se
   * entera el día que la clienta llega y no hay quien la atienda.
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await professionalsService.deactivate(id));
  },
};
