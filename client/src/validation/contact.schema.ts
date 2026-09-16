// =============================================================================
// KAYA KALPA — El formulario de contacto
// =============================================================================
// Espejo de `createContactMessageSchema` en
// `server/src/modules/contact/contact.validation.ts`.
//
// POR QUÉ EL ESQUEMA ESTÁ DUPLICADO Y POR QUÉ ESO ESTÁ BIEN
//
// El cliente no puede importar del servidor: la validación de allá usa
// `normalizePhone` y termina en utilidades que no entran en un bundle de
// navegador. Así que hay dos copias, y la forma de que no se separen es que **los
// mensajes sean literalmente los mismos**: si alguien cambia uno de los dos lados,
// la diferencia se nota al leer, que es lo único que se puede pedir cuando no se
// pueden compartir.
//
// El servidor sigue siendo el que decide. Esto existe para que nadie mande una
// petición que ya se sabe que va a fallar y para que el error aparezca al lado del
// campo mientras escribe, no después de apretar el botón.
//
// EL TELÉFONO SOLO SE ACOTA EN LARGO
//
// El formato se valida de verdad al normalizarlo a la forma internacional, que es
// del lado del servidor. Repetir acá esa interpretación —con el "15", el 0 de
// larga distancia, el código de país— sería mantener dos veces la misma lógica
// delicada, y la que se equivocaría sería la del navegador, que rechazaría un
// número válido con un mensaje más pobre que el del servidor. Es la misma decisión
// que ya toma el formulario de turnos.
// =============================================================================

import { z } from 'zod';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

/**
 * Un texto opcional tal como llega de un `<input>`.
 *
 * El campo vacío de un formulario HTML manda cadena vacía, no `undefined`, y acá
 * "vacío" significa "no dejó el dato". Sin la conversión, dejar el correo en blanco
 * fallaría con "el correo no parece válido", que es exactamente lo contrario de lo
 * que pasó.
 */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Contanos tu nombre.')
      .max(MAX_NAME_LENGTH, `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`),

    email: optionalText(200, 'El correo no puede superar los 200 caracteres.').refine(
      (value) => value === undefined || z.string().email().safeParse(value).success,
      'El correo no parece válido.',
    ),

    phone: optionalText(40, 'El teléfono es demasiado largo.'),

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

export type ContactFormValues = z.input<typeof contactSchema>;
export type ContactValues = z.output<typeof contactSchema>;
