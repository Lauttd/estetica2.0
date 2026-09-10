// =============================================================================
// KAYA KALPA — Tipos del módulo de autenticación
// =============================================================================

import type { AdminRole } from '@prisma/client';

/**
 * Quién está haciendo el pedido.
 *
 * Es lo que el `authGuard` deja en `req.admin` y lo que leen los controladores.
 * No incluye el hash de la contraseña ni el `tokenVersion`: lo que se adjunta a
 * la petición tiene que ser lo que las rutas necesitan, y nada más.
 */
export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  /** `true` cuando todavía usa la contraseña que generó el seed. */
  mustChangePassword: boolean;
}

/** De dónde salió el pedido, para poder auditar las sesiones activas. */
export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/**
 * Lo que devuelve un login o un refresco.
 *
 * `refreshToken` no se serializa nunca al cliente: el controlador lo pone en una
 * cookie httpOnly y lo saca del cuerpo. Está acá porque el servicio tiene que
 * devolverlo para que el controlador pueda hacer eso.
 */
export interface SessionResult {
  admin: AdminIdentity;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Un usuario del panel tal como se ve en la pantalla de administración.
 *
 * Las cuatro banderas del final las calcula el servidor, no el panel. Podrían
 * deducirse de `isSelf` y `role`, pero hacerlo en el frontend significaría
 * repetir las reglas —"el último administrador activo no se puede dar de baja"—
 * en dos lugares, y el día que cambien en uno el botón va a ofrecer algo que la
 * API rechaza.
 */
export interface AdminUserEntry {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  /** `true` mientras siga usando la contraseña que le puso otra persona. */
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;

  /** `true` si es la sesión que está mirando la pantalla. */
  isSelf: boolean;
  /** Dar de baja a esta persona. */
  canDeactivate: boolean;
  /** Volver a habilitarla. */
  canActivate: boolean;
  /** Cambiarle el rol. */
  canChangeRole: boolean;
  /**
   * Ponerle una contraseña nueva desde acá.
   *
   * `false` para uno mismo: para la propia está el cambio de contraseña, que
   * exige la actual. Permitirlo por esta vía dejaría cambiar la propia contraseña
   * sin saber la vieja, que es justo lo que un token robado necesita.
   */
  canResetPassword: boolean;
}
