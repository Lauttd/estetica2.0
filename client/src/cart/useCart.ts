import { useContext } from 'react';
import { CartContext, type CartContextValue } from './CartContext';

/**
 * El carrito, desde cualquier componente del asistente.
 *
 * Lanza si no hay proveedor en vez de devolver un carrito vacío. La diferencia
 * importa: un carrito vacío silencioso haría que una pantalla montada fuera del
 * proveedor —cosa de una refactorización, no de un uso normal— se viera
 * perfectamente bien y perdiera lo que la persona eligió sin que nada lo delate.
 * Un error en el arranque se ve la primera vez que se abre esa pantalla.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (context === null) {
    throw new Error('useCart tiene que usarse dentro de <CartProvider>.');
  }

  return context;
}
