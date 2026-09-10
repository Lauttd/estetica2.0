import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useCart } from '@/cart/useCart';
import { useBooking } from '@/booking/useBooking';
import { bookingParamsFrom, bookingPathWith } from '@/booking/booking.params';
import { BOOKING_STEPS, bookingStepIndex } from '@/booking/booking.steps';
import {
  isStepReachable,
  reachableStepPath,
  type BookingProgress,
} from '@/booking/booking.guard';
import { CartBar } from '@/components/booking/CartBar';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { PATHS, type BookingStepKey } from '@/routes/paths';
import { cn } from '@/utils/cn';

/**
 * El armazón del asistente de turnos.
 *
 * Hace tres cosas y ninguna más: espera a saber qué hay guardado, impide llegar a
 * un paso para el que el estado no alcanza, y dibuja lo que rodea a las pantallas
 * —indicador, aviso y barra—.
 *
 * POR QUÉ EL PRIMER RENDER NO DIBUJA EL ASISTENTE
 *
 * El carrito y el borrador se leen de `sessionStorage` en un efecto, porque en el
 * servidor no existe `sessionStorage` y el HTML tiene que salir igual acá y allá.
 * Mientras eso no pasó, el estado que se ve es "vacío", y decidir con él sería
 * decidir con datos que todavía no llegaron: alguien con tres servicios elegidos
 * que recarga en `/turnos/resumen` vería un instante de "volvé a servicios" —y
 * React, al encontrar que el primer render del navegador no coincide con el HTML,
 * tiraría el árbol entero para volver a dibujarlo—.
 *
 * Por eso, hasta que los dos almacenamientos se leyeron, se dibuja un esqueleto.
 * Es un costo de un fotograma a cambio de que la decisión de a dónde mandar a
 * alguien se tome siempre con el estado completo.
 */
export function BookingLayout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const cart = useCart();
  const booking = useBooking();

  if (!cart.hydrated || !booking.hydrated) return <WizardSkeleton />;

  const params = bookingParamsFrom(location.search);

  const progress: BookingProgress = {
    serviceIds: cart.items.map((item) => item.serviceId),
    date: params.date,
    professionalId: params.professionalId,
    slot: booking.slot,
    customer: booking.customer,
  };

  const index = bookingStepIndex(location.pathname);

  /**
   * El techo del asistente: no se puede estar más adelante de lo que los datos
   * permiten. Si la dirección va más allá —porque alguien la escribió a mano, o
   * porque el horario elegido dejó de servir al agregar un servicio— se devuelve a
   * la persona al último paso que sí tiene sentido, y se reemplaza la entrada del
   * historial para que "atrás" no la traiga de vuelta.
   */
  if (!isStepReachable(index, progress)) {
    return (
      <Navigate
        to={bookingPathWith(reachableStepPath(progress), searchParams)}
        replace
      />
    );
  }

  const forward = FORWARD_FROM_BAR[stepKeyAt(index)];

  return (
    <>
      <StepIndicator currentIndex={index} progress={progress} search={searchParams} />

      <div
        className={cn(
          'container-page pt-8 pb-16',
          // La barra es fija: sin este espacio, taparía el final del contenido y
          // el último botón de la pantalla quedaría inalcanzable en un teléfono.
          cart.count > 0 && 'pb-36',
        )}
      >
        {booking.banner !== null && (
          <Banner
            message={booking.banner.message}
            onDismiss={() => booking.setBanner(null)}
          />
        )}

        <Outlet />
      </div>

      <CartBar
        nextPath={
          forward === undefined
            ? null
            : bookingPathWith(PATHS.bookingStepPath(forward), searchParams)
        }
        nextLabel="Continuar"
      />
    </>
  );
}

/**
 * Desde qué pasos la barra de abajo lleva al siguiente.
 *
 * Solo desde los dos primeros. En los demás, avanzar exige una decisión que la
 * barra no puede tomar: elegir un día, elegir un horario, completar los datos o
 * confirmar. Un botón "Continuar" ahí sería un botón que no hace nada hasta que
 * la persona haga otra cosa, y un botón que a veces no hace nada enseña a
 * desconfiar de los botones.
 */
const FORWARD_FROM_BAR: Partial<Record<BookingStepKey, BookingStepKey>> = {
  services: 'professional',
  professional: 'date',
};

/** La clave del paso en esa posición, o `'services'` si la posición no es de un paso. */
function stepKeyAt(index: number): BookingStepKey {
  return BOOKING_STEPS[index]?.key ?? 'services';
}

/**
 * Lo que se ve mientras se leen los almacenamientos.
 *
 * Tiene la forma del contenido —un título y unos bloques— y no un spinner
 * centrado: dura un fotograma, y un spinner que aparece y desaparece a esa
 * velocidad se percibe como un parpadeo.
 */
function WizardSkeleton() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Cargando el asistente">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="mx-auto h-8 w-56 animate-pulse rounded bg-beige/60" />
        <div className="mx-auto h-4 w-72 animate-pulse rounded bg-beige/60" />
        <div className="mt-8 h-40 animate-pulse rounded-card bg-beige/40" />
      </div>
    </div>
  );
}

interface BannerProps {
  message: string;
  onDismiss: () => void;
}

/**
 * El aviso de por qué falló el intento anterior.
 *
 * Lo dice el servidor, con sus palabras: quien escribió ese mensaje conoce el caso
 * mejor que cualquier texto que se redacte acá. Se puede cerrar porque hay errores
 * que no se arreglan desde esta pantalla, y un cartel que no se puede sacar de
 * encima termina estorbando más de lo que ayuda.
 */
function Banner({ message, onDismiss }: BannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-card border border-forest/30 bg-forest/5 px-4 py-3"
    >
      <p className="flex-1 text-sm text-deep">{message}</p>

      <button
        type="button"
        onClick={onDismiss}
        className="-mt-1 -mr-1 shrink-0 rounded-soft p-1.5 text-ink-soft transition-colors duration-150 hover:text-deep"
        aria-label="Cerrar el aviso"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </div>
  );
}
