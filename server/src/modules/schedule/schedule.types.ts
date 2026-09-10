// =============================================================================
// KAYA KALPA — Tipos de la agenda
// =============================================================================
// Los horarios viajan con los minutos Y con el texto ya formateado ("09:00").
// Es a propósito y es lo mismo que hace el módulo de turnos: los minutos son el
// dato con el que se opera —comparar, ordenar, calcular— y el texto es lo que se
// muestra. Si el cliente tuviera que formatear, cada pantalla del frontend
// repetiría la misma conversión y bastaría con que una la hiciera mal para que el
// panel y la web mostraran horarios distintos.
// =============================================================================

/** Una franja continua dentro de un día. */
export interface TimeRange {
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
}

/** El horario de atención de un día de la semana, ya unificado. */
export interface WeekdaySchedule {
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** Sin franjas: la estética no atiende ese día. */
  closed: boolean;
  ranges: TimeRange[];
}

/** Una franja de atención cargada para un profesional. */
export interface BusinessHourEntry extends TimeRange {
  id: string;
  professionalId: string;
  professionalName: string;
  weekday: number;
  active: boolean;
}

/** Un día completo bloqueado. `professionalId` nulo = afecta a todos. */
export interface BlockedDateEntry {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  date: string;
  reason: string | null;
}

/** Una franja bloqueada dentro de un día. `professionalId` nulo = afecta a todos. */
export interface BlockedTimeEntry extends TimeRange {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  date: string;
  reason: string | null;
}
