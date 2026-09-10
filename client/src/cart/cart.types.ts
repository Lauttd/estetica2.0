// =============================================================================
// KAYA KALPA — El carrito de servicios
// =============================================================================
// Es la selección de servicios que la persona arma antes de elegir día y horario.
// No es un carrito de compras: acá no se paga nada, y lo único que hace es llevar
// la lista de un paso al siguiente del asistente de turnos.
//
// POR QUÉ GUARDA UNA COPIA Y NO SOLO LOS IDENTIFICADORES
//
// Alcanzaría con guardar los ids y pedir los servicios a la API en cada paso. Se
// guarda además lo que hace falta para dibujarlos —nombre, precio, duración,
// categoría— por una razón concreta: el resumen del último paso tiene que mostrar
// exactamente lo que la persona vio cuando lo agregó, y volviendo a pedirlo podría
// llegar un precio distinto si la estética lo cambió mientras alguien completaba
// el formulario. La reserva igual se hace contra los ids, y el servidor recalcula
// los precios al confirmar: esto es lo que se muestra, no lo que se cobra.
// =============================================================================

export interface CartItem {
  serviceId: string;
  /** Para poder enlazar a la ficha desde el resumen. */
  slug: string;
  name: string;
  /** `null` = a consultar. Nunca se convierte en cero (§41). */
  priceCents: number | null;
  currency: string;
  /**
   * No puede ser `null`: solo se pueden agregar servicios que el servidor marca
   * como reservables online, y esa marca exige una duración cargada. Un servicio
   * sin duración no se puede agendar, así que no llega hasta acá.
   */
  durationMin: number;
  categoryName: string;
}

/**
 * El tope de servicios por turno.
 *
 * Es el mismo número que el `max(10)` de `createBookingSchema` en el servidor, y
 * el mismo texto que devuelve su error. Se repite acá para poder frenar antes de
 * mandar la petición, pero el que decide sigue siendo el servidor: si los dos
 * números se separan, la persona ve el mensaje del servidor, no este.
 */
export const MAX_CART_ITEMS = 10;

/** El texto del servidor, copiado tal cual para que se lea una sola voz. */
export const CART_FULL_MESSAGE =
  'No se pueden reservar más de 10 servicios en un mismo turno.';

export interface CartState {
  items: CartItem[];
  /**
   * Si ya se leyó lo guardado en `sessionStorage`.
   *
   * Arranca en `false` y eso no es un detalle: el primer render tiene que ser
   * idéntico en el servidor y en el navegador, y en el servidor no hay
   * `sessionStorage`. Leerlo en el render haría que el HTML prerenderizado y el
   * primer render del navegador no coincidieran, y React tiraría el árbol entero
   * para volver a dibujarlo.
   */
  hydrated: boolean;
}

/**
 * El estado del que arranca todo, siempre.
 *
 * Es una constante y no una función que lea el almacenamiento porque tiene que
 * poder evaluarse en el servidor. Lo guardado se lee después, en un efecto.
 */
export const INITIAL_CART_STATE: CartState = { items: [], hydrated: false };

export type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; serviceId: string }
  | { type: 'clear' };
