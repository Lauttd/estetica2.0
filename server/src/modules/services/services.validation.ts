// =============================================================================
// KAYA KALPA — Validación del catálogo
// =============================================================================

import { z } from 'zod';
import {
  booleanQuerySchema,
  optionalText,
  paginationSchema,
  searchSchema,
  slugParamSchema,
} from '../shared/validation';

export const listServicesQuerySchema = paginationSchema.extend({
  /** Slug de la categoría, para el filtro del catálogo. */
  category: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'La categoría no es válida.')
    .optional(),
  q: searchSchema,
  featured: booleanQuerySchema.optional(),
  bookable: booleanQuerySchema.optional(),
});

export const serviceSlugParamSchema = slugParamSchema;

// -----------------------------------------------------------------------------
// Panel
// -----------------------------------------------------------------------------

export const listServicesAdminQuerySchema = paginationSchema.extend({
  /** Identificador de la categoría. El panel la elige de una lista, no la escribe. */
  categoryId: z.string().uuid('La categoría no es válida.').optional(),
  q: searchSchema,
  active: booleanQuerySchema.optional(),
  needsReview: booleanQuerySchema.optional(),
  bookable: booleanQuerySchema.optional(),
});

/** Tope del precio: $1.000.000 expresado en centavos. */
const MAX_PRICE_CENTS = 100_000_000;
const MAX_DURATION_MIN = 600;
const MIN_DURATION_MIN = 5;
const MAX_BENEFITS = 12;

/**
 * Un entero que además admite `null` explícito.
 *
 * El orden de la unión NO es decorativo: `z.coerce.number()` convierte `null` en
 * 0, porque `Number(null)` es 0. Si el número se evaluara primero, un precio
 * enviado como `null` —"a consultar"— se guardaría como `0`, que en este sistema
 * significa "bonificado". Serían dos cosas opuestas sin ningún error a la vista.
 * Con `z.null()` primero, el `null` se reconoce antes de que la coerción lo pise.
 */
function nullableInt(min: number, max: number, message: string) {
  return z.union([
    z.null(),
    z.coerce.number().int(message).min(min, message).max(max, message),
  ]);
}

/**
 * El precio viaja en CENTAVOS, igual que en todo el resto de la API.
 *
 * La conversión desde lo que se escribe en pantalla ("28.000") es del cliente.
 * Aceptar pesos acá obligaría a adivinar la unidad de cada número que llegue, y
 * un error de factor 100 en un precio no se nota hasta que un cliente reclama.
 */
const priceCentsField = nullableInt(
  0,
  MAX_PRICE_CENTS,
  'El precio tiene que estar entre 0 y 1.000.000 de pesos.',
);

const durationMinField = nullableInt(
  MIN_DURATION_MIN,
  MAX_DURATION_MIN,
  `La duración tiene que estar entre ${MIN_DURATION_MIN} y ${MAX_DURATION_MIN} minutos.`,
);

export const createServiceSchema = z.object({
  categoryId: z.string().uuid('Elegí una categoría.'),
  name: z
    .string()
    .trim()
    .min(2, 'Escribí el nombre del servicio.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  shortDescription: z
    .string()
    .trim()
    .min(1, 'Escribí una descripción corta: es lo que se ve en la tarjeta.')
    .max(300, 'La descripción corta no puede superar los 300 caracteres.'),
  description: optionalText(4000, 'La descripción no puede superar los 4000 caracteres.'),
  benefits: z
    .array(z.string().trim().min(1).max(200))
    .max(MAX_BENEFITS, `No se pueden cargar más de ${MAX_BENEFITS} beneficios.`)
    .optional(),
  recommendations: optionalText(400),
  extraInfo: optionalText(300),
  durationMin: durationMinField.optional(),
  priceCents: priceCentsField.optional(),
  image: optionalText(300),
  subgroup: optionalText(60),
  bookable: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

/**
 * La edición es parcial: el panel manda solo lo que cambió.
 *
 * Distinto de "todos los campos opcionales pero presentes": acá un campo ausente
 * significa "no lo toques" y un campo en `null` significa "vacialo". El servicio
 * respeta esa diferencia, y es lo que permite que el formulario de precio rápido
 * no pise el resto del servicio.
 */
export const updateServiceSchema = createServiceSchema.partial().extend({
  needsReview: z.boolean().optional(),
  active: z.boolean().optional(),
});

/** El atajo de la lista de precios: solo el precio. */
export const updateServicePriceSchema = z.object({
  priceCents: priceCentsField,
});

export type ListServicesAdminQuery = z.infer<typeof listServicesAdminQuerySchema>;
export type CreateServiceBody = z.infer<typeof createServiceSchema>;
export type UpdateServiceBody = z.infer<typeof updateServiceSchema>;
export type UpdateServicePriceBody = z.infer<typeof updateServicePriceSchema>;
