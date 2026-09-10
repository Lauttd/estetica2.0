import { Navigate, type RouteObject } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { HomePage } from '@/pages/Home/HomePage';
import { ServicesPage } from '@/pages/Services/ServicesPage';
import { ServiceDetailPage } from '@/pages/ServiceDetail/ServiceDetailPage';
import { BookingProviders } from '@/booking/BookingProviders';
import { BookingLayout } from '@/pages/Booking/BookingLayout';
import { BookingConfirmedPage } from '@/pages/Booking/BookingConfirmedPage';
import { BookingLookupPage } from '@/pages/Booking/BookingLookupPage';
import { StepServices } from '@/pages/Booking/steps/StepServices';
import { StepProfessional } from '@/pages/Booking/steps/StepProfessional';
import { StepDate } from '@/pages/Booking/steps/StepDate';
import { StepSlot } from '@/pages/Booking/steps/StepSlot';
import { StepDetails } from '@/pages/Booking/steps/StepDetails';
import { StepSummary } from '@/pages/Booking/steps/StepSummary';
import { FIRST_BOOKING_STEP } from '@/booking/booking.steps';
import { AboutPage } from '@/pages/About/AboutPage';
import { ContactPage } from '@/pages/Contact/ContactPage';
import { GalleryPage } from '@/pages/Gallery/GalleryPage';
import { FaqPage } from '@/pages/Faq/FaqPage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { PATHS } from './paths';

/**
 * La tabla de rutas del sitio.
 *
 * Está separada de `router.tsx`, que es quien la conecta al historial del
 * navegador, por una razón concreta: `createBrowserRouter` necesita `document` y
 * por lo tanto solo funciona en el navegador. Esta tabla, en cambio, es una
 * descripción y sirve en cualquier lado — el prerenderizado de la fase de SEO
 * corre en Node y la necesita para saber qué páginas generar.
 *
 * Si estuvieran en el mismo archivo, importar la tabla desde Node arrastraría el
 * router del navegador y reventaría al cargar el módulo.
 */

/**
 * Pasa una dirección de `PATHS` a la forma que espera el router.
 *
 * Las rutas hijas se declaran **relativas** a la del padre —`servicios`, no
 * `/servicios`—, y derivarlas de `PATHS` en vez de volver a escribirlas es lo
 * que hace cierto que las URLs del sitio y las rutas que las atienden sean una
 * sola lista y no dos que hay que acordarse de mantener iguales.
 */
function child(path: string): string {
  return path.replace(/^\//, '');
}

export const routes: RouteObject[] = [
  {
    path: PATHS.home,
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },

      { path: child(PATHS.services), element: <ServicesPage /> },
      // El `:slug` es lo único que no puede salir de `PATHS`: un parámetro de
      // ruta no es una dirección, y `PATHS.serviceDetail` recibe el valor ya
      // resuelto. Es la única duplicación de este archivo, y a propósito.
      { path: `${child(PATHS.services)}/:slug`, element: <ServiceDetailPage /> },

      /**
       * El asistente de turnos.
       *
       * Tres niveles y cada uno tiene su motivo:
       *
       *   · `BookingProviders` envuelve todo `/turnos`, incluidas la confirmación y
       *     la consulta. Es donde viven el carrito y el borrador del turno, y los
       *     dos hacen falta en las tres partes: la confirmación lee el turno recién
       *     creado y el carrito tiene que poder vaciarse al reservar.
       *
       *   · `BookingLayout` envuelve solo los pasos: dibuja el indicador de progreso
       *     y la barra del carrito, y aplica el guard que redirige si la dirección
       *     va más lejos de lo que el estado permite. La confirmación no lo lleva —
       *     quien ya reservó no tiene pasos que mirar—.
       *
       *   · El índice redirige al primer paso en vez de dibujar una pantalla propia:
       *     `/turnos` a secas es lo que se comparte y lo que queda en el historial, y
       *     tiene que llevar al principio del asistente.
       */
      {
        path: child(PATHS.booking),
        element: <BookingProviders />,
        children: [
          { index: true, element: <Navigate to={FIRST_BOOKING_STEP.path} replace /> },
          {
            element: <BookingLayout />,
            children: [
              { path: PATHS.bookingStep.services, element: <StepServices /> },
              { path: PATHS.bookingStep.professional, element: <StepProfessional /> },
              { path: PATHS.bookingStep.date, element: <StepDate /> },
              { path: PATHS.bookingStep.slot, element: <StepSlot /> },
              { path: PATHS.bookingStep.details, element: <StepDetails /> },
              { path: PATHS.bookingStep.summary, element: <StepSummary /> },
            ],
          },
          // `:code` es un parámetro de ruta y no una dirección, así que no puede
          // salir de `PATHS` —igual que el `:slug` de los servicios—. Lo que sí sale
          // de ahí es el segmento que lo contiene.
          {
            path: `${PATHS.bookingPage.confirmed}/:code`,
            element: <BookingConfirmedPage />,
          },
          { path: PATHS.bookingPage.lookup, element: <BookingLookupPage /> },
        ],
      },
      { path: child(PATHS.about), element: <AboutPage /> },
      { path: child(PATHS.contact), element: <ContactPage /> },
      { path: child(PATHS.gallery), element: <GalleryPage /> },
      { path: child(PATHS.faq), element: <FaqPage /> },

      // Va último y sin ruta propia: atrapa cualquier dirección que no haya
      // coincidido con las de arriba.
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
