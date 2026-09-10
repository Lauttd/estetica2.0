import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { useCart } from '@/cart/useCart';
import { bookingParamsFrom, bookingPathWith, withBookingParams } from '@/booking/booking.params';
import { useProfessionals } from '@/queries/professionals.queries';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import type { Professional } from '@/types/booking';

/**
 * Paso 2 del asistente: con quién (paso 4 de §19).
 *
 * ELEGIR ES OPCIONAL, Y ESO SE VE EN LA PRIMERA OPCIÓN
 *
 * "Cualquiera disponible" no es un relleno: es la respuesta que quiere dar la
 * mayoría, y es la que deja al servidor asignar el turno al profesional que mejor
 * le acomode según la prioridad que la estética configuró. Ponerla primera y con
 * el mismo peso que las demás es lo que hace que nadie sienta que tiene que
 * elegir a alguien para poder seguir.
 *
 * NO SE SALTEA EL PASO CUANDO HAY UN SOLO PROFESIONAL
 *
 * Sería tentador: si no hay nada que elegir, ¿para qué mostrarlo? Pero un paso que
 * se saltea solo no se puede deshacer. Alguien que viene de elegir el día y toca
 * "atrás" volvería a este paso y rebotaría de nuevo hacia adelante, y el botón
 * parecería roto. Un toque de más es más barato que un botón que no responde.
 *
 * LA LISTA LA FILTRA EL SERVIDOR
 *
 * Se piden los profesionales de los servicios elegidos, y quién puede hacer qué
 * vive en la base y se edita desde el panel. Traerlos a todos y filtrar acá
 * ofrecería a alguien que no hace ese tratamiento, y el error aparecería recién al
 * confirmar el turno, con un mensaje que no habla de esta pantalla.
 */
export function StepProfessional() {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useCart();

  const params = bookingParamsFrom(location.search);
  const serviceIds = cart.items.map((item) => item.serviceId);

  const professionals = useProfessionals(serviceIds);

  function choose(professionalId: string | null) {
    const next = withBookingParams(new URLSearchParams(location.search), {
      professionalId,
    });

    // Elegir avanza: no hay nada más que hacer en esta pantalla, y pedir un
    // "siguiente" después de una única decisión es un toque de más.
    navigate(bookingPathWith(PATHS.bookingStepPath('date'), next));
  }

  return (
    <>
      <PageMeta
        title="Elegí con quién querés tu turno"
        description="Elegí a la profesional que te va a atender, o dejá que te asignemos la primera disponible para el día y el horario que elijas."
      />

      <PageHeader
        title="¿Con quién preferís?"
        subtitle="Podés elegir a alguien en particular o dejar que te asignemos la primera que tenga lugar ese día."
      />

      {professionals.isPending ? (
        <ListSkeleton />
      ) : professionals.isError ? (
        <ErrorBox
          message={
            professionals.error instanceof Error
              ? professionals.error.message
              : 'No pudimos cargar las profesionales. Volvé a intentar en unos minutos.'
          }
        />
      ) : professionals.data.length === 0 ? (
        <NobodyAvailable />
      ) : (
        <ul className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
          <li>
            <ProfessionalOption
              name="Cualquiera disponible"
              description="Le asignamos el turno a la primera que tenga ese horario libre."
              selected={params.professionalId === null}
              onSelect={() => choose(null)}
            />
          </li>

          {professionals.data.map((professional) => (
            <li key={professional.id}>
              <ProfessionalOption
                professional={professional}
                name={professional.name}
                description={professional.title ?? ''}
                selected={params.professionalId === professional.id}
                onSelect={() => choose(professional.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface ProfessionalOptionProps {
  professional?: Professional;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Una opción de la lista.
 *
 * Es un `<button>` con `aria-pressed` y no un enlace a la dirección siguiente: la
 * elección no es una dirección distinta, es un dato que viaja en la dirección.
 * Con un enlace, abrir la opción en otra pestaña no tendría sentido —no hay nada
 * que ver del otro lado— y el estado elegido no se podría anunciar.
 */
function ProfessionalOption({
  professional,
  name,
  description,
  selected,
  onSelect,
}: ProfessionalOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-4 rounded-card border p-4 text-left transition-colors duration-150',
        selected
          ? 'border-forest bg-forest/5'
          : 'border-beige bg-ivory hover:border-sage',
      )}
    >
      <Avatar professional={professional} name={name} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-deep">{name}</span>
        {description.length > 0 && (
          <span className="mt-0.5 block truncate text-sm text-ink-soft">
            {description}
          </span>
        )}
      </span>

      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-forest bg-forest text-ivory' : 'border-beige',
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M3.5 8.5l3 3 6-6.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

interface AvatarProps {
  professional: Professional | undefined;
  name: string;
}

/**
 * La foto de la profesional, o sus iniciales.
 *
 * Sin foto —que es el caso de hoy: la estética todavía no cargó ninguna— se
 * dibujan las iniciales sobre el color que la profesional tiene asignado en el
 * panel. Es mejor que un hueco gris: el color se eligió para distinguirla de las
 * demás y sigue cumpliendo esa función.
 *
 * El `alt` no repite el nombre: la imagen está al lado del nombre y un lector de
 * pantalla lo leería dos veces. Va vacío, que es lo correcto para una imagen
 * decorativa que acompaña a un texto.
 */
function Avatar({ professional, name }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  if (professional?.avatar != null && professional.avatar.length > 0) {
    return (
      <img
        src={professional.avatar}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium text-ivory"
      // El color lo elige la estética desde el panel y viene con el formato que
      // impone la base (`#4C6548`). Se aplica como color de fondo y nada más: no
      // se interpola en ningún otro lado.
      style={{ backgroundColor: professional?.color ?? '#7A8C72' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function NobodyAvailable() {
  return (
    <div className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center">
      <p className="text-base text-ink">
        Ninguna profesional de la estética tiene asignados estos tratamientos.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Puede ser que se hayan cambiado las asignaciones hace poco. Escribinos y lo
        resolvemos.
      </p>

      <Link
        to={PATHS.bookingStepPath('services')}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Elegir otros servicios
      </Link>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul
      className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Cargando las profesionales"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="h-20 animate-pulse rounded-card bg-beige/50" />
      ))}
    </ul>
  );
}
