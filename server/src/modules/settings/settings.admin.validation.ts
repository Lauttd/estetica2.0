// =============================================================================
// KAYA KALPA — Validación de la pantalla de configuración
// =============================================================================
// A diferencia de los otros esquemas, este no valida una entidad del dominio sino
// el formulario de una pantalla: una bolsa de claves sin relación entre sí —el
// nombre del salón y el teléfono de WhatsApp no comparten nada—. Vive acá igual
// porque la regla del proyecto es que **la validación acompaña al módulo que la
// usa**, y este es el módulo de la configuración.
//
// POR QUÉ CADA CLAVE TIENE SU REGLA
//
// La tabla guarda todo como texto, así que la validación es lo único que separa
// un `whatsapp_e164` de verdad de uno que arma un enlace roto. Y un enlace roto
// no se nota: el botón de WhatsApp se ve bien, y no pasa nada cuando el cliente
// lo toca. Es la clase de error que se descubre perdiendo consultas.
// =============================================================================

import { z } from 'zod';
import { EDITABLE_SETTING_KEYS } from './settings.repository';

/** Un texto de largo acotado. Vacío es válido: es como se borra un dato. */
const text = (max: number, message: string) => z.string().trim().max(max, message);

/**
 * Un valor que tiene que ser un enlace https, o quedar vacío.
 *
 * Se exige https y no cualquier esquema porque estos valores terminan en un
 * `href` del sitio: un `javascript:` guardado acá sería un XSS almacenado, y
 * `z.string().url()` por sí solo lo aceptaría.
 */
const optionalHttpsUrl = (message: string) =>
  z
    .string()
    .trim()
    .max(300, 'El enlace es demasiado largo.')
    .refine((value) => value === '' || /^https:\/\/\S+$/i.test(value), message);

const rules: Record<string, z.ZodTypeAny> = {
  // Solo dígitos, con código de país. Se guarda así porque es lo que se concatena
  // en `https://wa.me/<numero>`: con espacios o un '+' adelante, el enlace no
  // resuelve.
  whatsapp_e164: z
    .string()
    .trim()
    .regex(
      /^\d{10,15}$/,
      'Escribí el número solo con dígitos y con código de país, por ejemplo 5493705194299.',
    ),

  phone_display: text(40, 'El teléfono es demasiado largo.'),

  // Las dos banderas que hacen que el sitio diga "a confirmar" en vez de mostrar
  // un dato que nadie cargó. Son de texto y no booleanas porque así se guardan;
  // convertirlas acá evita que un `'TRUE'` o un `'1'` deje la bandera en un valor
  // que el servicio interpreta al revés.
  hours_are_placeholder: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'Solo se acepta "true" o "false".' }),
  }),
  gallery_is_placeholder: z.enum(['true', 'false'], {
    errorMap: () => ({ message: 'Solo se acepta "true" o "false".' }),
  }),

  instagram_url: optionalHttpsUrl('El enlace de Instagram tiene que empezar con https://'),
  facebook_url: optionalHttpsUrl('El enlace de Facebook tiene que empezar con https://'),

  // Minutos que un turno sin confirmar retendría el horario. El tope de una
  // semana es deliberado: más que eso no es una demora en confirmar, es un turno
  // olvidado ocupando la agenda.
  booking_pending_ttl_minutes: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Escribí la cantidad de minutos en números.')
    .refine(
      (value) => Number(value) >= 15 && Number(value) <= 10_080,
      'Tiene que ser un número de minutos entre 15 y 10080 (una semana).',
    ),

  maps_query: text(300, 'El texto del mapa es demasiado largo.'),
  address: text(200, 'La dirección es demasiado larga.'),
  city: text(80, 'El nombre de la ciudad es demasiado largo.'),
  province: text(80, 'El nombre de la provincia es demasiado largo.'),
  country: text(80, 'El nombre del país es demasiado largo.'),
  salon_name: text(80, 'El nombre del salón es demasiado largo.'),
  salon_tagline: text(80, 'La bajada es demasiado larga.'),
  whatsapp_message: text(400, 'El mensaje precargado es demasiado largo.'),
  instagram_name: text(80, 'El nombre de la cuenta es demasiado largo.'),
  facebook_name: text(80, 'El nombre de la cuenta es demasiado largo.'),
};

/**
 * El valor por defecto para una clave que no tenga regla propia.
 *
 * Que exista es lo que permite agregar una clave a `EDITABLE_SETTING_KEYS` sin
 * tocar este archivo. El tope de 300 caracteres es el freno: sin ningún límite,
 * una clave nueva aceptaría un texto de cualquier tamaño, y la tabla es de
 * configuración, no de contenido.
 */
const DEFAULT_RULE = text(300, 'El valor es demasiado largo.');

const shape = Object.fromEntries(
  EDITABLE_SETTING_KEYS.map((key) => [key, (rules[key] ?? DEFAULT_RULE).optional()]),
);

/**
 * Los cambios de configuración.
 *
 * `strict()` es la parte importante: rechaza cualquier clave que no esté en la
 * lista editable, en vez de ignorarla en silencio. Ignorarla haría que el panel
 * dijera "guardado" sobre un valor que nunca se escribió.
 *
 * Las claves son opcionales porque la pantalla manda solo lo que cambió. El
 * `refine` final exige que haya al menos una: un cuerpo vacío es un pedido sin
 * sentido, y responderlo con un 200 haría creer que se guardó algo.
 *
 * El `transform` deja el resultado en el mapa `clave → texto` que espera el
 * servicio, ya sin los `undefined` de las claves que no vinieron. Se hace acá y
 * no en el controlador para que el dato llegue a la capa de negocio con la forma
 * final: un `Object.entries(...).filter(...)` en el controlador sería lógica, y
 * el controlador solo traduce HTTP.
 */
export const updateSettingsSchema = z
  .object(shape)
  .strict()
  .refine(
    (values) => Object.values(values).some((value) => value !== undefined),
    { message: 'No mandaste ningún valor para guardar.' },
  )
  .transform((values) => ({
    values: Object.fromEntries(
      Object.entries(values).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ) as Record<string, string>,
  }));

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
