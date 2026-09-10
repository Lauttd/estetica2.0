// =============================================================================
// KAYA KALPA — Validación del módulo de turnos
// =============================================================================

import { z } from 'zod';
import { dateOnlySchema, minutesOfDaySchema } from '../shared/validation';

/**
 * ¿Es un carácter de control?
 *
 * Cubre C0 (0x00–0x1F), que incluye el salto de línea y la tabulación, y C1
 * (0x7F–0x9F), que son los invisibles que se cuelan al copiar y pegar de un PDF o
 * de un sitio web.
 *
 * Se compara por código y no con una expresión regular a propósito: un rango de
 * caracteres de control escrito con escapes invisibles es imposible de revisar
 * —no se ve qué se está sacando— y depende de cómo lo guarde el editor.
 */
function isControlChar(character: string): boolean {
  const code = character.charCodeAt(0);
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
}

/**
 * Limpia un texto libre que va a la base.
 *
 * No es por miedo a la inyección —Prisma parametriza todo— sino porque un nombre
 * con un salto de línea adentro rompe la lista del panel y el mensaje de
 * WhatsApp. Los caracteres de control se reemplazan por un espacio en vez de
 * borrarse, para no pegar dos palabras que estaban separadas.
 */
function cleanText(value: string): string {
  return [...value]
    .map((character) => (isControlChar(character) ? ' ' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un texto libre de largo acotado, ya limpio. */
const freeText = (max: number) =>
  z
    .string()
    .max(max, `No puede superar los ${max} caracteres.`)
    .transform(cleanText);

export const createBookingSchema = z.object({
  serviceIds: z
    .array(z.string().uuid('El identificador del servicio no es válido.'))
    .min(1, 'Elegí al menos un servicio.')
    .max(10, 'No se pueden reservar más de 10 servicios en un mismo turno.'),

  professionalId: z.string().uuid('El profesional no es válido.').optional(),

  date: dateOnlySchema,

  /**
   * El horario elegido, en minutos desde la medianoche.
   *
   * Que tenga la forma correcta no alcanza: lo que importa es que sea un horario
   * que el motor esté ofreciendo en este momento. Eso se verifica en el servicio,
   * dentro de la transacción, y es lo que impide reservar un horario inventado o
   * que ya no existe.
   */
  startMin: minutesOfDaySchema,

  customer: z.object({
    firstName: freeText(60).pipe(z.string().min(1, 'Ingresá tu nombre.')),
    lastName: freeText(60).pipe(z.string().min(1, 'Ingresá tu apellido.')),
    // Acá solo se acota el largo; el formato se valida de verdad al normalizarlo
    // a la forma internacional, que es donde se puede decir qué se espera.
    phone: freeText(30).pipe(z.string().min(6, 'Ingresá tu teléfono con código de área.')),
    email: z
      .union([z.literal(''), z.string().trim().email('El correo no parece válido.')])
      .optional()
      // Un campo vacío es "no dejó correo", no un correo vacío.
      .transform((value) => (value ? value : undefined)),
    notes: freeText(500).optional().transform((value) => (value ? value : undefined)),
  }),
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;

/**
 * El token que acompaña a la consulta y a la cancelación.
 *
 * Es un uuid v7, que es lo que genera la columna. Se valida la forma para que una
 * cadena arbitraria no llegue nunca a la consulta.
 */
export const cancelTokenSchema = z.object({
  token: z.string().uuid('El enlace de cancelación no es válido.'),
});

export const bookingCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^(KK[-\s]?)?[A-Za-z0-9]{6}$/, 'El código no tiene el formato correcto.'),
});

/**
 * El token también puede venir por query, para que el enlace de confirmación que
 * se le manda al cliente funcione como un solo link sin pasar por un formulario.
 */
export const bookingLookupQuerySchema = z.object({
  token: z.string().uuid('El enlace no es válido.').optional(),
});

export type BookingCodeParams = z.infer<typeof bookingCodeParamSchema>;
export type BookingLookupQuery = z.infer<typeof bookingLookupQuerySchema>;
export type CancelTokenBody = z.infer<typeof cancelTokenSchema>;
