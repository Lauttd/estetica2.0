// =============================================================================
// KAYA KALPA — Validación de las rutas de turnos del panel
// =============================================================================

import { BookingStatus } from '@prisma/client';
import { z } from 'zod';
import { parseDateOnly } from '../../utils/datetime';
import { optionalText, paginationSchema } from '../shared/validation';

/**
 * Los estados se validan contra el enum de Prisma y no contra una lista escrita a
 * mano: es el mismo enum que usa la base, así que un estado nuevo no puede quedar
 * aceptado por la API y rechazado por Postgres, ni al revés.
 */
const bookingStatusSchema = z.nativeEnum(BookingStatus, {
  errorMap: () => ({ message: 'Ese estado de turno no existe.' }),
});

/**
 * Filtros de la agenda.
 *
 * `date` y el par `from`/`to` son dos formas de lo mismo —un día suelto o un
 * rango— y por eso no se aceptan juntas. Podrían convivir dando prioridad a una,
 * pero entonces un panel que mandara las dos recibiría una lista filtrada por un
 * criterio que no eligió y no tendría cómo notarlo.
 *
 * Las fechas llegan como 'YYYY-MM-DD' y se convierten acá al `Date` en medianoche
 * UTC que esperan las columnas `@db.Date`. La conversión va en la validación y no
 * en el repositorio para que este reciba siempre el mismo tipo, venga de donde
 * venga la consulta.
 */
export const listBookingsAdminQuerySchema = paginationSchema
  .extend({
    date: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    status: bookingStatusSchema.optional(),
    professionalId: z.string().uuid('El profesional no es válido.').optional(),
  })
  .superRefine((query, ctx) => {
    const fields = { date: query.date, from: query.from, to: query.to };

    for (const [field, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      try {
        parseDateOnly(value);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Ingresá una fecha válida con el formato AAAA-MM-DD.',
        });
      }
    }

    if (query.date !== undefined && (query.from !== undefined || query.to !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date'],
        message: 'Elegí un día concreto o un rango de fechas, no los dos.',
      });
    }

    // El rango invertido no se corrige solo: devolver la lista vacía sin decir
    // nada haría pensar que esos días no tienen turnos.
    if (query.from !== undefined && query.to !== undefined && query.from > query.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'La fecha de fin no puede ser anterior a la de inicio.',
      });
    }
  })
  .transform((query) => ({
    date: query.date === undefined ? undefined : parseDateOnly(query.date),
    from: query.from === undefined ? undefined : parseDateOnly(query.from),
    to: query.to === undefined ? undefined : parseDateOnly(query.to),
    status: query.status,
    professionalId: query.professionalId,
    page: query.page,
    perPage: query.perPage,
  }));

export const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
  /** Queda en el historial del turno. Si no viene, se anota uno por defecto. */
  reason: optionalText(300, 'El motivo no puede superar los 300 caracteres.'),
});

export type ListBookingsAdminQuery = z.infer<typeof listBookingsAdminQuerySchema>;
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusSchema>;
