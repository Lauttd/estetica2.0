// =============================================================================
// KAYA KALPA — Controlador de autenticación
// =============================================================================
// Es el único controlador que toca cookies, y por eso el único que tiene que
// separar lo que va al cuerpo de lo que va a la cookie.
//
// El token de refresco NUNCA aparece en el cuerpo de la respuesta. Si apareciera,
// el frontend tendría que guardarlo en algún lado accesible desde JavaScript y se
// perdería todo el sentido de la cookie httpOnly.
// =============================================================================

import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../utils/http';
import { UnauthorizedError } from '../../utils/errors';
import { currentAdmin } from '../../middlewares/authGuard';
import { validatedBody } from '../../middlewares/validate';
import { authService } from './auth.service';
import { REFRESH_COOKIE, clearRefreshCookieOptions, refreshCookieOptions } from './auth.tokens';
import type { SessionResult } from './auth.types';
import type { ChangePasswordBody, LoginBody } from './auth.validation';

/** De dónde vino el pedido, para poder auditar las sesiones. */
function sessionMeta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

/** Deja la cookie del refresh y arma el cuerpo con todo lo demás. */
function respondWithSession(
  res: Response,
  session: SessionResult,
  status: 'ok' | 'created',
): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions(session.refreshExpiresAt));

  // `refreshToken` no se incluye: viaja en la cookie y en ningún otro lado.
  const body = { admin: session.admin, accessToken: session.accessToken };
  if (status === 'created') created(res, body);
  else ok(res, body);
}

export const authController = {
  /**
   * Inicia sesión.
   *
   * Responde 201 y no 200: se creó una sesión, así que el par de credenciales que
   * devuelve es un recurso nuevo.
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = validatedBody<LoginBody>(req);
    const session = await authService.login(body.email, body.password, sessionMeta(req));
    respondWithSession(res, session, 'created');
  },

  /**
   * Renueva la sesión a partir de la cookie.
   *
   * Distingue "no hay sesión" de "la sesión no sirve": si no viene la cookie, es
   * que el visitante nunca entró —el panel muestra el formulario de ingreso—,
   * mientras que un token rechazado es una sesión que existió y se cortó. El
   * frontend usa esa diferencia para decidir qué mostrar.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (!token) {
      // Se limpia igual: puede haber quedado una cookie con un valor que el
      // navegador sigue mandando aunque ya no sirva.
      res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
      throw new UnauthorizedError('No hay ninguna sesión abierta.');
    }

    respondWithSession(res, await authService.refresh(token, sessionMeta(req)), 'ok');
  },

  /**
   * Cierra la sesión.
   *
   * Responde 204 sin cuerpo, y siempre igual, haya o no una sesión que cerrar: el
   * cliente pidió cerrar sesión y después de esto no hay sesión. Devolver un error
   * porque ya estaba cerrada obligaría al frontend a tratar como fallo algo que
   * salió bien.
   */
  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, clearRefreshCookieOptions());
    noContent(res);
  },

  /** Quién está detrás del token. Lo usa el panel al recargar la página. */
  async me(req: Request, res: Response): Promise<void> {
    ok(res, await authService.me(currentAdmin(req).id));
  },

  /**
   * Cambia la contraseña.
   *
   * Devuelve una sesión nueva y reescribe la cookie: al cambiarla se revocan
   * todas las sesiones —incluida la de este mismo pedido—, así que sin esto quien
   * la cambió quedaría afuera y tendría que volver a entrar.
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const body = validatedBody<ChangePasswordBody>(req);

    respondWithSession(
      res,
      await authService.changePassword(
        currentAdmin(req).id,
        body.currentPassword,
        body.newPassword,
        sessionMeta(req),
      ),
      'ok',
    );
  },
};
