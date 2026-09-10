import { Outlet } from 'react-router-dom';
import { CartProvider } from '@/cart/CartProvider';
import { BookingProvider } from './BookingProvider';

/**
 * Los dos proveedores del asistente, juntos.
 *
 * VAN SOLO EN `/turnos/*` Y NO EN TODA LA APLICACIÓN
 *
 * El carrito y el borrador leen `sessionStorage` al montarse. Montarlos arriba de
 * todo haría que cada visita al sitio —incluida la portada, que es la página que
 * más gente ve— pagara dos lecturas de almacenamiento y dos efectos para un estado
 * que solo existe dentro del asistente.
 *
 * Están los dos en el mismo componente porque comparten el mismo alcance: el
 * carrito dice **qué** se va a reservar y el borrador dice **cuándo y con quién**,
 * y ninguno de los dos tiene sentido sin el otro. Ponerlos en dos rutas distintas
 * dejaría abierta la posibilidad de montar uno sin el otro, y eso no es un estado
 * que el asistente sepa manejar.
 *
 * El alcance incluye la confirmación y la consulta, que están fuera del asistente
 * pero cuelgan de la misma dirección: la confirmación limpia el carrito al
 * llegar, así que necesita el proveedor montado para poder hacerlo.
 */
export function BookingProviders() {
  return (
    <CartProvider>
      <BookingProvider>
        <Outlet />
      </BookingProvider>
    </CartProvider>
  );
}
