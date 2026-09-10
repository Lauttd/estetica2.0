// =============================================================================
// KAYA KALPA — Administración de los usuarios del panel
// =============================================================================
// Quién puede entrar al sistema y con qué rol.
//
// ES LA SUPERFICIE MÁS DELICADA DEL PANEL
//
// Todo lo demás que se administra desde acá se puede arreglar desde acá mismo:
// un precio mal cargado, un turno mal confirmado. Esto no. Un panel sin ningún
// administrador activo no se recupera desde la interfaz —hay que entrar por
// `psql`—, y una cuenta dada de baja que se puede reactivar sola es un agujero.
// Por eso las reglas de abajo son tantas y tan explícitas.
// =============================================================================

import type { AdminRole } from '@prisma/client';
import { prisma, type Db } from '../../config/prisma';
import { logger } from '../../config/logger';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { hashPassword } from '../../utils/password';
import { rethrowUniqueViolation } from '../shared/persistence';
import { authRepository, type AdminUserRow } from './auth.repository';
import type { AdminUserEntry } from './auth.types';
import type {
  CreateAdminUserBody,
  ResetAdminPasswordBody,
  UpdateAdminUserBody,
} from './auth.admin.validation';

const MESSAGES = {
  email: 'Ya hay un usuario con ese correo.',
};

/** El correo se guarda siempre en minúsculas, igual que se busca al entrar. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Traduce la fila a lo que ve el panel, con los permisos ya resueltos.
 *
 * `activeAdmins` es cuántos administradores activos hay además de este. Se pasa
 * calculado desde afuera porque averiguarlo por fila sería una consulta por
 * usuario, y la lista es corta pero no hay razón para hacerlo.
 */
function toEntry(
  row: AdminUserRow,
  actorId: string,
  activeAdminsBesidesThis: number,
): AdminUserEntry {
  const isSelf = row.id === actorId;
  const isLastActiveAdmin =
    row.role === 'ADMIN' && row.active && activeAdminsBesidesThis === 0;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    isSelf,
    canDeactivate: row.active && !isSelf && !isLastActiveAdmin,
    canActivate: !row.active,
    canChangeRole: !isSelf && !isLastActiveAdmin,
    canResetPassword: !isSelf,
  };
}

/**
 * Cuántos administradores activos hay además de cada uno de los ids dados.
 *
 * Se resuelve con una sola consulta para toda la lista: se cuentan los activos y
 * después, por fila, se descuenta uno si esa fila es un administrador activo.
 */
async function activeAdminCounts(
  rows: AdminUserRow[],
  db: Db = prisma,
): Promise<Map<string, number>> {
  // `countActiveAdminsExcept` excluye a uno; acá hace falta lo mismo por fila, así
  // que se cuenta el total y se ajusta. Es una lista de personas del salón: entra
  // entera en memoria sin pensarlo.
  const total = await db.adminUser.count({ where: { role: 'ADMIN', active: true } });

  return new Map(
    rows.map((row) => {
      const isActiveAdmin = row.role === 'ADMIN' && row.active;
      return [row.id, isActiveAdmin ? total - 1 : total];
    }),
  );
}

/** El usuario o un 404. Se usa antes de cualquier modificación. */
async function findOrFail(id: string): Promise<AdminUserRow> {
  const row = await authRepository.findAdminById(id);
  if (!row) throw new NotFoundError('No encontramos ese usuario.');
  return row;
}

/**
 * Impide que una operación deje el panel sin administradores.
 *
 * Casi siempre es redundante: quien hace el pedido es un ADMIN activo —lo exige
 * el guarda—, así que mientras apunte a otra persona queda al menos uno. Donde
 * deja de serlo es en la carrera que describe `lockAdminUsers`: dos
 * administradores degradándose mutuamente, donde el segundo ya no cuenta al
 * primero porque el primero acaba de degradarlo. Ahí esta comprobación es lo
 * único que separa al sistema de quedar sin nadie que lo administre.
 *
 * Por eso se evalúa SIEMPRE dentro de la transacción que tomó el lock: el número
 * que importa no es el de hace un instante sino el de ahora.
 */
async function assertNotLastAdmin(
  tx: Db,
  target: AdminUserRow,
  action: string,
): Promise<void> {
  if (target.role !== 'ADMIN' || !target.active) return;

  const others = await authRepository.countActiveAdminsExcept(target.id, tx);
  if (others === 0) {
    throw new ConflictError(
      `${target.name} es el único administrador activo. Si ${action}, nadie podría volver a entrar a administrar el panel.`,
    );
  }
}

export const authAdminService = {
  async list(actorId: string): Promise<AdminUserEntry[]> {
    const rows = await authRepository.listAdmins();
    const counts = await activeAdminCounts(rows);
    return rows.map((row) => toEntry(row, actorId, counts.get(row.id) ?? 0));
  },

  /**
   * Da de alta a alguien.
   *
   * La contraseña la elige quien administra, no la persona que va a usarla, así
   * que la cuenta queda marcada para cambiarla en el primer ingreso. Hasta
   * entonces esa contraseña la conoce alguien más, y eso no debería sobrevivir al
   * primer día.
   */
  async create(body: CreateAdminUserBody, actorId: string): Promise<AdminUserEntry> {
    try {
      const created = await authRepository.createAdmin({
        email: normalizeEmail(body.email),
        name: body.name,
        role: body.role as AdminRole,
        passwordHash: await hashPassword(body.password),
        mustChangePassword: true,
      });

      logger.info(
        { actorId, adminId: created.id, role: created.role },
        'Alta de usuario del panel',
      );

      const counts = await activeAdminCounts([created]);
      return toEntry(created, actorId, counts.get(created.id) ?? 0);
    } catch (error) {
      // El índice único del correo. Se traduce a un 409 con un mensaje que dice
      // qué pasó, en vez del error crudo de la base.
      rethrowUniqueViolation(error, MESSAGES);
    }
  },

  async update(
    id: string,
    body: UpdateAdminUserBody,
    actorId: string,
  ): Promise<AdminUserEntry> {
    const target = await findOrFail(id);

    const wantsToDeactivate = body.active === false && target.active;
    const wantsToDemote =
      body.role !== undefined && body.role !== target.role && target.role === 'ADMIN';

    // Estas dos no dependen del lock —comparan contra quien hace el pedido, que no
    // cambia— así que se rechazan antes de abrir la transacción.
    if (id === actorId) {
      if (wantsToDeactivate) {
        throw new ConflictError(
          'No podés darte de baja a vos mismo. Pedile a otro administrador que lo haga.',
        );
      }
      if (body.role !== undefined && body.role !== target.role) {
        throw new ConflictError(
          'No podés cambiarte el rol a vos mismo. Pedile a otro administrador que lo haga.',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await authRepository.lockAdminUsers(tx);

      // Se relee con el lock tomado: entre el `findOrFail` de arriba y acá pudo
      // cambiar algo, y sobre todo el conteo tiene que ser el de ahora.
      const current = await authRepository.findAdminById(id, tx);
      if (!current) throw new NotFoundError('No encontramos ese usuario.');

      if (wantsToDeactivate || wantsToDemote) {
        await assertNotLastAdmin(
          tx,
          current,
          wantsToDeactivate ? 'se da de baja' : 'deja de ser administrador',
        );
      }

      const data: { name?: string; role?: AdminRole; active?: boolean } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.role !== undefined) data.role = body.role as AdminRole;
      if (body.active !== undefined) data.active = body.active;

      const updated = await authRepository.updateAdmin(id, data, tx);

      // Dar de baja corta el acceso en el acto, y no solo por el guarda —que ya
      // mira `active`—: se revocan las sesiones y se sube el `tokenVersion` para
      // que, si la cuenta se reactiva más adelante, los tokens de refresco que
      // quedaron guardados en algún navegador no vuelvan a servir solos.
      if (wantsToDeactivate) {
        await authRepository.bumpTokenVersion(id, tx);
        const revoked = await authRepository.revokeAllForAdmin(id, tx);
        logger.warn(
          { actorId, adminId: id, sessionsRevoked: revoked },
          'Baja de usuario del panel',
        );
      }

      // El conteo de acá ya no puede ser "el de antes": el lock garantiza que
      // nadie más está modificando usuarios mientras corre esta transacción.
      const counts = await activeAdminCounts([updated], tx);
      return toEntry(updated, actorId, counts.get(updated.id) ?? 0);
    });
  },

  /**
   * Le pone una contraseña nueva a otra persona.
   *
   * Para quien se olvidó la suya. La elige un administrador, así que la cuenta
   * queda marcada para cambiarla al entrar, y se cierran todas las sesiones de esa
   * persona: si la olvidó porque alguien más se la cambió, ese alguien no debería
   * conservar el acceso que ya tenía abierto.
   */
  async resetPassword(
    id: string,
    body: ResetAdminPasswordBody,
    actorId: string,
  ): Promise<void> {
    if (id === actorId) {
      throw new ConflictError(
        'Para cambiar tu propia contraseña usá la opción de tu cuenta: ahí se te pide la actual.',
      );
    }

    await findOrFail(id);

    const passwordHash = await hashPassword(body.password);

    await prisma.$transaction(async (tx) => {
      await authRepository.lockAdminUsers(tx);
      await authRepository.setPasswordForOther(id, passwordHash, tx);
      await authRepository.revokeAllForAdmin(id, tx);
    });

    logger.warn({ actorId, adminId: id }, 'Contraseña restablecida por un administrador');
  },
};
