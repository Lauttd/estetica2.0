// =============================================================================
// KAYA KALPA — El proveedor del carrito
// =============================================================================
// Mantiene la selección de servicios mientras alguien recorre el asistente de
// turnos, y la conserva si recarga la página.
//
// POR QUÉ ARRANCA VACÍO Y SE LLENA DESPUÉS
//
// La página se prerenderiza: el HTML sale del build con el carrito vacío dibujado.
// Si el primer render del navegador leyera `sessionStorage` y encontrara dos
// servicios, React compararía ese resultado contra el HTML —que dice que no hay
// ninguno— y, al no coincidir, tiraría el árbol entero para volver a dibujarlo.
// Se pierde la hidratación justo en la pantalla donde el salto se nota más.
//
// Por eso el estado inicial es siempre `{ items: [], hydrated: false }`, siempre
// igual en los dos lados, y lo guardado se lee en un efecto —que corre solo en el
// navegador, después de hidratar—. Mientras tanto se muestra un esqueleto, porque
// dibujar "no elegiste nada" durante medio segundo y después corregirlo es
// exactamente el parpadeo que todo esto viene a evitar.
// =============================================================================

import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { CartContext, type CartContextValue } from './CartContext';
import { readCart, writeCart } from './cart.storage';
import {
  INITIAL_CART_STATE,
  MAX_CART_ITEMS,
  type CartAction,
  type CartItem,
  type CartState,
} from './cart.types';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    /**
     * La lectura de lo guardado.
     *
     * Marca `hydrated: true` aunque no hubiera nada guardado: lo que significa esa
     * bandera no es "hay servicios" sino "ya sé qué hay", y las dos cosas se
     * comportan distinto —una deja pasar el asistente, la otra lo espera—.
     */
    case 'hydrate':
      return { items: action.items, hydrated: true };

    case 'add': {
      // El tope y la repetición se comprueban también acá, y no solo en `addItem`:
      // el reducer es el último lugar por el que pasa un cambio de estado, y una
      // acción despachada desde otro lado —una prueba, un atajo de teclado que se
      // agregue más adelante— no tiene por qué acordarse de las reglas.
      if (state.items.length >= MAX_CART_ITEMS) return state;
      if (state.items.some((item) => item.serviceId === action.item.serviceId)) {
        return state;
      }
      return { ...state, items: [...state.items, action.item] };
    }

    case 'remove': {
      const items = state.items.filter((item) => item.serviceId !== action.serviceId);
      // Si no había nada que sacar se devuelve el mismo objeto: un estado nuevo
      // con el mismo contenido haría que todo lo que depende del carrito se
      // redibuje al pedo.
      return items.length === state.items.length ? state : { ...state, items };
    }

    case 'clear':
      return state.items.length === 0 ? state : { ...state, items: [] };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_CART_STATE);

  // La lectura va en un efecto sin dependencias: corre una sola vez, en el
  // navegador. En el servidor no se ejecuta, y está bien que así sea —ahí no hay
  // nada guardado que leer—.
  useEffect(() => {
    dispatch({ type: 'hydrate', items: readCart() });
  }, []);

  /**
   * La escritura.
   *
   * El guard de `hydrated` es lo que hace que esto no se lleve puesto lo guardado:
   * sin él, este efecto corre también en el primer render —cuando el estado
   * todavía es el vacío inicial— y escribe `[]` encima del carrito de la visita
   * anterior. El efecto que lee y el que escribe corren en el mismo commit, así
   * que el orden entre ellos no alcanza como defensa.
   */
  useEffect(() => {
    if (!state.hydrated) return;
    writeCart(state.items);
  }, [state.hydrated, state.items]);

  /**
   * Agrega y devuelve si se pudo.
   *
   * La comprobación se hace acá, contra el estado actual, y no dentro del reducer,
   * porque el reducer no puede devolver nada: quien llama necesita saber en el
   * acto si el servicio entró, para mostrar el aviso correspondiente.
   */
  const addItem = useCallback(
    (item: CartItem): boolean => {
      if (state.items.length >= MAX_CART_ITEMS) return false;
      if (state.items.some((existing) => existing.serviceId === item.serviceId)) return false;

      dispatch({ type: 'add', item });
      return true;
    },
    [state.items],
  );

  const removeItem = useCallback((serviceId: string) => {
    dispatch({ type: 'remove', serviceId });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  /**
   * El valor del contexto, memorizado.
   *
   * Sin esto se arma un objeto nuevo en cada render del proveedor, y como el
   * proveedor envuelve a todo el asistente, cualquier cambio de estado redibujaría
   * cada pantalla que consuma el carrito.
   */
  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      count: state.items.length,
      addItem,
      removeItem,
      clear,
    }),
    [state.items, state.hydrated, addItem, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
