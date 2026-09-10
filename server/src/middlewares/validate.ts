// =============================================================================
// KAYA KALPA — Validación de entrada
// =============================================================================
// Un único middleware que valida `body`, `query` y `params` contra esquemas Zod,
// antes de que el controlador vea nada.
//
// DECISIÓN: el resultado NO se escribe de vuelta en `req.body` / `req.query`. Se
// deja en `req.validated` y el controlador lo lee con los helpers de abajo.
//
//   · Es explícito: en un controlador se ve de dónde salió el dato, y no hay
//     forma de leer por accidente un `req.body` sin validar.
//   · Evita un problema real de Express 5: `req.query` es una propiedad con
//     getter y sin setter, así que asignarle un valor lanzaría un TypeError.
//     Tocar el objeto original obligaría a un `Object.defineProperty`.
//   · Zod descarta los campos desconocidos al parsear, pero solo en la copia: el
//     `req.body` original sigue teniendo lo que mandó el cliente. Nada de eso
//     llega a la base porque los controladores nunca lo miran.
// =============================================================================

import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
// Instala los mensajes en castellano. Se importa por su efecto: a partir de acá,
// todos los errores de Zod salen traducidos.
import '../utils/zod-locale';
import { BadRequestError, type ErrorDetail } from '../utils/errors';
import type { ValidatedRequestData } from '../types/express';

export interface ValidationSchemas {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
}

/** El orden importa solo para que los mensajes salgan siempre igual. */
const LOCATIONS = ['params', 'query', 'body'] as const;
type Location = (typeof LOCATIONS)[number];

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    // Parcial a propósito: un esquema puede validar solo el body y dejar la
    // query como estaba.
    const validated: Partial<Record<Location, unknown>> = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);

      if (result.success) {
        validated[location] = result.data;
        continue;
      }

      for (const issue of result.error.issues) {
        details.push({
          // Se antepone la ubicación ("body.phone") porque el mismo nombre de
          // campo puede existir en el cuerpo y en la query a la vez.
          field: [location, ...issue.path.map(String)].join('.'),
          message: issue.message,
        });
      }
    }

    if (details.length > 0) {
      next(
        new BadRequestError('Revisá los datos ingresados.', { details }),
      );
      return;
    }

    req.validated = validated as ValidatedRequestData;
    next();
  };
}

// -----------------------------------------------------------------------------
// Lectura tipada
// -----------------------------------------------------------------------------
// Contienen el único `as` del sistema de validación: el middleware no puede
// conservar el tipo que infiere Zod (Express no permite tipar el handler por
// ruta), así que el tipo se declara en el punto de uso, donde sí se conoce.
// -----------------------------------------------------------------------------

export function validatedBody<T>(req: Request): T {
  return req.validated?.body as T;
}

export function validatedQuery<T>(req: Request): T {
  return req.validated?.query as T;
}

export function validatedParams<T>(req: Request): T {
  return req.validated?.params as T;
}
