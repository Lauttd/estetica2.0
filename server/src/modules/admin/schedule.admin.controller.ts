// =============================================================================
// KAYA KALPA — Panel: horarios, bloqueos y franjas cerradas
// =============================================================================
// Son las tres formas de decir cuándo atiende la estética, y van juntas porque se
// configuran en la misma pantalla:
//
//   · Franjas de atención  lo que se repite todas las semanas.
//   · Días bloqueados      un día entero que no se atiende (feriado, vacaciones).
//   · Franjas bloqueadas   un rato dentro de un día (un trámite a la mañana).
//
// A diferencia del resto del panel, acá `DELETE` borra de verdad y no desactiva.
// El motivo está explicado en el servicio: un bloqueo es un hecho pasado o
// puntual, no un dato del catálogo, y dejar bloqueos viejos "desactivados"
// ensuciaría la lista de días sin que nadie los mire nunca.
// =============================================================================

import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../utils/http';
import { validatedBody, validatedParams, validatedQuery } from '../../middlewares/validate';
import { scheduleService } from '../schedule/schedule.service';
import type {
  CreateBlockedDateBody,
  CreateBlockedTimeBody,
  CreateBusinessHourBody,
  ListBlockedDatesQuery,
  ListBlockedTimesQuery,
  ListBusinessHoursQuery,
  UpdateBusinessHourBody,
} from '../schedule/schedule.validation';

interface IdParams {
  id: string;
}

export const scheduleAdminController = {
  // ---------------------------------------------------------------------------
  // Franjas de atención
  // ---------------------------------------------------------------------------

  async listBusinessHours(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListBusinessHoursQuery>(req);
    ok(res, await scheduleService.listBusinessHours(query));
  },

  async getBusinessHour(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await scheduleService.getBusinessHour(id));
  },

  async createBusinessHour(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateBusinessHourBody>(req);
    created(res, await scheduleService.createBusinessHour(body));
  },

  async updateBusinessHour(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateBusinessHourBody>(req);
    ok(res, await scheduleService.updateBusinessHour(id, body));
  },

  async deleteBusinessHour(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    await scheduleService.deleteBusinessHour(id);
    noContent(res);
  },

  // ---------------------------------------------------------------------------
  // Días bloqueados
  // ---------------------------------------------------------------------------

  async listBlockedDates(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListBlockedDatesQuery>(req);
    ok(res, await scheduleService.listBlockedDates(query));
  },

  async createBlockedDate(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateBlockedDateBody>(req);
    created(res, await scheduleService.createBlockedDate(body));
  },

  async deleteBlockedDate(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    await scheduleService.deleteBlockedDate(id);
    noContent(res);
  },

  // ---------------------------------------------------------------------------
  // Franjas bloqueadas
  // ---------------------------------------------------------------------------

  async listBlockedTimes(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListBlockedTimesQuery>(req);
    ok(res, await scheduleService.listBlockedTimes(query));
  },

  async createBlockedTime(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateBlockedTimeBody>(req);
    created(res, await scheduleService.createBlockedTime(body));
  },

  async deleteBlockedTime(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    await scheduleService.deleteBlockedTime(id);
    noContent(res);
  },
};
