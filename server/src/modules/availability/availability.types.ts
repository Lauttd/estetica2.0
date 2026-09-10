// =============================================================================
// KAYA KALPA — Tipos del motor de disponibilidad
// =============================================================================

import type { DateOnly, MinutesOfDay } from '../../utils/datetime';

export interface AvailabilityQuery {
  /** Servicios que va a incluir el turno. Al menos uno. */
  serviceIds: string[];
  /** Si el cliente ya eligió profesional. Si no, se calcula sobre todos. */
  professionalId?: string;
  date: DateOnly;
}

export interface AvailabilitySlot {
  /** Minutos desde la medianoche del salón. Es lo que viaja de vuelta al reservar. */
  startMin: MinutesOfDay;
  /** El mismo valor como 'HH:MM', para no obligar al frontend a formatearlo. */
  startTime: string;
  /** Quiénes pueden atender ese horario. Con un profesional elegido, uno solo. */
  professionalIds: string[];
}

export interface AvailabilityResult {
  date: DateOnly;
  /** Duración total del turno: la suma de los servicios elegidos. */
  totalDurationMin: number;
  /**
   * `true` si ese día la estética no atiende —no hay horario cargado para ese día
   * de la semana, o está bloqueado entero—.
   *
   * Es distinto de "no hay horarios": un día abierto pero completo devuelve
   * `closed: false` con la lista de horarios vacía, y el frontend muestra otro
   * mensaje en cada caso.
   */
  closed: boolean;
  slots: AvailabilitySlot[];
}
