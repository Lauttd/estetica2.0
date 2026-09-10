// =============================================================================
// KAYA KALPA — Lógica del módulo de categorías
// =============================================================================

import { ConflictError, NotFoundError } from '../../utils/errors';
import { availableSlug } from '../../utils/slug';
import { rethrowUniqueViolation } from '../shared/persistence';
import { categoryRepository, type CategoryAdminRow } from './categories.repository';
import type { CategoryAdminSummary, CategorySummary } from './categories.types';
import type { CreateCategoryBody, UpdateCategoryBody } from './categories.validation';

function toSummary(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  _count: { services: number };
}): CategorySummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    image: row.image,
    icon: row.icon,
    serviceCount: row._count.services,
  };
}

function toAdminSummary(row: CategoryAdminRow): CategoryAdminSummary {
  return {
    ...toSummary(row),
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

/** Traduce el choque del índice único del slug a algo que se entienda. */
const DUPLICATE_MESSAGE = {
  slug: 'Ya existe una categoría con ese nombre.',
};

export const categoriesService = {
  async list(): Promise<CategorySummary[]> {
    const rows = await categoryRepository.listActive();
    return rows.map(toSummary);
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  async listAll(): Promise<CategoryAdminSummary[]> {
    const rows = await categoryRepository.listAll();
    return rows.map(toAdminSummary);
  },

  async getById(id: string): Promise<CategoryAdminSummary> {
    const row = await categoryRepository.findById(id);

    if (!row) {
      throw new NotFoundError('No encontramos esa categoría.');
    }

    return toAdminSummary(row);
  },

  async create(body: CreateCategoryBody): Promise<CategoryAdminSummary> {
    // El slug se deriva del nombre y se corrige solo si está tomado. Ver
    // `availableSlug`: es lo que permite que "Manos" y "Manos y pies" convivan
    // sin que quien carga el catálogo tenga que pensar en URLs.
    const slug = await availableSlug(body.name, (candidate) =>
      categoryRepository.slugExists(candidate),
    );

    try {
      const created = await categoryRepository.create({
        name: body.name,
        slug,
        description: body.description ?? null,
        image: body.image ?? null,
        icon: body.icon ?? null,
        sortOrder: body.sortOrder ?? (await categoryRepository.nextSortOrder()),
      });

      return toAdminSummary(created);
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  async update(id: string, body: UpdateCategoryBody): Promise<CategoryAdminSummary> {
    const current = await categoryRepository.findById(id);

    if (!current) {
      throw new NotFoundError('No encontramos esa categoría.');
    }

    // Desactivar una categoría esconde del catálogo TODOS sus servicios activos,
    // porque la consulta pública filtra por `category.active`. Es un clic que
    // puede vaciar la web sin que nadie lo note, así que se frena acá y se le
    // dice a quien lo intenta qué tiene que hacer primero.
    if (body.active === false && current.active && current._count.services > 0) {
      throw new ConflictError(
        `Esa categoría todavía tiene ${current._count.services} servicio(s) activo(s). Desactivá o movelos primero.`,
      );
    }

    const data: Parameters<typeof categoryRepository.update>[1] = {};

    if (body.name !== undefined) {
      data.name = body.name;
      data.slug = await availableSlug(body.name, (candidate) =>
        categoryRepository.slugExists(candidate, id),
      );
    }
    if (body.description !== undefined) data.description = body.description;
    if (body.image !== undefined) data.image = body.image;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.active !== undefined) data.active = body.active;

    try {
      return toAdminSummary(await categoryRepository.update(id, data));
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  /**
   * "Borrar" una categoría es desactivarla.
   *
   * Un borrado real fallaría por la clave foránea en cuanto tenga un servicio
   * asociado —y si no lo tiene, borrar una fila que alguien puede volver a
   * querer no aporta nada—. Desactivar la saca del catálogo, la deja visible en
   * el panel y se revierte con un clic.
   */
  async deactivate(id: string): Promise<CategoryAdminSummary> {
    return categoriesService.update(id, { active: false });
  },
};
