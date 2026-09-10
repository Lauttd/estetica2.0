// =============================================================================
// KAYA KALPA — Acceso a datos del panel
// =============================================================================

import { AdminRole, type Prisma } from '@prisma/client';
import { prisma, type Db } from '../../config/prisma';

/** Lo que hace falta para verificar un login. Incluye el hash, que no sale de acá. */
const CREDENTIALS_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  mustChangePassword: true,
  tokenVersion: true,
  passwordHash: true,
} as const;

/** Lo que se puede mostrar de un administrador. Sin hash ni contador de versión. */
const IDENTITY_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  mustChangePassword: true,
} as const;

/**
 * Lo que ve el panel de un usuario.
 *
 * Sin `passwordHash` y sin `tokenVersion`: el panel no los muestra y no los
 * necesita, y una consulta que no los trae no puede filtrarlos por descuido.
 */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export const authRepository = {
  /** Busca por correo para verificar un login. Normaliza a minúsculas. */
  async findCredentialsByEmail(email: string, db: Db = prisma) {
    return db.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: CREDENTIALS_SELECT,
    });
  },

  /**
   * Las credenciales de un administrador por id.
   *
   * Existe aparte de `findCredentialsByEmail` para el cambio de contraseña, que
   * conoce el id —viene del token— y no el correo. Buscar por correo obligaría a
   * leer primero la identidad para averiguarlo, y esa vuelta de más es la clase
   * de rodeo que después nadie entiende al leer el código.
   */
  async findCredentialsById(id: string, db: Db = prisma) {
    return db.adminUser.findUnique({
      where: { id },
      select: CREDENTIALS_SELECT,
    });
  },

  /** Un administrador por id, para el guarda y para `GET /me`. */
  async findIdentityById(id: string, db: Db = prisma) {
    return db.adminUser.findUnique({
      where: { id },
      select: { ...IDENTITY_SELECT, active: true, tokenVersion: true },
    });
  },

  /** Deja registrado el último ingreso. */
  async touchLastLogin(id: string, db: Db = prisma): Promise<void> {
    await db.adminUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  // ---------------------------------------------------------------------------
  // Sesiones
  // ---------------------------------------------------------------------------

  async createRefreshToken(
    data: {
      adminId: string;
      tokenHash: string;
      familyId: string;
      expiresAt: Date;
      userAgent?: string;
      ip?: string;
    },
    db: Db = prisma,
  ) {
    return db.adminRefreshToken.create({
      data: {
        adminId: data.adminId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
      },
      select: { id: true, familyId: true, expiresAt: true },
    });
  },

  /**
   * Busca una sesión por el hash de su token.
   *
   * Trae también el administrador, porque quien refresca necesita saber si sigue
   * activo y con qué rol: un token válido de alguien a quien se le dio de baja la
   * cuenta no puede seguir sirviendo para entrar.
   */
  async findSessionByTokenHash(tokenHash: string, db: Db = prisma) {
    return db.adminRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        adminId: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
        admin: { select: { ...IDENTITY_SELECT, active: true, tokenVersion: true } },
      },
    });
  },

  /**
   * Marca una sesión como revocada.
   *
   * El `where` incluye `revokedAt: null`, así que si dos pedidos revocan la misma
   * sesión a la vez uno solo modifica la fila. El otro recibe `count: 0`, que es
   * la señal de que llegó tarde.
   */
  async revokeSession(
    id: string,
    replacedById: string | null = null,
    db: Db = prisma,
  ) {
    const result = await db.adminRefreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById },
    });
    return result.count > 0;
  },

  /**
   * Revoca toda una familia de sesiones.
   *
   * Se usa cuando llega un token que ya estaba revocado. Ese caso solo tiene dos
   * explicaciones: alguien copió el token antes de que se rotara, o hay un error
   * de reloj. La primera es un robo, y la respuesta correcta es cortar todas las
   * sesiones derivadas de ese login —incluida la del ladrón— en vez de intentar
   * distinguir cuál de las dos es.
   */
  async revokeFamily(familyId: string, db: Db = prisma): Promise<number> {
    const result = await db.adminRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  /** Cierra todas las sesiones de un administrador. */
  async revokeAllForAdmin(adminId: string, db: Db = prisma): Promise<number> {
    const result = await db.adminRefreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  /**
   * Cambia la contraseña e invalida lo emitido.
   *
   * El `tokenVersion` se incrementa en la misma escritura: los tokens de acceso
   * que están dando vueltas traen el número viejo, así que el guarda los rechaza
   * en el acto. Es la única forma de cortar un acceso antes de que expire, dado
   * que un JWT no se puede retirar.
   */
  async updatePassword(adminId: string, passwordHash: string, db: Db = prisma) {
    return db.adminUser.update({
      where: { id: adminId },
      data: {
        passwordHash,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
      select: { tokenVersion: true },
    });
  },

  /** Borra las sesiones vencidas. Para una tarea de mantenimiento. */
  async deleteExpiredSessions(now: Date = new Date(), db: Db = prisma): Promise<number> {
    const result = await db.adminRefreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return result.count;
  },

  // ---------------------------------------------------------------------------
  // Panel: usuarios del sistema
  // ---------------------------------------------------------------------------

  /**
   * Serializa las modificaciones de usuarios.
   *
   * Hace falta por una carrera concreta, y no obvia: dos administradores que se
   * degradan **uno al otro** al mismo tiempo. Los dos pedidos se autenticaron
   * cuando los dos eran ADMIN activos, así que los dos pasan el guarda y los dos
   * pasan la comprobación de "no soy yo mismo".
   *
   *   · A degrada a B: quedan A (ADMIN) y B (STAFF).
   *   · B degrada a A: al releer con el lock ya tomado, cuenta los ADMIN activos
   *     que no son A. B acaba de dejar de serlo, así que son cero → lo rechaza.
   *
   * Sin el lock y sin la relectura, ese segundo pedido habría contado uno —el
   * estado de antes— y habría pasado, dejando el panel sin ningún administrador.
   * Eso no se arregla desde el panel: hay que entrar por `psql`.
   *
   * Es un solo lock para toda la tabla y no por fila: estas operaciones son de una
   * frecuencia ínfima —un alta o una baja cada tanto— y serializarlas no cuesta
   * nada. Mismo patrón que `bookings.repository.lockAgenda`: `xact`, así que se
   * libera solo al cerrar la transacción, incluso si falla.
   */
  async lockAdminUsers(tx: Db): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('kaya_admin_users'))`;
  },

  /** Todos los usuarios, activos e inactivos. Los inactivos son los que se dieron de baja. */
  async listAdmins(db: Db = prisma) {
    return db.adminUser.findMany({
      select: USER_SELECT,
      // Primero los activos, y dentro de cada grupo los administradores: es el
      // orden en que se lee la lista cuando alguien entra a revisar quién tiene
      // acceso.
      orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }],
    });
  },

  async findAdminById(id: string, db: Db = prisma) {
    return db.adminUser.findUnique({ where: { id }, select: USER_SELECT });
  },

  /**
   * Cuántos administradores ACTIVOS hay, sin contar a uno.
   *
   * Es la comprobación que evita dejar el sistema sin nadie que pueda administrar
   * usuarios y catálogo. Se excluye a quien se está por modificar porque el caso
   * que importa es "si yo salgo de ese grupo, ¿queda alguien?".
   */
  async countActiveAdminsExcept(id: string, db: Db = prisma): Promise<number> {
    return db.adminUser.count({
      where: { role: AdminRole.ADMIN, active: true, id: { not: id } },
    });
  },

  async createAdmin(
    data: {
      email: string;
      name: string;
      role: AdminRole;
      passwordHash: string;
      mustChangePassword: boolean;
    },
    db: Db = prisma,
  ) {
    return db.adminUser.create({ data, select: USER_SELECT });
  },

  async updateAdmin(
    id: string,
    data: { name?: string; role?: AdminRole; active?: boolean },
    db: Db = prisma,
  ) {
    return db.adminUser.update({ where: { id }, data, select: USER_SELECT });
  },

  /**
   * Invalida los tokens de acceso ya emitidos para un usuario.
   *
   * Se usa al dar de baja y al cambiarle la contraseña a otra persona. El guarda
   * compara el `tokenVersion` del token contra el de la base, así que
   * incrementarlo acá hace que el próximo pedido con un token viejo sea un 401,
   * sin esperar a que expire.
   */
  async bumpTokenVersion(id: string, db: Db = prisma) {
    return db.adminUser.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
  },

  /**
   * Le pone la contraseña a otra persona.
   *
   * Es distinto de `updatePassword`, que es el cambio propio y deja
   * `mustChangePassword` en false porque quien la escribió la eligió. Acá la
   * escribe un administrador y la otra persona la recibe: por eso siempre queda
   * marcada para cambiarla en el primer ingreso. Mientras tanto, esa contraseña
   * la conoce alguien más.
   */
  async setPasswordForOther(
    id: string,
    passwordHash: string,
    db: Db = prisma,
  ) {
    return db.adminUser.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
      },
      select: { tokenVersion: true },
    });
  },
};

/** Una fila de usuario tal como la devuelve el panel. */
export type AdminUserRow = Prisma.AdminUserGetPayload<{ select: typeof USER_SELECT }>;
