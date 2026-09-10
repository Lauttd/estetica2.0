// =============================================================================
// KAYA KALPA — Lógica del módulo de profesionales
// =============================================================================

import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { parseDateOnly, todayInSalon } from '../../utils/datetime';
import { availableSlug } from '../../utils/slug';
import { bookingRepository } from '../bookings/bookings.repository';
import { rethrowUniqueViolation } from '../shared/persistence';
import {
  professionalRepository,
  type ProfessionalAdminRow,
} from './professionals.repository';
import type { ProfessionalAdminEntry, ProfessionalSummary } from './professionals.types';
import type { CreateProfessionalBody, UpdateProfessionalBody } from './professionals.validation';

/**
 * Los campos que alcanzan para armar la ficha pública.
 *
 * Se declara como el mínimo necesario en vez de usar `ProfessionalAdminRow` para
 * que sirva también con las filas del listado público, que traen menos columnas.
 * Tipar de más obligaría a traer del panel datos que el catálogo no usa.
 */
type ProfessionalBaseRow = Pick<
  ProfessionalAdminRow,
  'id' | 'slug' | 'name' | 'title' | 'bio' | 'avatar' | 'color' | 'services'
>;

/** La relación viene como `{ service }`; se aplana para el frontend. */
function toSummary(row: ProfessionalBaseRow): ProfessionalSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    bio: row.bio,
    avatar: row.avatar,
    color: row.color,
    services: row.services.map((link) => link.service),
  };
}

function toAdminEntry(row: ProfessionalAdminRow): ProfessionalAdminEntry {
  return {
    ...toSummary(row),
    slotStepMin: row.slotStepMin,
    bufferMin: row.bufferMin,
    minLeadMin: row.minLeadMin,
    maxAdvanceDays: row.maxAdvanceDays,
    sortOrder: row.sortOrder,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const DUPLICATE_MESSAGE = {
  slug: 'Ya existe un profesional con ese nombre.',
};

export const professionalsService = {
  async list(serviceIds: string[] = []): Promise<ProfessionalSummary[]> {
    const rows = await professionalRepository.listActive(serviceIds);
    return rows.map(toSummary);
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  async listForAdmin(): Promise<ProfessionalAdminEntry[]> {
    const rows = await professionalRepository.listForAdmin();
    return rows.map(toAdminEntry);
  },

  async getByIdForAdmin(id: string): Promise<ProfessionalAdminEntry> {
    const row = await professionalRepository.findByIdForAdmin(id);

    if (!row) {
      throw new NotFoundError('No encontramos ese profesional.');
    }

    return toAdminEntry(row);
  },

  async create(body: CreateProfessionalBody): Promise<ProfessionalAdminEntry> {
    const slug = await availableSlug(body.name, (candidate) =>
      professionalRepository.slugExists(candidate),
    );

    try {
      const created = await professionalRepository.create({
        name: body.name,
        slug,
        title: body.title ?? null,
        bio: body.bio ?? null,
        avatar: body.avatar ?? null,
        color: body.color ?? undefined,
        sortOrder: body.sortOrder ?? (await professionalRepository.nextSortOrder()),
        ...(body.slotStepMin !== undefined ? { slotStepMin: body.slotStepMin } : {}),
        ...(body.bufferMin !== undefined ? { bufferMin: body.bufferMin } : {}),
        ...(body.minLeadMin !== undefined ? { minLeadMin: body.minLeadMin } : {}),
        ...(body.maxAdvanceDays !== undefined
          ? { maxAdvanceDays: body.maxAdvanceDays }
          : {}),
      });

      return toAdminEntry(created);
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  async update(id: string, body: UpdateProfessionalBody): Promise<ProfessionalAdminEntry> {
    const current = await professionalRepository.findStateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese profesional.');
    }

    const data: Parameters<typeof professionalRepository.update>[1] = {};

    if (body.name !== undefined) {
      data.name = body.name;
      data.slug = await availableSlug(body.name, (candidate) =>
        professionalRepository.slugExists(candidate, id),
      );
    }
    if (body.title !== undefined) data.title = body.title ?? null;
    if (body.bio !== undefined) data.bio = body.bio ?? null;
    if (body.avatar !== undefined) data.avatar = body.avatar ?? null;
    if (body.color !== undefined) data.color = body.color;
    if (body.slotStepMin !== undefined) data.slotStepMin = body.slotStepMin;
    if (body.bufferMin !== undefined) data.bufferMin = body.bufferMin;
    if (body.minLeadMin !== undefined) data.minLeadMin = body.minLeadMin;
    if (body.maxAdvanceDays !== undefined) data.maxAdvanceDays = body.maxAdvanceDays;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.active !== undefined) data.active = body.active;

    try {
      return toAdminEntry(await professionalRepository.update(id, data));
    } catch (error) {
      rethrowUniqueViolation(error, DUPLICATE_MESSAGE);
    }
  },

  /**
   * Reemplaza la lista de servicios que puede realizar.
   *
   * Se comprueba que TODOS existan antes de escribir: si se mandara un
   * identificador inventado, el alta de la tabla intermedia fallaría por la clave
   * foránea y el panel recibiría un 500 por un dato que puede corregir.
   */
  async replaceServices(id: string, serviceIds: string[]): Promise<ProfessionalAdminEntry> {
    if (!(await professionalRepository.findStateById(id))) {
      throw new NotFoundError('No encontramos ese profesional.');
    }

    if (serviceIds.length > 0) {
      const existing = await professionalRepository.countExistingServices(serviceIds);

      if (existing !== serviceIds.length) {
        throw new BadRequestError(
          'Alguno de los servicios elegidos ya no existe. Actualizá la lista y volvé a intentar.',
        );
      }
    }

    await professionalRepository.replaceServices(id, serviceIds);
    return professionalsService.getByIdForAdmin(id);
  },

  /**
   * "Borrar" un profesional es desactivarlo, y solo si no tiene agenda.
   *
   * Los turnos ya tomados no se cancelan solos: desactivar a alguien con turnos
   * por delante deja a esos clientes con una reserva que nadie va a atender. La
   * comprobación convierte ese problema silencioso en un mensaje que dice
   * exactamente cuántos turnos hay que resolver primero.
   */
  async deactivate(id: string): Promise<ProfessionalAdminEntry> {
    const current = await professionalRepository.findStateById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese profesional.');
    }

    const upcoming = await bookingRepository.countUpcoming(id, parseDateOnly(todayInSalon()));

    if (upcoming > 0) {
      throw new ConflictError(
        `${current.name} tiene ${upcoming} turno(s) por delante. Reasignalos o cancelalos antes de desactivarlo.`,
      );
    }

    return toAdminEntry(await professionalRepository.update(id, { active: false }));
  },
};
