// =============================================================================
// KAYA KALPA — Acceso a datos de preguntas frecuentes
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

/**
 * El cliente generado por Prisma nombra este modelo `fAQ`, porque la sigla
 * completa en mayúsculas se convierte así. Es feo pero es el nombre real: no hay
 * un `prisma.faq`.
 */
const ADMIN_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
  sortOrder: true,
  active: true,
  updatedAt: true,
} satisfies Prisma.FAQSelect;

export type FaqAdminRow = Prisma.FAQGetPayload<{ select: typeof ADMIN_SELECT }>;

export const faqRepository = {
  async listActive() {
    return prisma.fAQ.findMany({
      where: { active: true },
      select: { id: true, question: true, answer: true, category: true },
      // Se ordena por categoría y después por el orden manual, para que las
      // preguntas del mismo tema queden juntas sin depender de que quien las
      // cargue acierte con la numeración global.
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  /** Todas, incluidas las desactivadas. Sin el orden por categoría del público. */
  async listForAdmin(): Promise<FaqAdminRow[]> {
    return prisma.fAQ.findMany({
      select: ADMIN_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }],
    });
  },

  async findById(id: string): Promise<FaqAdminRow | null> {
    return prisma.fAQ.findUnique({ where: { id }, select: ADMIN_SELECT });
  },

  async nextSortOrder(): Promise<number> {
    const last = await prisma.fAQ.aggregate({ _max: { sortOrder: true } });
    return (last._max.sortOrder ?? -1) + 1;
  },

  async create(data: Prisma.FAQUncheckedCreateInput): Promise<FaqAdminRow> {
    return prisma.fAQ.create({ data, select: ADMIN_SELECT });
  },

  async update(id: string, data: Prisma.FAQUpdateInput): Promise<FaqAdminRow> {
    return prisma.fAQ.update({ where: { id }, data, select: ADMIN_SELECT });
  },
};
