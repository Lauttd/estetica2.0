// =============================================================================
// KAYA KALPA — Tipos del módulo de profesionales
// =============================================================================

/**
 * Un profesional tal como lo ve el público.
 *
 * A propósito NO se exponen `slotStepMin`, `bufferMin`, `minLeadMin` ni
 * `maxAdvanceDays`: son reglas de funcionamiento de la agenda, no información
 * del profesional. Al cliente le sirven los límites ya aplicados por el motor de
 * disponibilidad, no la configuración con la que se calcularon.
 */
export interface ProfessionalSummary {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar: string | null;
  /** Color con el que se lo identifica en la agenda y el calendario. */
  color: string;
  /** Servicios que puede realizar. */
  services: Array<{ id: string; slug: string; name: string }>;
}

/**
 * Un profesional como lo ve el panel: con las reglas de agenda a la vista.
 *
 * Son las que se configuran desde ahí, y sin verlas no se entiende por qué a un
 * profesional se le ofrecen horarios cada 30 minutos y a otro cada 15, ni por qué
 * uno no recibe reservas para dentro de dos horas.
 */
export interface ProfessionalAdminEntry extends ProfessionalSummary {
  /** Cada cuántos minutos se ofrece un inicio de turno. */
  slotStepMin: number;
  /** Minutos de limpieza/recambio que bloquea cada turno después de terminar. */
  bufferMin: number;
  /** Anticipación mínima, en minutos, para aceptar una reserva online. */
  minLeadMin: number;
  /** Hasta cuántos días hacia adelante se puede reservar. */
  maxAdvanceDays: number;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
}
