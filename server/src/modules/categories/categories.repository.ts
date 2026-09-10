// =============================================================================
// KAYA KALPA — Acceso a datos de categorías
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  image: true,
  icon: true,
} satisfies Prisma.CategorySelect;

/** Lo que ve el panel: incluye lo inactivo y ambos conteos. */
const ADMIN_SELECT = {
  ...SUMMARY_SELECT,
  sortOrder: true,
  active: true,
  createdAt: true,
  _count: { select: { services: { where: { active: true } } } },
} satisfies Prisma.CategorySelect;

export type CategoryAdminRow = Prisma.CategoryGetPayload<{ select: typeof ADMIN_SELECT }>;

export const categoryRepository = {
  /**
   * Todas las categorías activas con la cantidad de servicios activos.
   *
   * El conteo se filtra en la base (`_count` con `where`) y no en memoria: contar
   * en JavaScript obligaría a traer todos los servicios, que es justo lo que el
   * catálogo evita al paginar.
   */
  async listActive() {
    return prisma.category.findMany({
      where: { active: true },
      select: { ...SUMMARY_SELECT, _count: { select: { services: { where: { active: true } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  /**
   * Todas, activas e inactivas.
   *
   * El conteo de servicios cuenta solo los ACTIVOS: es el número que importa
   * antes de desactivar una categoría, porque son los que se van a esconder del
   * catálogo si se la apaga.
   */
  async listAll(): Promise<CategoryAdminRow[]> {
    return prisma.category.findMany({
      select: ADMIN_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  async findById(id: string): Promise<CategoryAdminRow | null> {
    return prisma.category.findUnique({ where: { id }, select: ADMIN_SELECT });
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const found = await prisma.category.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return found !== null;
  },

  /**
   * ¿Existe esa categoría?
   *
   * Lo usa el módulo de servicios antes de crear o mover uno. Sin esta
   * comprobación, un `categoryId` inventado haría fallar la clave foránea y el
   * panel recibiría un 500 por un dato que puede corregir.
   */
  async exists(id: string): Promise<boolean> {
    const found = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    return found !== null;
  },

  /**
   * El próximo número de orden.
   *
   * Una categoría nueva va al final de la lista. Si se creara con `sortOrder: 0`
   * aparecería primera, delante de las siete que la estética ya ordenó a mano.
   */
  async nextSortOrder(): Promise<number> {
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    return (last._max.sortOrder ?? -1) + 1;
  },

  async create(data: {
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    icon: string | null;
    sortOrder: number;
  }) {
    return prisma.category.create({ data, select: ADMIN_SELECT });
  },

  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<CategoryAdminRow> {
    return prisma.category.update({ where: { id }, data, select: ADMIN_SELECT });
  },
};
