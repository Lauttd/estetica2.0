// =============================================================================
// KAYA KALPA — Terminar la reserva al llegar a la confirmación
// =============================================================================
// Deshace el trabajo del asistente —el carrito y el borrador— cuando la
// confirmación se abre como consecuencia de haber reservado. Ver `booking.arrival.ts`
// para por qué esto pasa acá y no en `useBookingSubmit`.
//
// ES UN EFECTO Y NO UNA LIMPIEZA AL DESMONTAR
//
// Porque quien llega a la confirmación puede quedarse ahí un rato largo —leyendo
// el código, cancelando, copiándolo— y el carrito no tiene por qué seguir lleno
// mientras tanto. Además, limpiar al desmontar dejaría el estado sucio justo en el
// caso que más importa: alguien que reserva y cierra la pestaña enseguida.
//
// LA MARCA SE CONSUME
//
// La marca viaja en la entrada del historial, así que sin borrarla volvería a
// encontrarse cada vez que esa entrada se reactive. El caso concreto: alguien
// reserva, se va al catálogo, arma otro turno y aprieta "atrás" sin querer; la
// confirmación se vuelve a montar con la marca puesta y le vacía el carrito que
// acababa de armar. Se limpia una sola vez por reserva.
// =============================================================================

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/cart/useCart';
import { isJustBooked } from './booking.arrival';
import { useBooking } from './useBooking';

/** Descarta el carrito y el borrador si esta visita viene de reservar. */
export function useBookingArrival(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = useBooking();
  const cart = useCart();

  const justBooked = isJustBooked(location.state);
  const { pathname, search } = location;

  // Desestructurados para que el efecto dependa de las funciones y no de los
  // objetos de contexto, que son estables pero no evidentemente estables: con el
  // objeto entero, cualquier cambio en el proveedor volvería a disparar el efecto.
  const { reset } = booking;
  const { clear } = cart;

  useEffect(() => {
    if (!justBooked) return;

    reset();
    clear();

    /**
     * Se reemplaza la entrada por la misma dirección sin la marca.
     *
     * Es la dirección en la que ya se está, así que no se navega a ningún lado: la
     * ruta que coincide es la misma y la pantalla no se vuelve a montar. Lo único
     * que cambia es el estado del historial, que deja de decir "acá se llegó
     * reservando" —y con eso, dejar de ser una marca que se pueda gastar dos veces—.
     */
    navigate(pathname + search, { replace: true, state: null });
  }, [justBooked, reset, clear, navigate, pathname, search]);
}
