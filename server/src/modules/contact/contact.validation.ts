// =============================================================================
// KAYA KALPA — Validación del formulario de contacto
// =============================================================================
// El formulario lo completa cualquiera desde la calle, así que es la entrada más
// expuesta de la API después del alta de turnos. Cada campo tiene tope de largo
// por el mismo motivo: sin ellos, un texto de 10 MB llegarían a la base.
// =============================================================================

import { z } from 'zod';
import { normalizePhone } from '../../utils/phone';
import { booleanQuerySchema, optionalText, paginationSchema } from '../shared/validation';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

const optionalEmail = optionalText(
  200,
  'El correo no puede superar los 200 caracteres.',
).refine(
  (value) => value === undefined || z.string().email().safeParse(value).success,
  'El correo no parece válido.',
);

/**
 * El teléfono se guarda normalizado, igual que el de los turnos.
 *
 * `normalizePhone` se llama dos veces —una para validar, otra para transformar—
 * porque Zod no permite las dos cosas en un solo paso. Es una función pura sobre
 * una cadena de a lo sumo 40 caracteres: repetirla no cuesta nada, y separar la
 * comprobación de la conversión deja el mensaje de error donde corresponde.
 */
const optionalPhone = optionalText(
  40,
  'El teléfono es demasiado largo.',
).refine(
  (value) => value === undefined || normalizePhone(value) !== null,
  'El teléfono no parece válido. Escribilo con código de área, por ejemplo 3705 194299.',
  // El `?? undefined` es inalcanzable —el `refine` de arriba ya rechazó lo que
  // `normalizePhone` no pudo interpretar— pero es lo que le dice a TypeScript que
  // el resultado no puede ser `null`.
).transform((value) => (value === undefined ? undefined : (normalizePhone(value) ?? undefined)));

export const createContactMessageSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Contanos tu nombre.')
      .max(MAX_NAME_LENGTH, `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`),
    email: optionalEmail,
    phone: optionalPhone,
    subject: optionalText(160, 'El asunto no puede superar los 160 caracteres.'),
    message: z
      .string()
      .trim()
      .min(10, 'Contanos un poco más, así podemos ayudarte.')
      .max(
        MAX_MESSAGE_LENGTH,
        `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
      ),
  })
  /**
   * Hace falta al menos una forma de responder.
   *
   * Se exige acá y no en cada campo porque el formulario puede completarse con
   * cualquiera de los dos: quien no usa correo deja el teléfono y al revés. El
   * error se ancla al correo —el primero de los dos— para que aparezca junto a un
   * campo visible y no como un mensaje suelto al pie.
   */
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    path: ['email'],
    message: 'Dejanos un correo o un teléfono para que podamos responderte.',
  });

export const listContactMessagesQuerySchema = paginationSchema.extend({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  unreadOnly: booleanQuerySchema.optional(),
});

export const updateContactMessageSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'El estado no es válido.' }),
  }),
});

export type CreateContactMessageBody = z.infer<typeof createContactMessageSchema>;
export type ListContactMessagesQuery = z.infer<typeof listContactMessagesQuerySchema>;
export type UpdateContactMessageBody = z.infer<typeof updateContactMessageSchema>;
