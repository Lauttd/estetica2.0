// =============================================================================
// KAYA KALPA — Autenticación del panel
// =============================================================================
// Login, refresco, cierre de sesión y cambio de contraseña.
//
// DOS DECISIONES QUE ATRAVIESAN TODO EL MÓDULO
//
// 1. Un solo mensaje para todos los fallos de login. "Ese correo no existe" y "la
//    contraseña está mal" se responden igual. Distinguirlos le confirmaría a
//    quien prueba direcciones cuáles están registradas, que es el primer dato que
//    necesita para atacar el panel.
//
// 2. El refresco se ROTA en cada uso. Cada refresh entrega un token nuevo y
//    revoca el anterior. Así, un token robado sirve una sola vez, y si el ladrón
//    lo usa antes que su dueño, el dueño descubre el robo al intentar refrescar.
// =============================================================================

import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { UnauthorizedError, ErrorCode, AppError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { authRepository } from './auth.repository';
import {
  createRefreshToken,
  hashRefreshToken,
  refreshTokenTtlMs,
  signAccessToken,
} from './auth.tokens';
import type { AdminIdentity, SessionMeta, SessionResult } from './auth.types';

/**
 * Un hash contra el que verificar cuando el correo no existe.
 *
 * Sin esto, un login con un correo inexistente responde mucho más rápido que uno
 * con el correo correcto y la contraseña mal: el primero no gasta los ~50 ms de
 * argon2. Esa diferencia de tiempo, medida, alcanza para averiguar qué correos
 * están registrados aunque el mensaje sea idéntico.
 *
 * Se calcula una sola vez, la primera vez que hace falta, y no en el arranque:
 * así no le suma medio segundo al inicio del servidor ni al de las verificaciones.
 */
let dummyHash: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash;
}

/** El error de login, siempre el mismo. */
function invalidCredentials(): UnauthorizedError {
  return new UnauthorizedError('Correo o contraseña incorrectos.');
}

/** Un token de refresco que no sirve. */
function invalidSession(): UnauthorizedError {
  return new UnauthorizedError('Tu sesión venció. Volvé a iniciar sesión.');
}

export const authService = {
  /**
   * Inicia sesión.
   *
   * El orden de los controles no es casual: primero se verifica la contraseña y
   * recién después se mira si la cuenta está activa. Al revés, alguien podría
   * deducir que una cuenta existe y está dada de baja sin saber la contraseña.
   */
  async login(email: string, password: string, meta: SessionMeta): Promise<SessionResult> {
    const admin = await authRepository.findCredentialsByEmail(email);

    if (!admin) {
      // Se verifica igual contra un hash de descarte, para que este camino tarde
      // lo mismo que el de una contraseña equivocada.
      await verifyPassword(await getDummyHash(), password);
      throw invalidCredentials();
    }

    const passwordMatches = await verifyPassword(admin.passwordHash, password);
    if (!passwordMatches) throw invalidCredentials();
    if (!admin.active) throw invalidCredentials();

    const session = await issueSession(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
        tokenVersion: admin.tokenVersion,
      },
      meta,
    );

    await authRepository.touchLastLogin(admin.id);
    logger.info({ adminId: admin.id }, 'Ingreso al panel');

    return session;
  },

  /**
   * Renueva la sesión a partir de la cookie.
   *
   * Es el punto más delicado del módulo, porque acá se detecta el robo de un
   * token. El razonamiento:
   *
   *   · Si el token no está en la base, no hay nada que hacer.
   *   · Si está revocado, alguien lo usó después de que se rotara. El dueño
   *     legítimo ya recibió uno nuevo, así que quien está llamando es un tercero
   *     con una copia, o el dueño con una copia vieja. En cualquiera de los dos
   *     casos la respuesta correcta es la misma: cortar la familia entera.
   *   · Si está vencido, la sesión terminó y hay que volver a entrar.
   */
  async refresh(rawToken: string, meta: SessionMeta): Promise<SessionResult> {
    const session = await authRepository.findSessionByTokenHash(hashRefreshToken(rawToken));

    if (!session) throw invalidSession();

    if (session.revokedAt) {
      const revoked = await authRepository.revokeFamily(session.familyId);
      logger.warn(
        { adminId: session.adminId, familyId: session.familyId, sessionsRevoked: revoked },
        'Se presentó un token de refresco ya usado: se cerraron todas las sesiones de esa familia',
      );
      throw invalidSession();
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await authRepository.revokeSession(session.id);
      throw invalidSession();
    }

    // Una cuenta dada de baja no puede renovar: el token era válido cuando se
    // emitió, pero eso fue antes de la baja.
    if (!session.admin.active) {
      await authRepository.revokeFamily(session.familyId);
      throw invalidSession();
    }

    const identity: AdminIdentity & { tokenVersion: number } = {
      id: session.admin.id,
      email: session.admin.email,
      name: session.admin.name,
      role: session.admin.role,
      mustChangePassword: session.admin.mustChangePassword,
      tokenVersion: session.admin.tokenVersion,
    };

    return issueSession(identity, meta, {
      familyId: session.familyId,
      replaceSessionId: session.id,
    });
  },

  /**
   * Cierra la sesión.
   *
   * Revoca la familia completa, no solo el token presentado: una familia es un
   * login, y sus tokens son las sucesivas rotaciones de ese mismo login. Cerrar
   * sesión significa terminar con ese login, no con una de sus rotaciones.
   *
   * No falla si la cookie no viene o el token ya no existe: el cliente pidió
   * cerrar sesión, y después de esto la sesión está cerrada en cualquier caso.
   */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;

    const session = await authRepository.findSessionByTokenHash(hashRefreshToken(rawToken));
    if (!session) return;

    await authRepository.revokeFamily(session.familyId);
    logger.info({ adminId: session.adminId }, 'Cierre de sesión en el panel');
  },

  /** El administrador detrás de un token de acceso. */
  async me(adminId: string): Promise<AdminIdentity> {
    const admin = await authRepository.findIdentityById(adminId);
    if (!admin || !admin.active) throw invalidSession();

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    };
  },

  /**
   * Cambia la contraseña.
   *
   * Exige la contraseña actual aunque quien pida ya tenga sesión: un token de
   * acceso robado, o una sesión abierta en una computadora compartida del salón,
   * no debería alcanzar para quedarse con la cuenta para siempre.
   *
   * Al cambiarla se revocan TODAS las sesiones —incluidas las de otros
   * dispositivos— y se emite una nueva para quien la cambió, así no se lo deja
   * afuera. El incremento de `tokenVersion` invalida además los tokens de acceso
   * que estén circulando, que es lo que un JWT no puede hacer solo.
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
    meta: SessionMeta,
  ): Promise<SessionResult> {
    const admin = await authRepository.findCredentialsById(adminId);
    if (!admin) throw invalidSession();

    if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'La contraseña actual no coincide.',
        { details: [{ field: 'body.currentPassword', message: 'No coincide con la actual.' }] },
      );
    }

    if (await verifyPassword(admin.passwordHash, newPassword)) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'La contraseña nueva tiene que ser distinta de la actual.',
        { details: [{ field: 'body.newPassword', message: 'Es la misma que la actual.' }] },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await authRepository.updatePassword(
        adminId,
        await hashPassword(newPassword),
        tx,
      );
      await authRepository.revokeAllForAdmin(adminId, tx);
      return result;
    });

    logger.info({ adminId }, 'Cambio de contraseña en el panel');

    return issueSession(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mustChangePassword: false,
        tokenVersion: updated.tokenVersion,
      },
      meta,
    );
  },
};

// -----------------------------------------------------------------------------
// Interno
// -----------------------------------------------------------------------------

/**
 * Emite un par de credenciales y guarda la sesión.
 *
 * `rotation` se omite al iniciar sesión —ahí nace una familia nueva— y se pasa al
 * refrescar. Trae el id de la sesión que se está canjeando, para revocar
 * exactamente esa.
 *
 * Se pasa el id en vez de buscar "el token sin revocar de la familia" a
 * propósito: con dos refrescos simultáneos del mismo token, esa búsqueda haría
 * que el segundo revocara la sesión recién creada por el primero, y el cliente
 * terminaría con un token que ya nació muerto. Con el id explícito, los dos
 * apuntan al mismo token viejo y el peor caso es que queden dos sesiones válidas
 * —las dos legítimas, porque las dos tenían el token—.
 */
async function issueSession(
  admin: AdminIdentity & { tokenVersion: number },
  meta: SessionMeta,
  rotation?: { familyId: string; replaceSessionId: string },
): Promise<SessionResult> {
  const accessToken = signAccessToken({
    sub: admin.id,
    role: admin.role,
    ver: admin.tokenVersion,
  });

  const { token, tokenHash } = createRefreshToken();
  const expiresAt = new Date(Date.now() + refreshTokenTtlMs());

  await prisma.$transaction(async (tx) => {
    const created = await authRepository.createRefreshToken(
      {
        adminId: admin.id,
        tokenHash,
        familyId: rotation?.familyId ?? randomUUID(),
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
      tx,
    );

    // El token que se acaba de canjear queda revocado y apuntando al que lo
    // reemplaza. El `replacedById` no se usa para navegar la cadena: sirve para
    // poder mirar la base después y entender qué pasó con una sesión.
    if (rotation) {
      await authRepository.revokeSession(rotation.replaceSessionId, created.id, tx);
    }
  });

  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    },
    accessToken,
    refreshToken: token,
    refreshExpiresAt: expiresAt,
  };
}
