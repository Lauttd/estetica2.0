// =============================================================================
// KAYA KALPA — Validación del módulo de profesionales
// =============================================================================

import { z } from 'zod';
import { optionalText, uuidListSchema } from '../shared/validation';

export const listProfessionalsQuerySchema = z.object({
  /**
   * Servicios que el turno va a incluir. Se acepta el mismo nombre y formato que
   * en `/availability` (`?serviceIds=a,b`) para que el asistente reutilice el
   * mismo parámetro al cambiar de paso.
   */
  serviceIds: uuidListSchema.optional(),
});

/**
 * Los topes de las reglas de agenda no son arbitrarios.
 *
 * `slotStepMin` más allá de 60 convertiría la grilla en dos o tres horarios por
 * día; `bufferMin` arriba de 120 haría que un turno de una hora ocupe tres.
 * `maxAdvanceDays` a 365 dejaría reservar para dentro de un año, cuando la
 * estética todavía no sabe si va a estar abierta.
 */
const slotStepMin = z.coerce
  .number()
  .int()
  .min(5, 'El intervalo entre horarios tiene que ser de al menos 5 minutos.')
  .max(60, 'El intervalo entre horarios no puede superar los 60 minutos.');

const bufferMin = z.coerce
  .number()
  .int()
  .min(0, 'El tiempo de limpieza no puede ser negativo.')
  .max(120, 'El tiempo de limpieza no puede superar los 120 minutos.');

const minLeadMin = z.coerce
  .number()
  .int()
  .min(0, 'La anticipación no puede ser negativa.')
  .max(10_080, 'La anticipación no puede superar los 7 días.');

const maxAdvanceDays = z.coerce
  .number()
  .int()
  .min(1, 'Tiene que poder reservarse al menos con un día de anticipación.')
  .max(365, 'No se puede reservar con más de un año de anticipación.');

/** Color del calendario, en hexadecimal de 6 dígitos. */
const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color tiene que tener la forma #4C6548.');

export const createProfessionalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribí el nombre.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  title: optionalText(80),
  bio: optionalText(1000),
  avatar: optionalText(300),
  color: color.optional(),
  slotStepMin: slotStepMin.optional(),
  bufferMin: bufferMin.optional(),
  minLeadMin: minLeadMin.optional(),
  maxAdvanceDays: maxAdvanceDays.optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateProfessionalSchema = createProfessionalSchema.partial().extend({
  active: z.boolean().optional(),
});

/**
 * Los servicios que puede realizar.
 *
 * Se reemplaza el conjunto entero, así que una lista vacía es válida: significa
 * "todavía no le asigné ninguno", que es el estado en que queda un profesional
 * recién creado. No se exige un mínimo porque forzarlo llevaría a asignarle
 * cualquier cosa con tal de poder guardar.
 *
 * Se descartan los repetidos con un `Set`: mandar dos veces el mismo
 * identificador haría fallar el alta por la clave compuesta, y es un error que no
 * aporta nada señalar —el resultado que se pidió es el mismo.
 */
export const replaceProfessionalServicesSchema = z.object({
  serviceIds: z
    .array(z.string().uuid('El identificador del servicio no es válido.'))
    .max(200, 'No se pueden asignar más de 200 servicios.')
    .transform((ids) => [...new Set(ids)]),
});

export type ListProfessionalsQuery = z.infer<typeof listProfessionalsQuerySchema>;
export type CreateProfessionalBody = z.infer<typeof createProfessionalSchema>;
export type UpdateProfessionalBody = z.infer<typeof updateProfessionalSchema>;
export type ReplaceProfessionalServicesBody = z.infer<
  typeof replaceProfessionalServicesSchema
>;
