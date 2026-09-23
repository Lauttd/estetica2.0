import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { useCart } from '@/cart/useCart';
import { useBooking } from '@/booking/useBooking';
import { bookingParamsFrom, bookingPathWith } from '@/booking/booking.params';
import { useAvailability } from '@/queries/availability.queries';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import { formatLongDateOnly } from '@/utils/format';
import type { AvailabilitySlot } from '@/types/booking';

/**
 * Paso 4 del asistente: a qué hora (pasos 6 y 7 de §19).
 *
 * ACÁ SE VE §20 ENTERA
 *
 * Esta pantalla no decide nada sobre los horarios. Pide `/api/availability` y
 * dibuja la respuesta: **mismo conjunto, mismo orden, mismo texto**. No filtra los
 * que ya pasaron, no ordena por hora, no junta los repetidos, no descarta los que
 * no puede cubrir algún profesional. Cada una de esas cosas parece inofensiva y
 * cada una puede ofrecer un horario que ya no existe: el servidor armó esa lista
 * sabiendo qué está reservado en este instante, y cualquier recálculo local trabaja
 * con una foto vieja.
 *
 * Por eso también se muestra `startTime` tal como llega y **nunca se formatea
 * `startMin`**. Los dos representan lo mismo; el segundo es el que se manda al
 * reservar. Pasarlo a texto en el cliente es la puerta de entrada a que la pantalla
 * diga "9:30" y el turno se guarde a las 9:00.
 *
 * DOS LISTAS VACÍAS QUE NO SON LO MISMO
 *
 * `closed: true` es "ese día no atendemos" y `closed: false` con `slots: []` es
 * "ese día está completo". El primero se arregla eligiendo otro día; el segundo,
 * eligiendo otro horario en otro día. Un solo mensaje para los dos haría que
 * alguien creyera que la estética no abre los sábados cuando en realidad el sábado
 * estaba lleno, y se iría del sitio con esa idea.
 */
export function StepSlot() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const booking = useBooking();

  const params = bookingParamsFrom(searchParams);
  const serviceIds = cart.items.map((item) => item.serviceId);
  const date = params.date;

  /**
   * La consulta se declara antes de mirar si hay fecha.
   *
   * Los hooks no pueden quedar después de un `return`, así que el orden es este:
   * primero la consulta —deshabilitada mientras no haya fecha, para no pedir
   * horarios de un día que no existe— y recién después la salida temprana.
   */
  const availability = useAvailability(
    {
      serviceIds,
      date: date ?? '',
      professionalId: params.professionalId ?? undefined,
    },
    date !== null && serviceIds.length > 0,
  );

  // El guard del armazón ya redirige cuando no hay fecha elegida. Esto es para que
  // el tipo de `date` sea estrecho de acá en adelante y no haya que pasar una
  // cadena vacía a la consulta ni preguntar por `null` en cada uso.
  if (date === null) {
    return <Navigate to={PATHS.bookingStepPath('date')} replace />;
  }

  /**
   * Elegir el horario.
   *
   * Es una función asignada a una constante y no una declaración `function` por una
   * razón concreta: una declaración se iza, así que TypeScript no puede saber si se
   * la llama antes del `if` de arriba y descarta el estrechamiento de `date` dentro
   * del cuerpo. Con una constante, el estrechamiento vale y no hace falta ni un
   * `as string` ni una comprobación repetida.
   */
  const choose = (slot: AvailabilitySlot) => {
    booking.setSlot({
      startMin: slot.startMin,
      startTime: slot.startTime,
      professionalIds: slot.professionalIds,
      forDate: date,
      // Ordenados por el mismo motivo por el que van ordenados en la clave de
      // caché: que la validez del horario no dependa del orden en que se agregaron
      // los servicios al carrito.
      forServiceIds: [...serviceIds].sort(),
    });

    navigate(bookingPathWith(PATHS.bookingStepPath('details'), searchParams));
  };

  const result = availability.data;
  const changeDayPath = bookingPathWith(PATHS.bookingStepPath('date'), searchParams);

  return (
    <>
      <PageMeta
        title="Elegí el horario de tu turno"
        description="Mirá los horarios libres para el día que elegiste y reservá tu turno en KAYA KALPA."
      />

      <PageHeader
        title="¿A qué hora?"
        subtitle={`Horarios libres del ${formatLongDateOnly(date)}.`}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          <Link
            to={changeDayPath}
            className="text-forest underline decoration-forest/30 underline-offset-4 transition-colors duration-150 hover:decoration-forest"
          >
            Cambiar el día
          </Link>
        </div>

        {availability.isPending ? (
          <SlotSkeleton />
        ) : availability.isError ? (
          <ErrorBox
            message={
              availability.error instanceof Error
                ? availability.error.message
                : 'No pudimos ver los horarios de ese día. Volvé a intentar en unos minutos.'
            }
            retryPath={changeDayPath}
          />
        ) : result === undefined ? null : result.closed ? (
          <ClosedDay date={date} changeDayPath={changeDayPath} />
        ) : result.slots.length === 0 ? (
          <FullDay date={date} changeDayPath={changeDayPath} />
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {result.slots.map((slot) => (
              <li key={slot.startMin}>
                <SlotButton
                  slot={slot}
                  selected={
                    booking.slot !== null &&
                    booking.slot.forDate === date &&
                    booking.slot.startMin === slot.startMin
                  }
                  onSelect={() => choose(slot)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface SlotButtonProps {
  slot: AvailabilitySlot;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Un horario.
 *
 * El texto es `slot.startTime` sin tocar. La clave de la lista es `startMin` y no
 * el texto porque es el número que el servidor usa para identificarlo —si alguna
 * vez dos horarios se escribieran igual, el texto repetiría clave y React perdería
 * filas—.
 */
function SlotButton({ slot, selected, onSelect }: SlotButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-soft border px-3 py-3 text-base font-medium transition-colors duration-150',
        selected
          ? 'border-forest bg-forest text-ivory'
          : 'border-beige bg-ivory text-ink hover:border-sage hover:text-forest',
      )}
    >
      {slot.startTime}
    </button>
  );
}

/** El día no se atiende. Se arregla eligiendo otro día, y eso es lo que se ofrece. */
function ClosedDay({ date, changeDayPath }: { date: string; changeDayPath: string }) {
  return (
    <div className="rounded-card border border-beige bg-ivory p-8 text-center">
      <p className="text-base text-ink">
        El {formatLongDateOnly(date)} no atendemos.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Probá con otro día de la semana.
      </p>

      <Link
        to={changeDayPath}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Elegir otro día
      </Link>
    </div>
  );
}

/** El día se atiende pero no queda lugar. Se arregla igual, pero por otro motivo. */
function FullDay({ date, changeDayPath }: { date: string; changeDayPath: string }) {
  return (
    <div className="rounded-card border border-beige bg-ivory p-8 text-center">
      <p className="text-base text-ink">
        El {formatLongDateOnly(date)} ya no tiene horarios libres para estos
        tratamientos.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Podés probar con otro día, o escribirnos y vemos qué se puede hacer.
      </p>

      <Link
        to={changeDayPath}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Elegir otro día
      </Link>
    </div>
  );
}

function ErrorBox({ message, retryPath }: { message: string; retryPath: string }) {
  return (
    <div
      className="rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>

      <Link
        to={retryPath}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Elegir otro día
      </Link>
    </div>
  );
}

function SlotSkeleton() {
  return (
    <ul
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
      aria-busy="true"
      aria-label="Cargando los horarios"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <li key={index} className="h-12 animate-pulse rounded-soft bg-beige/50" />
      ))}
    </ul>
  );
}
