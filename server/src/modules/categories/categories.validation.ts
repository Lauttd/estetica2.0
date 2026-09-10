// =============================================================================
// KAYA KALPA — Validación del catálogo de categorías
// =============================================================================
// Solo el panel crea y edita categorías; el catálogo público es de lectura. Por
// eso los esquemas de escritura viven acá y no había ninguno hasta ahora.
// =============================================================================

import { z } from 'zod';
import { optionalText } from '../shared/validation';

/**
 * El `slug` NO se acepta desde el cliente.
 *
 * Se deriva del nombre en el servicio. Recibirlo permitiría cargar una categoría
 * llamada "Manos" con la dirección `/servicios/unas`, que no se parece a nada y
 * rompe el posicionamiento de §37 sin que nadie lo note.
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Escribí el nombre de la categoría.')
    .max(80, 'El nombre no puede superar los 80 caracteres.'),
  description: optionalText(400, 'La descripción no puede superar los 400 caracteres.'),
  image: optionalText(300),
  /** Nombre del icono en el set del frontend, por ejemplo "spa" o "hands". */
  icon: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
