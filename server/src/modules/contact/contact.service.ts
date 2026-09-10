// =============================================================================
// KAYA KALPA — Lógica del módulo de contacto
// =============================================================================

import type { ContactStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/errors';
import { contactRepository } from './contact.repository';
import type { ContactMessageSummary, ContactSubmission } from './contact.types';
import type {
  CreateContactMessageBody,
  ListContactMessagesQuery,
  UpdateContactMessageBody,
} from './contact.validation';

/** Lo que se le muestra a quien acaba de escribir. */
const CONFIRMATION_MESSAGE =
  '¡Gracias por escribirnos! Ya recibimos tu mensaje y te vamos a responder a la brevedad.';

type MessageRow = Awaited<ReturnType<typeof contactRepository.findById>>;

function toSummary(row: NonNullable<MessageRow>): ContactMessageSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    // El texto viaja entero y no recortado: el panel lo muestra completo al
    // abrirlo, y recortar acá obligaría a una segunda consulta para leerlo.
    message: row.message,
    status: row.status,
    readAt: row.readAt?.toISOString() ?? null,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Qué fechas corresponden al nuevo estado.
 *
 * El `??` conserva la fecha original cuando ya estaba puesta, y eso es lo que
 * hace que el dato sirva: si volver a marcar un mensaje como leído moviera el
 * `readAt`, dejaría de poder medirse cuánto tardó la estética en abrirlo.
 *
 * Archivar o volver a "nuevo" no toca ninguna fecha: son cambios de bandeja, no
 * hitos de atención.
 */
function timestampsFor(
  status: ContactStatus,
  current: { readAt: Date | null; repliedAt: Date | null },
): { readAt?: Date; repliedAt?: Date } {
  const now = new Date();

  if (status === 'READ') {
    return { readAt: current.readAt ?? now };
  }

  if (status === 'REPLIED') {
    // Responder implica haber leído: sin esto, un mensaje contestado desde el
    // celular sin abrirlo en el panel quedaría con `readAt` nulo.
    return {
      readAt: current.readAt ?? now,
      repliedAt: current.repliedAt ?? now,
    };
  }

  return {};
}

export const contactService = {
  /** Recibe el formulario público. */
  async submit(
    input: CreateContactMessageBody,
    meta: { ip?: string; userAgent?: string },
  ): Promise<ContactSubmission> {
    await contactRepository.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { message: CONFIRMATION_MESSAGE };
  },

  async list(query: ListContactMessagesQuery) {
    const { items, total } = await contactRepository.list(query);
    return { items: items.map(toSummary), total };
  },

  async countUnread(): Promise<number> {
    return contactRepository.countUnread();
  },

  async updateStatus(
    id: string,
    input: UpdateContactMessageBody,
  ): Promise<ContactMessageSummary> {
    const current = await contactRepository.findById(id);

    if (!current) {
      throw new NotFoundError('No encontramos ese mensaje.');
    }

    const updated = await contactRepository.updateStatus(id, {
      status: input.status,
      ...timestampsFor(input.status, current),
    });

    return toSummary(updated);
  },
};
