// =============================================================================
// KAYA KALPA — Validación de preguntas frecuentes
// =============================================================================

import { z } from 'zod';
import { optionalText } from '../shared/validation';

export const createFaqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, 'Escribí la pregunta.')
    .max(300, 'La pregunta no puede superar los 300 caracteres.'),
  answer: z
    .string()
    .trim()
    .min(5, 'Escribí la respuesta.')
    .max(3000, 'La respuesta no puede superar los 3000 caracteres.'),
  /** Agrupador libre. El panel lo elige de los ya usados o escribe uno nuevo. */
  category: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateFaqSchema = createFaqSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateFaqBody = z.infer<typeof createFaqSchema>;
export type UpdateFaqBody = z.infer<typeof updateFaqSchema>;
