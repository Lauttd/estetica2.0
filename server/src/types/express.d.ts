// =============================================================================
// KAYA KALPA — Extensión de los tipos de Express
// =============================================================================
// Lo que los middlewares agregan a `req` y los controladores consumen.
// =============================================================================

import type { AdminIdentity } from '../modules/auth/auth.types';

/** Datos ya validados y normalizados por el middleware `validate`. */
export interface ValidatedRequestData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      /** Identificador de la petición, para poder cruzarla con el log. */
      requestId: string;
      /**
       * Resultado de `validate`. Los controladores leen SIEMPRE de acá y nunca
       * de `req.body` / `req.query` crudos: lo de acá ya pasó por Zod (tipos
       * convertidos, campos desconocidos descartados).
       */
      validated?: ValidatedRequestData;
      /**
       * Presente solo en rutas protegidas. Es el mismo tipo que devuelve el
       * módulo de auth, para que el guarda y los controladores no puedan
       * divergir en qué campos tiene un administrador autenticado.
       */
      admin?: AdminIdentity;
    }
  }
}

export {};
