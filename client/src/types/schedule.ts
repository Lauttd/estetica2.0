// =============================================================================
// KAYA KALPA — Horario de atención, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/schedule/schedule.types.ts`, solo la parte
// pública: los bloqueos y las franjas por profesional son información interna.
//
// Los minutos viajan junto al texto ya formateado ("09:00") y el cliente usa el
// texto. Los minutos están igual porque son el dato con el que se ordena y se
// compara; mostrar `startTime` y calcular con `startMin` es lo que evita repetir
// en cada pantalla una conversión que ya hizo el servidor.
// =============================================================================

/** Una franja continua dentro de un día. */
export interface TimeRange {
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
}

/** El horario de un día de la semana. */
export interface WeekdaySchedule {
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** Sin franjas: la estética no atiende ese día. */
  closed: boolean;
  ranges: TimeRange[];
}

/** Lo que devuelve `GET /api/schedule`: los siete días, siempre. */
export interface WeeklySchedule {
  weekdays: WeekdaySchedule[];
}
