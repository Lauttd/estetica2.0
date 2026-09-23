import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';

/**
 * La barra fija de "Mis turnos" en el teléfono.
 *
 * §33 pide, además del botón flotante de WhatsApp, "un CTA fijo o fácilmente
 * accesible" para reservar, y que desde el inicio se llegue a la reserva en pocos
 * pasos. Hasta ahora, por debajo de `sm` el botón de la barra de navegación no se
 * dibujaba —no entra al lado del logo sin apretarlo— así que en un teléfono la
 * única forma de empezar a reservar desde el inicio era abrir el menú lateral.
 * Eso es "accesible", pero no "fácilmente accesible": son dos toques y un panel
 * que hay que leer antes de ver el botón.
 *
 * POR QUÉ UNA BARRA Y NO UN SEGUNDO BOTÓN FLOTANTE
 *
 * El de WhatsApp ya flota abajo a la derecha. Uno redondo al lado no entra en el
 * ancho de un teléfono, y uno apilado encima deja los dos apretados contra el
 * borde y tapa el texto que hay detrás justo a la altura de lectura. La barra, en
 * cambio, ocupa la franja de abajo y el contenido pasa por debajo: es la misma
 * forma que ya usa la barra del carrito dentro del asistente (`CartBar`), para la
 * misma clase de decisión —una acción principal que acompaña el scroll—.
 *
 * POR QUÉ DESAPARECE A PARTIR DE `sm` Y NUNCA SE SUPERPONE CON EL NAVBAR
 *
 * El botón del navbar se dibuja desde `sm` para arriba y esta barra hasta `sm`
 * exclusivo: en cualquier ancho hay exactamente un "Reservar turno" a la vista.
 * Si la barra llegara más arriba, en una tablet chica estaría el mismo botón dos
 * veces en la misma pantalla.
 *
 * DENTRO DEL ASISTENTE NO VA
 *
 * Ahí abajo ya está la barra del carrito, que es la acción de ese momento, y quien
 * está reservando no necesita que le ofrezcan reservar. La decide `RootLayout`,
 * que es quien conoce la dirección; el botón flotante de WhatsApp se esconde con
 * la misma regla desde la Fase 2.
 */
export function BookingBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-beige bg-ivory/95 backdrop-blur-sm sm:hidden">
      {/* `py-2.5` y no `py-3`: la barra se come una franja del alto de la pantalla
          en cada página, y el botón ya tiene su propio relleno. */}
      <div className="container-page py-2.5">
        <Link to={PATHS.myBookings} className={buttonStyles({ fullWidth: true })}>
          Mis turnos
        </Link>
      </div>
    </div>
  );
}
