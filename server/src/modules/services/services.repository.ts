// =============================================================================
// KAYA KALPA — Acceso a datos de servicios
// =============================================================================
// Es la única capa que habla con Prisma para los servicios. Los `select` son
// explícitos a propósito: así una columna nueva en la base no aparece sola en la
// respuesta de la API sin que nadie lo decida.
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../config/prisma';
import type { ListServicesAdminQuery, ListServicesQuery } from './services.types';

/** Campos de la tarjeta. Se repite en las consultas de lista y de detalle. */
const SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  priceCents: true,
  currency: true,
  durationMin: true,
  bookable: true,
  image: true,
  category: { select: { id: true, slug: true, name: true } },
} satisfies Prisma.ServiceSelect;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  description: true,
  benefits: true,
  recommendations: true,
  extraInfo: true,
  subgroup: true,
  featured: true,
  needsReview: true,
} satisfies Prisma.ServiceSelect;

export type ServiceSummaryRow = Prisma.ServiceGetPayload<{
  select: typeof SUMMARY_SELECT;
}>;

export type ServiceDetailRow = Prisma.ServiceGetPayload<{
  select: typeof DETAIL_SELECT;
}>;

/**
 * Lo que ve el panel: todo lo editable, incluidas las columnas que el catálogo
 * público no muestra (`active`, `sortOrder`, `categoryId`, `updatedAt`).
 */
const ADMIN_SELECT = {
  id: true,
  slug: true,
  name: true,
  categoryId: true,
  category: { select: { id: true, slug: true, name: true, active: true } },
  shortDescription: true,
  description: true,
  benefits: true,
  recommendations: true,
  extraInfo: true,
  durationMin: true,
  priceCents: true,
  currency: true,
  image: true,
  subgroup: true,
  bookable: true,
  needsReview: true,
  featured: true,
  sortOrder: true,
  active: true,
  updatedAt: true,
} satisfies Prisma.ServiceSelect;

export type ServiceAdminRow = Prisma.ServiceGetPayload<{ select: typeof ADMIN_SELECT }>;

/**
 * Arma el `where` a partir de los filtros.
 *
 * Solo se muestran servicios activos y de categorías activas: desactivar una
 * categoría tiene que sacar del catálogo todo lo que contiene, sin tener que
 * desactivar cada servicio uno por uno.
 */
function buildWhere(query: ListServicesQuery): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {
    active: true,
    category: { active: true },
  };

  if (query.category) {
    where.category = { active: true, slug: query.category };
  }

  if (query.featured !== undefined) {
    where.featured = query.featured;
  }

  if (query.bookable !== undefined) {
    where.bookable = query.bookable;
  }

  if (query.q) {
    // `mode: 'insensitive'` para que "maderoterapia" encuentre "Maderoterapia".
    // Se busca también en la descripción corta: quien escribe "pestañas" espera
    // encontrar el lifting aunque la palabra no esté en el nombre.
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { shortDescription: { contains: query.q, mode: 'insensitive' } },
      { subgroup: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * El orden del catálogo: primero por categoría, después por el orden definido
 * dentro de cada una. Es el mismo orden que ve la estética en su lista de
 * precios, y hace que la grilla no se reacomode entre pedidos.
 */
const CATALOG_ORDER: Prisma.ServiceOrderByWithRelationInput[] = [
  { category: { sortOrder: 'asc' } },
  { sortOrder: 'asc' },
  { name: 'asc' },
];

export const serviceRepository = {
  async list(
    query: ListServicesQuery,
  ): Promise<{ items: ServiceSummaryRow[]; total: number }> {
    const where = buildWhere(query);

    // La consulta y el conteo van en una transacción para que el total
    // corresponda exactamente a la página que se devuelve, aunque alguien
    // modifique el catálogo en el medio.
    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        where,
        select: SUMMARY_SELECT,
        orderBy: CATALOG_ORDER,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.service.count({ where }),
    ]);

    return { items, total };
  },

  async findBySlug(slug: string): Promise<ServiceDetailRow | null> {
    return prisma.service.findFirst({
      where: { slug, active: true, category: { active: true } },
      select: DETAIL_SELECT,
    });
  },

  /** Profesionales activos habilitados para un servicio. */
  async findProfessionals(serviceId: string) {
    const links = await prisma.professionalService.findMany({
      where: { serviceId, professional: { active: true } },
      select: {
        professional: {
          select: { id: true, slug: true, name: true },
        },
      },
      orderBy: { professional: { sortOrder: 'asc' } },
    });
    return links.map((link) => link.professional);
  },

  /**
   * Servicios por id, con la duración y el precio que necesita el sistema de
   * turnos. Es la consulta que usa la reserva para calcular el total y validar
   * que los servicios existan y se puedan agendar.
   *
   * Acepta una transacción porque el alta de un turno guarda una copia del precio
   * y la duración de cada servicio: esa lectura tiene que ser la misma que la del
   * resto de la operación, no la de un instante anterior.
   */
  async findManyForBooking(ids: string[], db: Db = prisma) {
    return db.service.findMany({
      where: { id: { in: ids }, active: true, category: { active: true } },
      select: {
        id: true,
        name: true,
        durationMin: true,
        priceCents: true,
        bookable: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------
  // El panel necesita ver lo que el catálogo esconde: servicios desactivados, de
  // categorías desactivadas, y los que quedaron marcados para revisar porque les
  // falta el precio o la duración.

  /**
   * Servicios para el panel, sin filtrar por estado salvo que se pida.
   *
   * El `where` del catálogo público fuerza `active: true` y `category.active`, y
   * esos dos filtros son exactamente los que no pueden aplicarse acá: un servicio
   * desactivado tiene que poder encontrarse para volver a activarlo.
   */
  async listForAdmin(query: ListServicesAdminQuery) {
    const where: Prisma.ServiceWhereInput = {};

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.active !== undefined) where.active = query.active;
    if (query.needsReview !== undefined) where.needsReview = query.needsReview;
    if (query.bookable !== undefined) where.bookable = query.bookable;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { shortDescription: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.service.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.service.count({ where }),
    ]);

    return { items, total };
  },

  async findByIdForAdmin(id: string): Promise<ServiceAdminRow | null> {
    return prisma.service.findUnique({ where: { id }, select: ADMIN_SELECT });
  },

  /** Solo el estado y la categoría: lo mínimo para validar antes de escribir. */
  async findStateById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      select: { id: true, active: true, categoryId: true, priceCents: true },
    });
  },

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const found = await prisma.service.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return found !== null;
  },

  async nextSortOrder(categoryId: string): Promise<number> {
    const last = await prisma.service.aggregate({
      where: { categoryId },
      _max: { sortOrder: true },
    });
    return (last._max.sortOrder ?? -1) + 1;
  },

  /** Cuántos servicios activos tiene una categoría. */
  async countActiveInCategory(categoryId: string): Promise<number> {
    return prisma.service.count({ where: { categoryId, active: true } });
  },

  async create(data: Prisma.ServiceUncheckedCreateInput): Promise<ServiceAdminRow> {
    return prisma.service.create({ data, select: ADMIN_SELECT });
  },

  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<ServiceAdminRow> {
    return prisma.service.update({ where: { id }, data, select: ADMIN_SELECT });
  },
};
