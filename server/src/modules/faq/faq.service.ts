// =============================================================================
// KAYA KALPA — Lógica del módulo de preguntas frecuentes
// =============================================================================

import { NotFoundError } from '../../utils/errors';
import { faqRepository, type FaqAdminRow } from './faq.repository';
import type { FaqAdminEntry, FaqItem } from './faq.types';
import type { CreateFaqBody, UpdateFaqBody } from './faq.validation';

function toAdminEntry(row: FaqAdminRow): FaqAdminEntry {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    sortOrder: row.sortOrder,
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const faqService = {
  async list(): Promise<FaqItem[]> {
    return faqRepository.listActive();
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  async listForAdmin(): Promise<FaqAdminEntry[]> {
    const rows = await faqRepository.listForAdmin();
    return rows.map(toAdminEntry);
  },

  async create(body: CreateFaqBody): Promise<FaqAdminEntry> {
    return toAdminEntry(
      await faqRepository.create({
        question: body.question,
        answer: body.answer,
        category: body.category ?? null,
        sortOrder: body.sortOrder ?? (await faqRepository.nextSortOrder()),
      }),
    );
  },

  async update(id: string, body: UpdateFaqBody): Promise<FaqAdminEntry> {
    if (!(await faqRepository.findById(id))) {
      throw new NotFoundError('No encontramos esa pregunta.');
    }

    const data: Parameters<typeof faqRepository.update>[1] = {};

    if (body.question !== undefined) data.question = body.question;
    if (body.answer !== undefined) data.answer = body.answer;
    if (body.category !== undefined) data.category = body.category ?? null;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.active !== undefined) data.active = body.active;

    return toAdminEntry(await faqRepository.update(id, data));
  },

  /**
   * "Borrar" una pregunta es desactivarla.
   *
   * Está en la misma política que el resto del panel: sacarla de la vista sin
   * perderla, porque una pregunta que se quitó porque "ya no aplica" suele volver
   * cuando cambia la temporada o el criterio de la estética.
   */
  async deactivate(id: string): Promise<FaqAdminEntry> {
    return faqService.update(id, { active: false });
  },
};
