// =============================================================================
// KAYA KALPA — Envoltorio para handlers asíncronos
// =============================================================================
// Express 5 ya reenvía al `errorHandler` las promesas rechazadas de un handler,
// así que este envoltorio es redundante para el caso normal. Se mantiene por dos
// motivos concretos:
//
//   1. Deja explícito que el handler es asíncrono y que sus errores van al
//      manejador central, sin que haya que confiar en el comportamiento de turno.
//   2. Tipa el handler, así un controlador no puede devolver algo que Express no
//      sepa enviar sin que TypeScript se queje.
//
// Si algún día se migrara a Express 4, esto sigue funcionando sin cambios.
// =============================================================================

import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Un handler que puede ser asíncrono. */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    // `Promise.resolve` cubre también el caso de un handler sincrónico que
    // lanza: sin esto, el throw pasaría de largo.
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
