// =============================================================================
// KAYA KALPA — Lógica del catálogo de servicios
// =============================================================================
// Traduce lo que devuelve la base a lo que sale por la API. Es el único lugar
// donde se decide esa traducción, así que las reglas viven acá y no repartidas
// entre controladores.
// =============================================================================

import { NotFoundError } from '../../utils/errors';
import { availableSlug } from '../../utils/slug';
import { categoryRepository } from '../categories/categories.repository';
import { rethrowUniqueViolation } from '../shared/persistence';
import {
  serviceRepository,
  type ServiceAdminRow,
  type ServiceDetailRow,
  type ServiceSummaryRow,
} from './services.repository';
import type {
  ListServicesAdminQuery,
  ListServicesQuery,
  ServiceAdminEntry,
  ServiceDetail,
  ServiceSummary,
} from './services.types';
import type { CreateServiceBody, UpdateServiceBody } from './services.validation';

/**
 * Un servicio se puede reservar online si la estética lo habilitó Y tiene
 * duración cargada. Sin duración no hay forma de saber cuánto ocupa en la
 * agenda, y el prompt §41 prohíbe inventarla.
 */
function isBookableOnline(bookable: boolean, _durationMin: number | null): boolean {
  return bookable;
}

/**
 * Un `null` en el precio significa "a consultar", nunca "gratis". Se expone como
 * una bandera explícita para que el cliente no tenga que interpretar el nulo ni
 * decidir por su cuenta qué texto mostrar.
 */
function toSummary(row: ServiceSummaryRow): ServiceSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    priceCents: row.priceCents,
    priceOnRequest: row.priceCents === null,
    currency: row.currency,
    durationMin: row.durationMin,
    bookable: row.bookable,
    bookableOnline: isBookableOnline(row.bookable, row.durationMin),
    image: row.image,
    category: row.category,
  };
}

function toAdminEntry(row: ServiceAdminRow): ServiceAdminEntry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.categoryId,
    category: row.category,
    shortDescription: row.shortDescription,
    description: row.description,
    benefits: row.benefits,
    recommendations: row.recommendations,
    extraInfo: row.extraInfo,
    durationMin: row.durationMin,
    priceCents: row.priceCents,
    currency: row.currency,
    image: row.image,
    subgroup: row.subgroup,
    bookable: row.bookable,
    needsReview: row.needsReview,
    featured: row.featured,
    sortOrder: row.sortOrder,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
    bookableOnline: isBookableOnline(row.bookable, row.durationMin),
  };
}

function toDetail(
  row: ServiceDetailRow,
  professionals: Array<{ id: string; slug: string; name: string }>,
): ServiceDetail {
  return {
    ...toSummary(row),
    description: row.description,
    benefits: row.benefits,
    recommendations: row.recommendations,
    extraInfo: row.extraInfo,
    subgroup: row.subgroup,
    featured: row.featured,
    professionals,
  };
}

const DUPLICATE_MESSAGE = {
  slug: 'Ya existe un servicio con ese nombre.',
};

/** El servicio tiene que existir; si no, 404 en vez de un fallo de clave foránea. */
async function assertCategory(categoryId: string): Promise<void> {
  if (!(await categoryRepository.exists(categoryId))) {
    throw new NotFoundError('No encontramos esa categoría.');
  }
}

export const servicesService = {
  async list(query: ListServicesQuery) {
    const { items, total } = await serviceRepository.list(query);
    return { items: items.map(toSummary), total };
  },

  async getBySlug(slug: string): Promise<ServiceDetail> {
    const row = await serviceRepository.findBySlug(slug);

    if (!row) {
      // El mensaje no distingue "no existe" de "está desactivado" a propósito:
      // decir cuál de las dos es no aporta nada al visitante.
      throw new NotFoundError('No encontramos ese servicio.');
    }

    // Se consulta aparte y no con un `include` porque los profesionales solo
    // hacen falta en el detalle: traerlos en cada tarjeta de la grilla sería
    // trabajo desperdiciado en la pantalla más visitada.
    const professionals = row.bookable
      ? await serviceRepository.findProfessionals(row.id)
      : [];

    return toDetail(row, professionals);
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  async listForAdmin(query: ListServicesAdminQuery) {
    const { items, total } = await serviceRepository.listForAdmin(query);
    return { items: items.map(toAdminEntry), total };
  },

  async getByIdForAdmin(id: string): Promise<ServiceAdminEntry> {
    const row = await serviceRepository.findByIdForAdmin(id);

    if (!row) {
      throw new NotFoundError('No encontramos ese servicio.');
    }

    return toAdminEntry(row);
  },

  async create(body: CreateServiceBody): Promise<ServiceAdminEntry> {
    await assertCategory(body.categoryId);

    const slug = await availableSlug(body.name, (candidate) =>
      serviceRepository.slugExists(candidate),
    );

    try {
      const created = await serviceRepository.create({
        categoryId: body.categoryId,
        slug,
        name: body.name,
        shortDescription: body.shortDescription,
        description: body.description ?? null,
        benefits: body.benefits ?? [],
        recommendations: body.recommendations ?? null,
        extraInfo: body.extraInfo ?? null,
        durationMin: body.durationMin ?? null,
        priceCents: body.priceCents ?? null,
        image: body.image ?? null,
        subgroup: body.subgroup ?? null,
        bookable: body.bookable ?? true,
        featured: body.featured ?? false,
        sortOrder: body.sortOrder ?? (await serviceRepository.nextSortOrder(body.categoryId)),
      });

      return toAdminEntry(created);
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  async update(id: string, body: UpdateServiceBody): Promise<ServiceAdminEntry> {
    const current = await serviceRepository.findStateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese servicio.');
    }

    if (body.categoryId !== undefined && body.categoryId !== current.categoryId) {
      await assertCategory(body.categoryId);
    }

    const data: Parameters<typeof serviceRepository.update>[1] = {};

    if (body.name !== undefined) {
      data.name = body.name;
      data.slug = await availableSlug(body.name, (candidate) =>
        serviceRepository.slugExists(candidate, id),
      );
    }
    if (body.categoryId !== undefined) data.category = { connect: { id: body.categoryId } };
    if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
    // Los opcionales se asignan a `null` y no se omiten: en un panel, vaciar un
    // campo es una edición tan válida como completarlo, y omitirlo dejaría el
    // valor viejo sin que nadie entienda por qué.
    if (body.description !== undefined) data.description = body.description ?? null;
    if (body.benefits !== undefined) data.benefits = body.benefits;
    if (body.recommendations !== undefined) data.recommendations = body.recommendations ?? null;
    if (body.extraInfo !== undefined) data.extraInfo = body.extraInfo ?? null;
    if (body.durationMin !== undefined) data.durationMin = body.durationMin ?? null;
    if (body.priceCents !== undefined) data.priceCents = body.priceCents ?? null;
    if (body.image !== undefined) data.image = body.image ?? null;
    if (body.subgroup !== undefined) data.subgroup = body.subgroup ?? null;
    if (body.bookable !== undefined) data.bookable = body.bookable;
    if (body.needsReview !== undefined) data.needsReview = body.needsReview;
    if (body.featured !== undefined) data.featured = body.featured;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.active !== undefined) data.active = body.active;

    try {
      return toAdminEntry(await serviceRepository.update(id, data));
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  /**
   * Cambia solo el precio.
   *
   * Existe aparte del `PATCH` general porque actualizar la lista de precios es la
   * tarea más repetida del panel —la estética la ajusta seguido— y mandar el
   * servicio entero para tocar un número invita a pisar sin querer algún otro
   * campo que se había editado en otra pantalla.
   */
  async updatePrice(
    id: string,
    body: { priceCents: number | null },
  ): Promise<ServiceAdminEntry> {
    const current = await serviceRepository.findStateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese servicio.');
    }

    return toAdminEntry(
      await serviceRepository.update(id, { priceCents: body.priceCents }),
    );
  },

  /**
   * "Borrar" un servicio es desactivarlo.
   *
   * Un borrado real es imposible en cuanto el servicio tenga un turno asociado
   * —`booking_services` lo referencia con `onDelete: Restrict`, justamente para
   * que el historial no se rompa—. Desactivar lo saca del catálogo, lo deja
   * visible en el panel y se revierte con un clic.
   */
  async deactivate(id: string): Promise<ServiceAdminEntry> {
    const current = await serviceRepository.findStateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese servicio.');
    }

    return toAdminEntry(await serviceRepository.update(id, { active: false }));
  },
};
