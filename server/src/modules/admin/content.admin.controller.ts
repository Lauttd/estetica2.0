// =============================================================================
// KAYA KALPA — Panel: contenido del sitio (preguntas frecuentes y configuración)
// =============================================================================
// Los dos son "lo que el sitio dice de sí mismo" y se editan en pantallas
// contiguas del panel. Van juntos por eso, no porque compartan datos.
// =============================================================================

import type { Request, Response } from 'express';
import { created, ok } from '../../utils/http';
import { validatedBody, validatedParams } from '../../middlewares/validate';
import { faqService } from '../faq/faq.service';
import { settingsService } from '../settings/settings.service';
import type { CreateFaqBody, UpdateFaqBody } from '../faq/faq.validation';
import type { UpdateSettingsBody } from '../settings/settings.admin.validation';

interface IdParams {
  id: string;
}

export const contentAdminController = {
  // ---------------------------------------------------------------------------
  // Preguntas frecuentes
  // ---------------------------------------------------------------------------

  async listFaq(_req: Request, res: Response): Promise<void> {
    ok(res, await faqService.listForAdmin());
  },

  async createFaq(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateFaqBody>(req);
    created(res, await faqService.create(body));
  },

  async updateFaq(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateFaqBody>(req);
    ok(res, await faqService.update(id, body));
  },

  async deactivateFaq(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    ok(res, await faqService.deactivate(id));
  },

  // ---------------------------------------------------------------------------
  // Configuración del sitio
  // ---------------------------------------------------------------------------

  /**
   * Todas las claves, incluidas las internas.
   *
   * Es la única lectura que las devuelve: `GET /api/settings` —el público— sirve
   * una lista blanca sin las de funcionamiento.
   */
  async listSettings(_req: Request, res: Response): Promise<void> {
    ok(res, await settingsService.listForAdmin());
  },

  /**
   * Guarda los cambios de la pantalla de configuración.
   *
   * `PATCH` porque manda solo las claves que se tocaron. Las que no vienen quedan
   * como estaban, que es lo que la pantalla espera: se abre, se cambia el
   * teléfono y se guarda.
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    const { values } = validatedBody<UpdateSettingsBody>(req);
    ok(res, await settingsService.updateMany(values));
  },
};
