// =============================================================================
// KAYA KALPA — Acceso a datos de mensajes de contacto
// =============================================================================

import type { ContactStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { ListContactMessagesQuery } from './contact.validation';

const SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  subject: true,
  message: true,
  status: true,
  readAt: true,
  repliedAt: true,
  createdAt: true,
} satisfies Prisma.ContactMessageSelect;

function buildWhere(query: ListContactMessagesQuery): Prisma.ContactMessageWhereInput {
  const where: Prisma.ContactMessageWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  // Es el filtro con el que el panel saluda al entrar: "tenés 3 mensajes sin
  // leer". Se traduce a `status: NEW` en vez de a `readAt: null` porque son
  // justamente los que nunca se abrieron, y un mensaje marcado como archivado sin
  // haberlo leído tampoco debería aparecer como pendiente.
  if (query.unreadOnly) {
    where.status = 'NEW';
  }

  return where;
}

export const contactRepository = {
  /** Guarda el mensaje del formulario público. */
  async create(data: {
    name: string;
    email: string | undefined;
    phone: string | undefined;
    subject: string | undefined;
    message: string;
    ip: string | undefined;
    userAgent: string | undefined;
  }) {
    return prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        subject: data.subject ?? null,
        message: data.message,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
      select: { id: true },
    });
  },

  async list(query: ListContactMessagesQuery) {
    const where = buildWhere(query);

    // La consulta y el conteo comparten el `where` y van juntos: el total tiene
    // que corresponder a la página que se devuelve aunque alguien escriba un
    // mensaje en el medio.
    const [items, total] = await prisma.$transaction([
      prisma.contactMessage.findMany({
        where,
        select: SUMMARY_SELECT,
        // Los más recientes primero: es una bandeja de entrada, no un catálogo.
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return { items, total };
  },

  /** Cuántos hay sin leer, para el aviso del panel. */
  async countUnread(): Promise<number> {
    return prisma.contactMessage.count({ where: { status: 'NEW' } });
  },

  async findById(id: string) {
    return prisma.contactMessage.findUnique({
      where: { id },
      select: SUMMARY_SELECT,
    });
  },

  /**
   * Cambia el estado y, con él, las fechas que lo acompañan.
   *
   * Las fechas las calcula el servicio y llegan ya resueltas: si se pusieran acá
   * habría una regla de negocio —"marcar como respondido implica que se leyó"—
   * escondida en una consulta.
   */
  async updateStatus(
    id: string,
    data: { status: ContactStatus; readAt?: Date | null; repliedAt?: Date | null },
  ) {
    return prisma.contactMessage.update({
      where: { id },
      data,
      select: SUMMARY_SELECT,
    });
  },
};
