// =============================================================================
// KAYA KALPA — Esquemas de validación compartidos
// =============================================================================
// Lo que usan varios módulos: paginación, identificadores y fechas. Están acá y
// no repetidos en cada módulo para que un cambio de criterio se haga una vez.
// =============================================================================

import { z } from 'zod';
import { isValidDateOnly } from '../../utils/datetime';

/** Tope de elementos por página. Evita que un `perPage=100000` tumbe la API. */
export const MAX_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 24;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(DEFAULT_PER_PAGE),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/** Identificador en la ruta. */
export const idParamSchema = z.object({
  id: z.string().uuid('El identificador no es válido.'),
});

/**
 * Slug en la ruta.
 *
 * Se restringe a minúsculas, números y guiones: los slugs los genera la propia
 * aplicación a partir del nombre, así que cualquier otra cosa es un pedido
 * armado a mano. Filtrarlo acá evita que llegue basura a la consulta.
 */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El identificador del servicio no es válido.'),
});

/**
 * Un día del calendario del salón, 'YYYY-MM-DD'.
 *
 * Se valida que la fecha exista de verdad: `2026-02-30` cumple el formato pero
 * no es un día, y sin este control llegaría a la base y fallaría con un error
 * interno en vez de con un mensaje claro.
 */
export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, 'Ingresá una fecha válida con el formato AAAA-MM-DD.');

/** Una lista de identificadores separados por coma, como llega en la query. */
export const uuidListSchema = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.string().uuid('El identificador no es válido.'))
      .min(1, 'Elegí al menos un servicio.')
      .max(10, 'No se pueden reservar más de 10 servicios en un mismo turno.'),
  );

/**
 * Un texto de búsqueda.
 *
 * Se recorta y se descartan los vacíos para que `?q=` (sin valor) no filtre por
 * cadena vacía, que en SQL no coincide con nada y devolvería una lista vacía sin
 * explicación.
 */
export const searchSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/** Un intervalo de minutos dentro del día. 540 = 09:00, 1440 = medianoche. */
export const minutesOfDaySchema = z.coerce.number().int().min(0).max(24 * 60);

/**
 * Un booleano que llega por la query, donde todo es texto.
 *
 * Se acepta solo `'true'` o `'false'` y no cualquier valor "parecido": un
 * `?featured=1` falla con un mensaje claro en vez de interpretarse como `false`
 * y devolver silenciosamente el resultado contrario al que se pidió.
 */
export const booleanQuerySchema = z
  .enum(['true', 'false'], {
    errorMap: () => ({ message: 'Solo se acepta "true" o "false".' }),
  })
  .transform((value) => value === 'true');

/**
 * Un texto opcional.
 *
 * El `<input>` vacío de un formulario HTML manda cadena vacía, no `undefined`.
 * Sin esta conversión, un campo que la persona dejó en blanco llegaría como `""`
 * y, según el campo, o fallaría la validación de formato —obligando a completar
 * algo que no se quería usar— o se guardaría una cadena vacía en la base, que es
 * distinto de "sin dato" y arruina cualquier `IS NULL`.
 *
 * Tiene que ir ANTES de `.refine()` / `.transform()` propios del campo: cuanto
 * más tarde se convierta, más pasos ven la cadena vacía como si fuera un valor.
 */
export function optionalText(max: number, message?: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value === '' ? undefined : value));
}
