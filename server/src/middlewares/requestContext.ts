// =============================================================================
// KAYA KALPA — Identificador de petición
// =============================================================================
// Cada petición recibe un id corto que aparece en el log y en la respuesta de
// error. Sirve para lo único que importa cuando alguien reporta un problema:
// poder encontrar esa petición exacta entre miles de líneas de log.
//
// Va antes que el logger de peticiones, así el id ya está puesto cuando se
// escribe la primera línea.
// =============================================================================

import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (req, res, next) => {
  // Se respeta el id que venga de un proxy o del cliente: si hay un trace
  // distribuido armado, cortarlo acá rompería la correlación.
  const incoming = req.get('x-request-id');
  const requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};
