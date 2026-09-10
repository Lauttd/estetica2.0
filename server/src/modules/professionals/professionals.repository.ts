// =============================================================================
// KAYA KALPA — Acceso a datos de profesionales
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  title: true,
  bio: true,
  avatar: true,
  color: true,
  services: {
    select: { service: { select: { id: true, slug: true, name: true } } },
  },
} satisfies Prisma.ProfessionalSelect;

/**
 * Lo que ve el panel: lo de la ficha pública más las reglas de agenda y el
 * estado, que es lo que se configura desde ahí.
 */
const ADMIN_SELECT = {
  ...SUMMARY_SELECT,
  slotStepMin: true,
  bufferMin: true,
  minLeadMin: true,
  maxAdvanceDays: true,
  sortOrder: true,
  active: true,
  updatedAt: true,
} satisfies Prisma.ProfessionalSelect;

export type ProfessionalAdminRow = Prisma.ProfessionalGetPayload<{
  select: typeof ADMIN_SELECT;
}>;

export const professionalRepository = {
  /**
   * Profesionales activos, opcionalmente los que pueden realizar TODOS los
   * servicios indicados.
   *
   * El "todos" se arma con un `AND` de condiciones y no con un `in`: un `in`
   * devolvería también a quien hace solo uno de los servicios elegidos, y el
   * paso siguiente del asistente de turnos ofrecería un profesional que no puede
   * completar el turno.
   *
   * Se filtra además por servicios y categorías activas: si un servicio salió del
   * catálogo, nadie debería seguir apareciendo por poder hacerlo.
   */
  async listActive(serviceIds: string[] = []) {
    const serviceFilter: Prisma.ProfessionalWhereInput[] = serviceIds.map((serviceId) => ({
      services: {
        some: {
          serviceId,
          service: { active: true, category: { active: true } },
        },
      },
    }));

    return prisma.professional.findMany({
      where: {
        active: true,
        ...(serviceFilter.length > 0 ? { AND: serviceFilter } : {}),
      },
      select: SUMMARY_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  /**
   * Todos los profesionales, activos e inactivos, con sus reglas de agenda.
   *
   * Las reglas (`bufferMin`, `minLeadMin`, …) sí se devuelven acá, a diferencia
   * de la consulta pública: son justamente lo que se configura desde el panel.
   */
  async listForAdmin(): Promise<ProfessionalAdminRow[]> {
    return prisma.professional.findMany({
      select: ADMIN_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findByIdForAdmin(id: string): Promise<ProfessionalAdminRow | null> {
    return prisma.professional.findUnique({ where: { id }, select: ADMIN_SELECT });
  },

  async findStateById(id: string) {
    return prisma.professional.findUnique({
      where: { id },
      select: { id: true, active: true, name: true },
    });
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const found = await prisma.professional.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return found !== null;
  },

  async nextSortOrder(): Promise<number> {
    const last = await prisma.professional.aggregate({ _max: { sortOrder: true } });
    return (last._max.sortOrder ?? -1) + 1;
  },

  async create(data: Prisma.ProfessionalUncheckedCreateInput): Promise<ProfessionalAdminRow> {
    return prisma.professional.create({ data, select: ADMIN_SELECT });
  },

  async update(id: string, data: Prisma.ProfessionalUpdateInput): Promise<ProfessionalAdminRow> {
    return prisma.professional.update({ where: { id }, data, select: ADMIN_SELECT });
  },

  /** Cuántos de estos identificadores corresponden a un servicio real. */
  async countExistingServices(ids: string[]): Promise<number> {
    return prisma.service.count({ where: { id: { in: ids } } });
  },

  /**
   * Reemplaza los servicios que puede realizar un profesional.
   *
   * Se reemplaza el conjunto entero y no se agrega ni quita de a uno porque así
   * lo hace el panel: una lista de casillas que se marca y se guarda. Mandar el
   * conjunto final evita que dos pestañas abiertas se pisen agregando cada una
   * "su" servicio a una lista que la otra ya cambió.
   *
   * Las dos operaciones van en una transacción: si fallara el alta después del
   * borrado, el profesional quedaría sin ningún servicio y no podría tomar turnos
   * de nada.
   */
  async replaceServices(professionalId: string, serviceIds: string[]): Promise<void> {
    await prisma.$transaction([
      prisma.professionalService.deleteMany({ where: { professionalId } }),
      prisma.professionalService.createMany({
        data: serviceIds.map((serviceId) => ({ professionalId, serviceId })),
        // Un identificador repetido en la lista haría fallar el alta por la clave
        // compuesta. El esquema de validación ya los descarta, pero saltear en
        // vez de fallar es más barato que confiar en que siempre se validó.
        skipDuplicates: true,
      }),
    ]);
  },
};
