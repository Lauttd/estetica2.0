import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { WhatsAppFab } from './WhatsAppFab';
import { bookingStepIndex } from '@/booking/booking.steps';

/**
 * El armazón de todas las páginas públicas.
 *
 * El orden de los elementos no es casual: el enlace de salto va primero para que
 * sea lo primero que encuentra quien navega con el teclado, y `<main>` envuelve
 * solo el contenido —ni la navbar ni el pie—, que es lo que hace que un lector
 * de pantalla pueda saltar directo a lo que cambió al navegar.
 */
export function RootLayout() {
  const location = useLocation();

  /**
   * El botón de WhatsApp se esconde dentro del asistente de turnos.
   *
   * Los dos son fijos y los dos viven abajo a la derecha: en los pasos del
   * asistente se pisarían, y el de WhatsApp —que está por encima— taparía el botón
   * de continuar de la barra del carrito, que es el que la persona necesita en ese
   * momento. Esconderlo no pierde nada: quien está reservando ya eligió ese camino,
   * y el contacto sigue en el pie y en la página de contacto.
   *
   * La pantalla de confirmación y la de consulta **no** cuentan como asistente:
   * `bookingStepIndex` devuelve -1 para ellas, así que ahí el botón vuelve a
   * aparecer, que es donde tiene sentido ofrecer escribir si algo salió mal.
   */
  const insideWizard = bookingStepIndex(location.pathname) >= 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Visible solo al enfocarlo con el teclado. Sin esto, llegar al contenido
          exige tabular por los seis enlaces de la navbar en cada página. */}
      <a
        href="#contenido"
        className="focus:bg-forest focus:text-ivory sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-soft focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>

      <Navbar />

      <main id="contenido" className="flex-1">
        <Outlet />
      </main>

      <Footer />
      {!insideWizard && <WhatsAppFab />}

      {/* Devuelve la página al lugar donde estaba al volver atrás, y arriba de
          todo al navegar a una página nueva. Sin esto, React Router deja la
          posición del scroll donde estaba y se entra a la mitad de la página. */}
      <ScrollRestoration />
    </div>
  );
}
