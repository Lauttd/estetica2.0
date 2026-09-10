// =============================================================================
// KAYA KALPA — Acceso a datos de la agenda
// =============================================================================
// Las tres cosas que dan forma a la agenda viven juntas acá porque son la misma
// idea vista desde tres escalas: el horario semanal, el día que no se atiende y
// el rato que se bloquea dentro de un día.
//
// Las consultas de LECTURA del motor de disponibilidad NO están acá: viven en
// `availability.repository.ts` y preguntan otra cosa —"qué afecta al día D para
// estos profesionales"—, con selects más chicos. Estas son las del panel: traen
// todo, incluido lo inactivo, porque administrar requiere ver lo que está
// apagado.
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

/** Lo que devuelve una franja de atención, en el listado y en el detalle. */
const BUSINESS_HOUR_SELECT = {
  id: true,
  professionalId: true,
  weekday: true,
  startMin: true,
  endMin: true,
  active: true,
  professional: { select: { name: true } },
} satisfies Prisma.BusinessHourSelect;

// -----------------------------------------------------------------------------
// Lectura pública
// -----------------------------------------------------------------------------

export const scheduleRepository = {
  /**
   * Horarios de todos los profesionales activos, sin agrupar.
   *
   * El servicio los une por día: para el pie de página y la página de contacto
   * interesa "cuándo abre la estética", no el detalle de cada agenda, que es
   * información interna.
   */
  async listPublicBusinessHours() {
    return prisma.businessHour.findMany({
      where: { active: true, professional: { active: true } },
      select: { weekday: true, startMin: true, endMin: true },
    });
  },

  // ---------------------------------------------------------------------------
  // Horarios de atención (panel)
  // ---------------------------------------------------------------------------

  /**
   * El nombre del profesional, o `null` si no existe.
   *
   * Devuelve el nombre y no un booleano porque hace falta para las dos cosas:
   * comprobar antes de escribir —sin esto, un id inventado haría fallar la clave
   * foránea y el panel recibiría un 500 por un dato que puede corregir— y
   * completar la respuesta sin una segunda consulta.
   */
  async findProfessionalName(id: string): Promise<string | null> {
    const found = await prisma.professional.findUnique({
      where: { id },
      select: { name: true },
    });
    return found?.name ?? null;
  },

  async listBusinessHours(professionalId?: string) {
    return prisma.businessHour.findMany({
      where: professionalId ? { professionalId } : {},
      select: BUSINESS_HOUR_SELECT,
      // Por profesional y después por día y hora: así se lee como una agenda
      // semanal y no como una lista suelta de franjas.
      orderBy: [
        { professional: { sortOrder: 'asc' } },
        { weekday: 'asc' },
        { startMin: 'asc' },
      ],
    });
  },

  /**
   * Una franja con el nombre del profesional.
   *
   * Existe aparte de `findBusinessHourById` —que trae solo lo necesario para
   * validar— porque después de crear o editar hay que devolver la franja entera
   * armada, y buscarla dentro de `listBusinessHours` obligaría a traer la agenda
   * completa de la estética para encontrar una fila.
   */
  async findBusinessHourDetail(id: string) {
    return prisma.businessHour.findUnique({
      where: { id },
      select: BUSINESS_HOUR_SELECT,
    });
  },

  async findBusinessHourById(id: string) {
    return prisma.businessHour.findUnique({
      where: { id },
      select: { id: true, professionalId: true, weekday: true, startMin: true, endMin: true },
    });
  },

  async createBusinessHour(data: {
    professionalId: string;
    weekday: number;
    startMin: number;
    endMin: number;
  }) {
    return prisma.businessHour.create({ data, select: { id: true } });
  },

  async updateBusinessHour(
    id: string,
    data: { weekday?: number; startMin?: number; endMin?: number; active?: boolean },
  ) {
    return prisma.businessHour.update({ where: { id }, data, select: { id: true } });
  },

  /**
   * Borra una franja de atención.
   *
   * Es un borrado real y no una desactivación: quitar "los sábados" del horario
   * no es algo que se revierta ni que haya que conservar, y la fila no está
   * referenciada por nada. Lo que sí se puede desactivar es la franja entera
   * —`active: false`—, que la saca del cálculo sin perderla.
   */
  async deleteBusinessHour(id: string) {
    return prisma.businessHour.delete({ where: { id }, select: { id: true } });
  },

  /** ¿Ya hay una franja que empieza a esa hora ese día para ese profesional? */
  async businessHourExists(
    professionalId: string,
    weekday: number,
    startMin: number,
    excludeId?: string,
  ): Promise<boolean> {
    const found = await prisma.businessHour.findFirst({
      where: {
        professionalId,
        weekday,
        startMin,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  },

  // ---------------------------------------------------------------------------
  // Días bloqueados (panel)
  // ---------------------------------------------------------------------------

  /**
   * Días bloqueados, opcionalmente dentro de un rango.
   *
   * El rango existe porque los bloqueos se acumulan con los años y el panel
   * siempre mira una ventana: los próximos meses, no los feriados de 2019.
   */
  async listBlockedDates(from?: Date, to?: Date) {
    return prisma.blockedDate.findMany({
      where:
        from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {},
      select: {
        id: true,
        professionalId: true,
        date: true,
        reason: true,
        professional: { select: { name: true } },
      },
      // Del más próximo al más lejano: es el orden en que se los consulta.
      orderBy: [{ date: 'asc' }],
    });
  },

  async findBlockedDateById(id: string) {
    return prisma.blockedDate.findUnique({
      where: { id },
      select: { id: true, professionalId: true, date: true },
    });
  },

  /**
   * ¿Ya hay un bloqueo para ese día?
   *
   * El índice único `[professionalId, date]` NO alcanza para los bloqueos
   * globales: en SQL dos NULL se consideran distintos, así que dos filas con
   * `professionalId = null` y la misma fecha pasan el índice sin problema. Sin
   * esta comprobación se podrían cargar tres veces las vacaciones de la estética
   * y el panel mostraría tres entradas idénticas.
   */
  async blockedDateExists(professionalId: string | null, date: Date): Promise<boolean> {
    const found = await prisma.blockedDate.findFirst({
      where: { professionalId, date },
      select: { id: true },
    });
    return found !== null;
  },

  async createBlockedDate(data: {
    professionalId: string | null;
    date: Date;
    reason: string | null;
  }) {
    return prisma.blockedDate.create({ data, select: { id: true } });
  },

  /** Borra un bloqueo. Acá sí es definitivo: un feriado o no lo es. */
  async deleteBlockedDate(id: string) {
    return prisma.blockedDate.delete({ where: { id }, select: { id: true } });
  },

  // ---------------------------------------------------------------------------
  // Franjas bloqueadas (panel)
  // ---------------------------------------------------------------------------

  async listBlockedTimes(date?: Date, professionalId?: string) {
    return prisma.blockedTime.findMany({
      where: {
        ...(date ? { date } : {}),
        ...(professionalId ? { professionalId } : {}),
      },
      select: {
        id: true,
        professionalId: true,
        date: true,
        startMin: true,
        endMin: true,
        reason: true,
        professional: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startMin: 'asc' }],
    });
  },

  async createBlockedTime(data: {
    professionalId: string | null;
    date: Date;
    startMin: number;
    endMin: number;
    reason: string | null;
  }) {
    return prisma.blockedTime.create({ data, select: { id: true } });
  },

  async findBlockedTimeById(id: string) {
    return prisma.blockedTime.findUnique({ where: { id }, select: { id: true } });
  },

  async deleteBlockedTime(id: string) {
    return prisma.blockedTime.delete({ where: { id }, select: { id: true } });
  },

  /**
   * Bloqueos del mismo día que se solapan con el que se quiere cargar.
   *
   * A diferencia de los días completos, acá no hay índice único que valga: dos
   * franjas pueden convivir si no se pisan. Lo que no puede pasar es que se
   * superpongan, porque el motor tendría que restar dos veces el mismo rato.
   *
   * Un bloqueo global (professionalId nulo) choca contra cualquier otro del día;
   * uno de un profesional solo contra los suyos y contra los globales.
   */
  async findOverlappingBlockedTimes(data: {
    professionalId: string | null;
    date: Date;
    startMin: number;
    endMin: number;
  }) {
    return prisma.blockedTime.findMany({
      where: {
        date: data.date,
        ...(data.professionalId
          ? { OR: [{ professionalId: data.professionalId }, { professionalId: null }] }
          : {}),
        // Intervalos semiabiertos: uno que termina 12:00 y otro que empieza 12:00
        // no se pisan.
        startMin: { lt: data.endMin },
        endMin: { gt: data.startMin },
      },
      select: { id: true, startMin: true, endMin: true },
    });
  },
};
