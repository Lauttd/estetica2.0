// =============================================================================
// KAYA KALPA — Validación de la agenda
// =============================================================================

import { z } from 'zod';
import { dateOnlySchema, minutesOfDaySchema } from '../shared/validation';

/** Un profesional concreto, o `null` para "todos". */
const professionalIdField = z
  .string()
  .uuid('El profesional no es válido.')
  .nullable()
  .default(null);

/**
 * Una franja dentro de un día.
 *
 * El cierre tiene que ser posterior a la apertura. Sin esta comprobación, una
 * franja invertida (18:00 a 09:00) llegaría a la base y el motor de
 * disponibilidad no ofrecería ningún horario ese día: la resta daría negativa y
 * el día quedaría vacío sin ningún error visible.
 *
 * `endMin` admite 1440 —medianoche— porque hay servicios que terminan justo al
 * cerrar, pero como inicio no: un turno no puede empezar a las 24:00.
 */
const intervalFields = {
  startMin: minutesOfDaySchema.max(24 * 60 - 1, 'La hora de inicio no es válida.'),
  endMin: minutesOfDaySchema,
};

function isOrdered(data: { startMin: number; endMin: number }): boolean {
  return data.endMin > data.startMin;
}

const ORDER_MESSAGE = {
  message: 'La hora de cierre tiene que ser posterior a la de apertura.',
  path: ['endMin'],
};

export const listBusinessHoursQuerySchema = z.object({
  professionalId: z.string().uuid('El profesional no es válido.').optional(),
});

export const createBusinessHourSchema = z
  .object({
    professionalId: z.string().uuid('Elegí un profesional.'),
    /** 0 = domingo … 6 = sábado, igual que `Date.getDay()`. */
    weekday: z.coerce
      .number()
      .int()
      .min(0, 'El día de la semana no es válido.')
      .max(6, 'El día de la semana no es válido.'),
    ...intervalFields,
  })
  .refine(isOrdered, ORDER_MESSAGE);

export const updateBusinessHourSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6).optional(),
    startMin: minutesOfDaySchema.optional(),
    endMin: minutesOfDaySchema.optional(),
    active: z.boolean().optional(),
  })
  // Los dos extremos juntos: cambiar solo uno podría dejar la franja invertida, y
  // el servicio no puede comprobarlo sin leer antes la fila.
  .refine(
    (data) => data.startMin === undefined || data.endMin === undefined || data.endMin > data.startMin,
    ORDER_MESSAGE,
  );

export const blockIntervalFields = {
  professionalId: professionalIdField,
  ...intervalFields,
};

export const createBlockedDateSchema = z.object({
  professionalId: professionalIdField,
  /** Día del calendario del salón, 'AAAA-MM-DD'. */
  date: dateOnlySchema,
  reason: z.string().trim().max(200).optional(),
});

export const listBlockedDatesQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    'El rango de fechas está invertido.',
  );

export const createBlockedTimeSchema = z
  .object({ date: dateOnlySchema, reason: z.string().trim().max(200).optional(), ...blockIntervalFields })
  .refine(isOrdered, ORDER_MESSAGE);

export const listBlockedTimesQuerySchema = z.object({
  date: dateOnlySchema.optional(),
  professionalId: z.string().uuid('El profesional no es válido.').optional(),
});

export type ListBusinessHoursQuery = z.infer<typeof listBusinessHoursQuerySchema>;
export type CreateBusinessHourBody = z.infer<typeof createBusinessHourSchema>;
export type UpdateBusinessHourBody = z.infer<typeof updateBusinessHourSchema>;
export type CreateBlockedDateBody = z.infer<typeof createBlockedDateSchema>;
export type ListBlockedDatesQuery = z.infer<typeof listBlockedDatesQuerySchema>;
export type CreateBlockedTimeBody = z.infer<typeof createBlockedTimeSchema>;
export type ListBlockedTimesQuery = z.infer<typeof listBlockedTimesQuerySchema>;
