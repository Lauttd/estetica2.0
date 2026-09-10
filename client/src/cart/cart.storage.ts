// =============================================================================
// KAYA KALPA — Dónde vive el carrito entre recargas
// =============================================================================
// En `sessionStorage` y no en `localStorage`, que es la decisión que importa acá.
//
// `localStorage` es para preferencias: sobrevive al cierre del navegador y lo
// comparten todas las pestañas. Un carrito no es una preferencia, es una intención
// transitoria —"quiero sacar turno ahora"— y guardarlo para siempre significa que
// dentro de un mes alguien abre la página y se encuentra con los servicios que
// había elegido para una fecha que ya pasó. Peor: con `localStorage`, dos pestañas
// abiertas comparten la selección, y dos reservas simultáneas se pelearían por el
// mismo carrito. `sessionStorage` es por pestaña y se va con ella.
//
// Se guarda con la clave versionada para que un cambio de forma no intente leer
// datos viejos con el formato nuevo. Igual se valida al leer: la versión protege
// del cambio propio, la validación protege de todo lo demás.
// =============================================================================

import { z } from 'zod';
import type { CartItem } from './cart.types';
import { MAX_CART_ITEMS } from './cart.types';

const STORAGE_KEY = 'kk.cart.v1';

/**
 * La forma de lo guardado.
 *
 * Se valida al leer y no se confía en que sea nuestro: `sessionStorage` lo puede
 * escribir cualquier script de la página —una extensión, un fragmento de terceros
 * que algún día se agregue— y un dato con la forma equivocada se cuela hasta el
 * render, donde revienta con un error que no dice de dónde vino.
 *
 * `durationMin` es un entero positivo y no un número cualquiera: es lo que hace
 * que un elemento inválido no pueda llegar al paso de horarios con una duración
 * absurda.
 */
const cartItemSchema = z.object({
  serviceId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().min(0).nullable(),
  currency: z.string().min(1).max(3),
  durationMin: z.number().int().positive(),
  categoryName: z.string(),
});

/**
 * La lista guardada, acotada al tope.
 *
 * El `.max()` también acá y no solo al agregar: si una versión anterior del sitio
 * hubiera guardado once, la lista no se descarta entera —lo que se pierde son los
 * que sobran, y quien tenía once se queda con diez—. Descartar todo por un
 * elemento de más sería castigar a la persona por un error nuestro.
 */
const storedCartSchema = z.array(cartItemSchema).max(MAX_CART_ITEMS);

/**
 * Lee el carrito guardado.
 *
 * Nunca lanza. Devuelve una lista vacía ante cualquier problema —sin
 * almacenamiento disponible, un dato de otra versión, basura escrita por otro
 * script— porque la alternativa sería que el asistente de turnos no abra, y un
 * carrito vacío es un estado con el que la página sabe trabajar perfectamente.
 */
export function readCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];

    const parsed: unknown = JSON.parse(raw);
    const result = storedCartSchema.safeParse(parsed);

    return result.success ? result.data : [];
  } catch {
    // Almacenamiento bloqueado (Safari en modo privado, cookies de terceros
    // desactivadas) o un JSON que no se puede parsear. Los dos casos significan lo
    // mismo desde acá: no hay nada que recuperar.
    return [];
  }
}

/**
 * Guarda el carrito.
 *
 * Tampoco lanza: si el almacenamiento está lleno o bloqueado, el carrito sigue
 * funcionando durante la visita —vive en memoria— y lo único que se pierde es
 * sobrevivir a una recarga. Fallar la reserva por no poder escribir acá sería
 * desproporcionado.
 */
export function writeCart(items: CartItem[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Sin almacenamiento. Ver arriba.
  }
}

/** Lo borra. Se llama al confirmar la reserva y al vaciar el carrito a mano. */
export function clearStoredCart(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento. Ver arriba.
  }
}
