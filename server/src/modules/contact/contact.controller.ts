// =============================================================================
// KAYA KALPA — Controlador del formulario de contacto
// =============================================================================
// Solo la mitad pública: recibir el mensaje. La lectura desde el panel vive en
// `modules/admin`, junto al resto de las rutas privilegiadas.
// =============================================================================

import type { Request, Response } from 'express';
import { created } from '../../utils/http';
import { validatedBody } from '../../middlewares/validate';
import { contactService } from './contact.service';
import type { CreateContactMessageBody } from './contact.validation';

/**
 * De dónde vino el mensaje.
 *
 * Se guarda para poder distinguir un envío real de una ráfaga automatizada si
 * algún día hay spam. No se devuelve nunca al cliente: quien escribe no tiene por
 * qué ver su propia IP, y publicarla en la respuesta la expondría a un ataque de
 * caché compartida.
 */
function submissionMeta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

export const contactController = {
  /**
   * Responde 201 aunque el cuerpo no sea el mensaje guardado.
   *
   * Se creó un recurso —el mensaje— y eso es lo que declara el código. Lo que
   * devuelve es la confirmación para mostrar en pantalla, porque el id interno y
   * la IP no son asunto de quien completa un formulario público.
   */
  async create(req: Request, res: Response): Promise<void> {
    const body = validatedBody<CreateContactMessageBody>(req);
    created(res, await contactService.submit(body, submissionMeta(req)));
  },
};
