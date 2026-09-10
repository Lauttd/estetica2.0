// =============================================================================
// KAYA KALPA — El contexto del carrito
// =============================================================================
// El contexto vive solo, en un archivo sin componentes, por una razón de
// herramientas y no de arquitectura: el recargado en caliente de Vite descarta el
// módulo entero cuando un archivo exporta un componente y algo que no lo es, y
// entonces el hook y el proveedor dejarían de compartir el contexto cada vez que
// se guarda un cambio. Es una advertencia del lint, no un error, pero es la clase
// de advertencia que se normaliza y después nadie sabe por qué el carrito se vacía
// al editar un archivo.
// =============================================================================

import { createContext } from 'react';
import type { CartItem, CartState } from './cart.types';

export interface CartContextValue extends CartState {
  /**
   * Agrega un servicio. Devuelve si se pudo.
   *
   * `false` significa que el carrito ya estaba lleno o que el servicio ya estaba
   * adentro, y quien llama tiene que decirlo en pantalla. No se lanza una
   * excepción: agregar un servicio de más no es un fallo del programa, es algo que
   * la persona tiene que saber para poder elegir qué sacar.
   */
  addItem: (item: CartItem) => boolean;
  removeItem: (serviceId: string) => void;
  clear: () => void;
  /** Cuántos servicios hay. Se usa para el contador del paso y la barra. */
  count: number;
}

export const CartContext = createContext<CartContextValue | null>(null);
