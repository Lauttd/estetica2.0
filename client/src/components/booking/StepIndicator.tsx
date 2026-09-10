import { Link } from 'react-router-dom';
import { isStepReachable, type BookingProgress } from '@/booking/booking.guard';
import { bookingPathWith } from '@/booking/booking.params';
import { BOOKING_STEPS } from '@/booking/booking.steps';
import { cn } from '@/utils/cn';

interface StepIndicatorProps {
  /** En qué paso está la persona, según la dirección. */
  currentIndex: number;
  progress: BookingProgress;
  /** La consulta actual, para que volver a un paso no pierda el día ni el profesional. */
  search: URLSearchParams;
}

/**
 * En qué parte del asistente está la persona y cuánto le falta.
 *
 * DOS FORMAS PARA EL MISMO DATO
 *
 * En un teléfono, seis etiquetas no entran y lo que se leería es una fila de
 * palabras cortadas. Ahí va la forma compacta: "Paso 3 de 6 · Día" con una barra
 * de progreso. En escritorio, donde sí entran, va la lista completa, que además
 * sirve para volver a un paso anterior de un toque.
 *
 * LAS DOS FORMAS ESTÁN EN EL DOM, PERO SOLO UNA SE ANUNCIA
 *
 * Se alternan con `hidden`, que es `display: none`, y un elemento con
 * `display: none` no existe para un lector de pantalla. Así que quien navega con
 * uno escucha una sola descripción del progreso, no dos.
 *
 * SOLO SE PUEDE VOLVER A DONDE EL ESTADO ALCANZA
 *
 * Un paso inalcanzable se dibuja como texto apagado y no como enlace: ofrecer un
 * enlace que redirige de vuelta al mismo lugar es peor que no ofrecer nada.
 */
export function StepIndicator({ currentIndex, progress, search }: StepIndicatorProps) {
  const total = BOOKING_STEPS.length;
  const current = BOOKING_STEPS[currentIndex];
  const currentLabel = current?.label ?? '';
  const position = Math.min(currentIndex + 1, total);

  return (
    <nav aria-label="Pasos para reservar el turno" className="border-b border-beige bg-cream/60">
      <div className="container-page py-3">
        {/* Forma compacta: teléfono. */}
        <div className="sm:hidden">
          <div className="flex items-center gap-3">
            {/* El paso anterior siempre se puede alcanzar: las condiciones de la
                tabla se van sumando una a la de arriba, así que si esta pantalla
                se está mostrando, la de antes también se mostraba. */}
            <PreviousLink currentIndex={currentIndex} search={search} />

            <p className="min-w-0 flex-1 truncate text-sm font-medium text-deep">
              {currentLabel}
            </p>
            <p className="shrink-0 text-xs text-ink-soft">
              Paso {position} de {total}
            </p>
          </div>

          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-beige"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-forest transition-[width] duration-300"
              style={{ width: `${(position / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Forma completa: escritorio. */}
        <ol className="hidden items-center gap-2 sm:flex">
          {BOOKING_STEPS.map((step, index) => (
            <li key={step.key} className="flex flex-1 items-center gap-2">
              <Step
                index={index}
                currentIndex={currentIndex}
                progress={progress}
                search={search}
              />
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

interface PreviousLinkProps {
  currentIndex: number;
  search: URLSearchParams;
}

/**
 * El enlace al paso anterior, para la forma compacta.
 *
 * En escritorio la lista entera es visible y volver es señalar el paso; en un
 * teléfono no hay lista, así que hace falta un enlace explícito. Se apoya en el
 * botón "atrás" del navegador, que también funciona, pero no se conforma con él:
 * quien llegó acá desde un enlace compartido no tiene historial que deshacer.
 */
function PreviousLink({ currentIndex, search }: PreviousLinkProps) {
  const previous = BOOKING_STEPS[currentIndex - 1];
  if (previous === undefined) return null;

  return (
    <Link
      to={bookingPathWith(previous.path, search)}
      className="shrink-0 text-sm text-forest"
      aria-label={`Volver a ${previous.label}`}
    >
      ‹ Volver
    </Link>
  );
}

interface StepProps {
  index: number;
  currentIndex: number;
  progress: BookingProgress;
  search: URLSearchParams;
}

function Step({ index, currentIndex, progress, search }: StepProps) {
  const step = BOOKING_STEPS[index];
  if (step === undefined) return null;

  const isCurrent = index === currentIndex;
  const isDone = index < currentIndex;
  const reachable = isStepReachable(index, progress);

  const content = (
    <>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-150',
          isCurrent && 'border-forest bg-forest text-ivory',
          isDone && 'border-sage bg-sage/20 text-forest',
          !isCurrent && !isDone && 'border-beige bg-ivory text-ink-soft',
        )}
        aria-hidden="true"
      >
        {isDone ? <CheckIcon /> : index + 1}
      </span>

      <span
        className={cn(
          'truncate text-sm',
          isCurrent ? 'font-medium text-deep' : 'text-ink-soft',
          reachable && !isCurrent && 'group-hover:text-forest',
        )}
      >
        {step.label}
      </span>
    </>
  );

  // El separador entre pasos. Va en el `<li>` como pseudo-elemento para que la
  // línea no cuente como contenido ni como paso.
  const className = cn(
    'group flex min-w-0 items-center gap-2 rounded-soft px-1 py-1',
    reachable && !isCurrent && 'cursor-pointer',
  );

  return (
    <>
      {reachable && !isCurrent ? (
        <Link
          to={bookingPathWith(step.path, search)}
          className={className}
          /* "Volver a" y no solo el nombre: quien escucha la lista necesita saber
             que ese paso es un enlace hacia atrás y no el paso actual. */
          aria-label={`Volver a ${step.label}`}
        >
          {content}
        </Link>
      ) : (
        <span className={className} aria-current={isCurrent ? 'step' : undefined}>
          {content}
        </span>
      )}

      {index < BOOKING_STEPS.length - 1 && (
        <span className="hidden h-px flex-1 bg-beige lg:block" aria-hidden="true" />
      )}
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}
