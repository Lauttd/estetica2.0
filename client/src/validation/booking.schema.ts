// =============================================================================
// KAYA KALPA — El formulario de datos del cliente
// =============================================================================
// Espejo de `createBookingSchema` en `server/src/modules/bookings/bookings.validation.ts`.
//
// POR QUÉ EL ESQUEMA ESTÁ DUPLICADO Y POR QUÉ ESO ESTÁ BIEN
//
// El cliente no puede importar del servidor: `bookings.validation.ts` importa a su
// vez utilidades que terminan en Prisma, y eso no entra en un bundle de navegador.
// Así que hay dos copias, y la forma de que no se separen es que **los mensajes
// sean literalmente los mismos**: si alguien cambia uno de los dos lados, la
// diferencia se nota al leer, que es lo único que se puede pedir cuando no se
// pueden compartir.
//
// El servidor sigue siendo el que decide. Esto existe para que nadie mande una
// petición que ya se sabe que va a fallar y para que el error aparezca al lado del
// campo mientras escribe, no después de apretar el botón.
// =============================================================================

import { z } from 'zod';

/**
 * Un texto libre de largo acotado.
 *
 * El `.trim()` va antes del `.min()` y no después: si no, un nombre hecho de
 * espacios pasaría la comprobación de "no está vacío" y llegaría a la base como
 * una cadena en blanco.
 */
const freeText = (max: number) => z.string().trim().max(max, `No puede superar los ${max} caracteres.`);

export const customerSchema = z.object({
  firstName: freeText(60).pipe(z.string().min(1, 'Ingresá tu nombre.')),

  lastName: freeText(60).pipe(z.string().min(1, 'Ingresá tu apellido.')),

  /**
   * El teléfono solo se acota en largo acá.
   *
   * El formato se valida de verdad al normalizarlo a la forma internacional, que
   * es del lado del servidor y es donde se puede decir qué se espera. Validar acá
   * con una expresión regular propia rechazaría números válidos —el mismo teléfono
   * se escribe con guiones, con espacios o con 0 adelante— y el mensaje que
   * recibiría la persona sería el nuestro, más pobre que el del servidor.
   */
  phone: freeText(30).pipe(z.string().min(6, 'Ingresá tu teléfono con código de área.')),

  /**
   * El correo es opcional, y un campo vacío significa "no dejó correo".
   *
   * El `<input>` de un formulario HTML manda cadena vacía, nunca `undefined`. Sin
   * la unión con `z.literal('')`, dejar el campo en blanco fallaría con "el correo
   * no parece válido", que es exactamente lo contrario de lo que pasó.
   */
  email: z
    .union([z.literal(''), z.string().trim().email('El correo no parece válido.')])
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value)),

  notes: z
    .string()
    .trim()
    .max(500, 'No puede superar los 500 caracteres.')
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value)),
});

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerValues = z.output<typeof customerSchema>;
