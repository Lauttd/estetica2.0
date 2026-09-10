// =============================================================================
// KAYA KALPA — Ruta no encontrada
// =============================================================================
// Va registrado después de todas las rutas.
//
// NOTA sobre Express 5: acá NO se puede usar `app.use('*', ...)` ni
// `app.get('*', ...)`. Express 5 pasó a `path-to-regexp` v8, donde un asterisco
// suelto ya no es un comodín válido y la ruta lanza al arrancar. Un middleware
// sin path resuelve lo mismo y es lo que corresponde: se ejecuta solo si ninguna
// ruta anterior respondió.
//
// Cuando el frontend se sirva desde este mismo proceso, el fallback de la SPA
// (devolver index.html para las rutas del router de React) va ANTES de este
// middleware, limitado a las rutas que no empiezan con /api.
// =============================================================================

import type { RequestHandler } from 'express';
import { NotFoundError } from '../utils/errors';

export const notFound: RequestHandler = (req, _res, next) => {
  next(
    new NotFoundError(
      `No encontramos el recurso ${req.method} ${req.path}.`,
    ),
  );
};
