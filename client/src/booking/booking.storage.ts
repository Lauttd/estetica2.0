// =============================================================================
// KAYA KALPA — El borrador del turno entre recargas
// =============================================================================
// Mismo criterio que el carrito: `sessionStorage` y no `localStorage` —una
// reserva a medio hacer es una intención del momento, no una preferencia— y con
// la clave versionada para que un cambio de forma no intente leer lo viejo.
//
// Se guarda todo junto bajo una sola clave y no cada cosa por su lado: se escriben
// en momentos distintos pero se descartan juntos al confirmar, y tener una sola
// clave hace que "empezar de nuevo" sea una operación y no tres que hay que
// acordarse de mantener sincronizadas.
// =============================================================================

import { z } from 'zod';
import { EMPTY_BOOKING_DRAFT, type BookingDraft } from './booking.types';

const STORAGE_KEY = 'kk.booking.v1';

/**
 * Los topes son los mismos que los del servidor.
 *
 * No es duplicación por descuido: el servidor los aplica igual, y estos están para
 * que un dato absurdo —mil caracteres de nombre pegados sin querer— no se guarde
 * en el almacenamiento del navegador ni llegue al resumen, donde el diseño se
 * rompería antes de que el servidor tenga la chance de rechazarlo.
 */
const customerSchema = z.object({
  firstName: z.string().max(60),
  lastName: z.string().max(60),
  phone: z.string().max(30),
  email: z.string().max(120),
  notes: z.string().max(500),
});

const draftSchema = z.object({
  slot: z
    .object({
      startMin: z.number().int().min(0).max(24 * 60),
      startTime: z.string().max(5),
      professionalIds: z.array(z.string().uuid()).max(50),
      // La misma forma que valida el servidor para un día de calendario. Un
      // horario guardado con una fecha ilegible se descarta entero al leer, que
      // es lo correcto: sin día, ese horario no significa nada.
      forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      forServiceIds: z.array(z.string().uuid()).max(10),
    })
    .nullable(),
  customer: customerSchema.nullable(),
});

/**
 * Lee el borrador.
 *
 * Nunca lanza: sin almacenamiento disponible o con un dato ilegible, devuelve el
 * borrador vacío. Es la misma decisión que en el carrito —un asistente que no abre
 * es peor que uno que hace repetir un paso— y acá además es la única forma de que
 * una versión vieja del sitio no deje a alguien con la página en blanco.
 */
export function readDraft(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_BOOKING_DRAFT;

    const parsed: unknown = JSON.parse(raw);
    const result = draftSchema.safeParse(parsed);

    return result.success ? result.data : EMPTY_BOOKING_DRAFT;
  } catch {
    return EMPTY_BOOKING_DRAFT;
  }
}

/** Guarda el borrador. Tampoco lanza: ver `readDraft`. */
export function writeDraft(draft: BookingDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Sin almacenamiento. El asistente sigue funcionando en memoria.
  }
}

/** Lo borra. Se llama al confirmar el turno y al empezar uno nuevo. */
export function clearStoredDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento.
  }
}
