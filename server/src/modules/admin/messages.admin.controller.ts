// =============================================================================
// KAYA KALPA — Panel: mensajes del formulario de contacto
// =============================================================================
// Es una bandeja de entrada, no un catálogo: se lee de lo más nuevo a lo más
// viejo y lo que importa es cuántos quedan sin leer.
// =============================================================================

import type { Request, Response } from 'express';
import { ok, paginationMeta } from '../../utils/http';
import { validatedBody, validatedParams, validatedQuery } from '../../middlewares/validate';
import { contactService } from '../contact/contact.service';
import type {
  ListContactMessagesQuery,
  UpdateContactMessageBody,
} from '../contact/contact.validation';

interface IdParams {
  id: string;
}

export const messagesAdminController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<ListContactMessagesQuery>(req);
    const { items, total } = await contactService.list(query);

    ok(res, items, paginationMeta(query.page, query.perPage, total));
  },

  /**
   * Cuántos mensajes sin leer.
   *
   * Va aparte del listado porque el panel lo consulta para el globito de aviso, y
   * para eso no necesita traerse los mensajes: con el listado paginado, el
   * contador dependería de qué página se está mirando.
   */
  async unreadCount(_req: Request, res: Response): Promise<void> {
    ok(res, { unread: await contactService.countUnread() });
  },

  /**
   * Marcar como leído, respondido o archivado.
   *
   * El paso a `REPLIED` lo da la estética a mano después de contestar por fuera
   * —por WhatsApp o por teléfono, que es como se responde de verdad—. El sistema
   * no manda correos: no hay servidor de correo configurado y el prompt no lo pide.
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = validatedParams<IdParams>(req);
    const body = validatedBody<UpdateContactMessageBody>(req);
    ok(res, await contactService.updateStatus(id, body));
  },
};
