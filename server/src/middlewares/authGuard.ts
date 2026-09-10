// =============================================================================
// KAYA KALPA — Guardas de acceso al panel
// =============================================================================
// `authGuard` responde "¿quién es?"; `requirePasswordChanged`, "¿terminó de
// entrar?"; `roleGuard`, "¿puede?". Los tres se usan en las rutas de
// administración:
//
//   adminRouter.use(authGuard, requirePasswordChanged);
//   adminRouter.use('/users', roleGuard(AdminRole.ADMIN));
//
// POR QUÉ EL GUARDA CONSULTA LA BASE
//
// Un JWT se verifica sin tocar la base, que es su ventaja. Pero entonces un token
// emitido sigue siendo válido hasta que expira, aunque en el medio se haya dado
// de baja la cuenta o se haya cambiado la contraseña. Como el panel es de bajo
// tráfico —unas pocas personas del salón—, el costo de leer la fila es
// despreciable y a cambio la baja y el cambio de contraseña tienen efecto
// inmediato. Es el intercambio correcto para este caso y no lo sería para una API
// pública con miles de pedidos por segundo.
// =============================================================================

import type { Request, RequestHandler } from 'express';
import type { AdminRole } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import {
  ForbiddenError,
  PasswordChangeRequiredError,
  UnauthorizedError,
} from '../utils/errors';
import { authRepository } from '../modules/auth/auth.repository';
import { readBearerToken, verifyAccessToken } from '../modules/auth/auth.tokens';
import type { AdminIdentity } from '../modules/auth/auth.types';

/**
 * El administrador del pedido, o un 401 si no hay.
 *
 * `req.admin` es opcional en el tipo porque la mayoría de las rutas no está
 * detrás del guarda. En las que sí lo están, los controladores necesitan el valor
 * sin opcionalidad, y esta función se lo da sin repetir el mismo `if` en cada uno.
 * Lanza el error en vez de devolver `null` para que el formato de la respuesta
 * siga saliendo del manejador central, como todos los demás errores.
 */
export function currentAdmin(req: Request): AdminIdentity {
  if (!req.admin) {
    throw new UnauthorizedError('Necesitás iniciar sesión para continuar.');
  }
  return req.admin;
}

export const authGuard: RequestHandler = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) {
    throw new UnauthorizedError('Necesitás iniciar sesión para continuar.');
  }

  const claims = verifyAccessToken(token);
  if (!claims) {
    // Acá se juntan el token vencido y el inválido. El cliente no necesita
    // distinguirlos: en los dos casos tiene que pedir un refresco, y si el
    // refresco tampoco sirve, volver a entrar.
    throw new UnauthorizedError('Tu sesión venció. Volvé a iniciar sesión.');
  }

  const admin = await authRepository.findIdentityById(claims.sub);

  // El `tokenVersion` es lo que permite que un cambio de contraseña corte el
  // acceso antes de que el token expire: los tokens emitidos antes traen el
  // número anterior y dejan de coincidir.
  if (!admin || !admin.active || admin.tokenVersion !== claims.ver) {
    throw new UnauthorizedError('Tu sesión venció. Volvé a iniciar sesión.');
  }

  req.admin = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };

  next();
});

/**
 * Exige que la contraseña provisoria ya se haya cambiado.
 *
 * VA SIEMPRE DESPUÉS DE `authGuard` y SOLO EN EL PANEL. No se mete dentro de
 * `authGuard` por una razón concreta: las rutas de `/api/auth` también usan ese
 * guarda, y `PATCH /api/auth/change-password` es justamente el único camino que
 * tiene alguien con la contraseña provisoria para dejar de estarlo. Si la
 * comprobación viviera en `authGuard`, el cambio de contraseña se bloquearía a sí
 * mismo y la cuenta quedaría encerrada.
 *
 * Es 403 y no 401: la sesión es válida. El panel tiene que llevar a la pantalla
 * de cambio de contraseña, no al login.
 */
export const requirePasswordChanged: RequestHandler = (req, _res, next) => {
  if (currentAdmin(req).mustChangePassword) {
    next(new PasswordChangeRequiredError());
    return;
  }

  next();
};

/**
 * Exige uno de los roles indicados.
 *
 * Va SIEMPRE después de `authGuard`: sin él no hay `req.admin` y esto no tendría
 * a quién preguntarle. Por eso comprueba que esté antes de mirarlo: un
 * `roleGuard` montado solo rechaza el pedido con un 401 claro en vez de caerse
 * con un error de tipo que terminaría en un 500 sin explicación.
 */
export function roleGuard(...allowed: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    const admin = currentAdmin(req);

    if (!allowed.includes(admin.role)) {
      next(new ForbiddenError('No tenés permisos para hacer esta acción.'));
      return;
    }

    next();
  };
}
