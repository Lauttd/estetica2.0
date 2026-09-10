// =============================================================================
// KAYA KALPA — Validación de la consulta de disponibilidad
// =============================================================================

import { z } from 'zod';
import { dateOnlySchema, uuidListSchema } from '../shared/validation';

export const availabilityQuerySchema = z.object({
  /** Uno o varios servicios separados por coma: `?serviceIds=a,b`. */
  serviceIds: uuidListSchema,
  /**
   * Opcional. Sin él se calcula sobre todos los profesionales que puedan hacer
   * los servicios elegidos, y cada horario vuelve con quiénes pueden atenderlo.
   */
  professionalId: z.string().uuid('El profesional no es válido.').optional(),
  date: dateOnlySchema,
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
