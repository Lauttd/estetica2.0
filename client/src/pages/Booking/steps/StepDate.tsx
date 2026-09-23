import { useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { bookingParamsFrom, bookingPathWith, withBookingParams } from '@/booking/booking.params';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import {
  addDays,
  formatDayOfMonth,
  formatLongDateOnly,
  formatWeekdayShort,
  todayDateOnly,
} from '@/utils/format';

/**
 * Cuántos días hacia adelante se ofrecen como atajos.
 *
 * Es una **comodidad, no una regla**. La regla la tiene el servidor: si la fecha
 * cae fuera de la ventana de reserva responde `OUTSIDE_BOOKING_WINDOW` y el
 * asistente lo explica. Poner acá el mismo límite sería tener la regla escrita en
 * dos lugares, y el día que la estética cambie `MAX_ADVANCE_DAYS` esta pantalla
 * seguiría recortando por el valor viejo sin que nadie lo note.
 *
 * Noventa días es "hasta fin de temporada": cubre lo que alguien reserva con
 * anticipación y deja el calendario del navegador acotado a algo navegable.
 */
const DATE_RANGE_HINT_DAYS = 90;

/** Cuántos atajos de día se muestran. Una semana entra en una fila de teléfono. */
const QUICK_DAYS = 7;

/**
 * Paso 3 del asistente: cuándo (paso 5 de §19).
 *
 * LOS SIETE PRÓXIMOS DÍAS COMO ATAJOS, Y EL CALENDARIO DEBAJO
 *
 * La mayoría de los turnos se reservan para esta semana. Siete botones resuelven
 * ese caso con un toque; el calendario está para el resto, que es la minoría pero
 * existe —una boda en noviembre, un viaje—. Ofrecer solo el calendario obligaría a
 * abrir un selector nativo para elegir "mañana", que es lo que más se elige.
 *
 * NINGÚN DÍA SE DESHABILITA POR CÁLCULO PROPIO (§20)
 *
 * Sería fácil marcar los domingos en gris "porque no abre". Pero los horarios del
 * salón viven en la base, los edita la estética desde el panel, y una copia acá se
 * desactualiza el día que agregan un sábado por la tarde. Todos los días se pueden
 * elegir; el que no se atiende lo dice la pantalla siguiente, con el `closed: true`
 * que devolvió el servidor.
 *
 * ELEGIR AVANZA, IGUAL QUE EN EL PASO DEL PROFESIONAL
 *
 * No hay un "siguiente" después de tocar un día: la decisión está tomada y pedir un
 * toque más para confirmarla sobra. Volver es un toque en el indicador de arriba.
 */
export function StepDate() {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * El día de hoy, calculado una sola vez al montar.
   *
   * No se llama a `todayDateOnly()` en cada render a propósito: esta pantalla no se
   * prerenderiza —el asistente entero queda afuera del prerender porque su estado
   * vive en `sessionStorage`—, así que la fecha del build no puede filtrarse al
   * HTML. Calcularla una vez igual es lo correcto: deja de ser una lectura de reloj
   * repetida en cada render y no hay forma de que la fila de días se corra sola si
   * alguien deja la pestaña abierta cruzando la medianoche.
   */
  const [today] = useState(() => todayDateOnly());

  const params = bookingParamsFrom(location.search);
  const days = Array.from({ length: QUICK_DAYS }, (_, index) => addDays(today, index));

  function choose(date: string) {
    const next = withBookingParams(new URLSearchParams(location.search), { date });
    navigate(bookingPathWith(PATHS.bookingStepPath('slot'), next));
  }

  function onCalendarChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    // Un campo de fecha vaciado manda `''`. No es una fecha, así que no se navega:
    // la persona está por escribir otra y llevarla al paso siguiente sería sacarle
    // el campo de abajo de las manos.
    if (value.length > 0) choose(value);
  }

  return (
    <>
      <PageMeta
        title="Elegí el día de tu turno"
        description="Elegí el día en el que querés tu turno en KAYA KALPA. Vas a ver los horarios libres de ese día y podés cambiarlo cuando quieras."
      />

      <PageHeader
        title="¿Qué día te queda bien?"
        subtitle="Elegí uno de los próximos días o buscá una fecha más adelante."
      />

      <div className="mx-auto max-w-3xl space-y-8">
        <section aria-labelledby="proximos-dias">
          <h2 id="proximos-dias" className="sr-only">
            Próximos días
          </h2>

          <ul className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-7 sm:overflow-visible sm:pb-0">
            {days.map((day, index) => (
              <li key={day} className="shrink-0 sm:shrink">
                <DayChip
                  date={day}
                  // "Hoy" y "mañana" se nombran; del tercero en adelante el día de
                  // la semana alcanza y el nombre completo sería más largo que el
                  // botón.
                  label={index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : undefined}
                  selected={params.date === day}
                  onSelect={() => choose(day)}
                />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="otra-fecha"
          className="rounded-card border border-beige bg-ivory p-6"
        >
          <h2 id="otra-fecha" className="text-base font-medium text-deep">
            Buscar otra fecha
          </h2>

          <p className="mt-1 text-sm text-ink-soft">
            Podés reservar hasta {DATE_RANGE_HINT_DAYS} días para adelante.
          </p>

          <label htmlFor="fecha-turno" className="sr-only">
            Fecha del turno
          </label>

          <input
            id="fecha-turno"
            type="date"
            value={params.date ?? ''}
            min={today}
            /* El tope es comodidad, no la regla: quien escriba una fecha a mano más
               lejana recibe el aviso del servidor, que es el que manda. */
            max={addDays(today, DATE_RANGE_HINT_DAYS)}
            onChange={onCalendarChange}
            className="mt-4 w-full rounded-soft border border-beige bg-cream px-4 py-2.5 text-sm text-ink sm:w-auto"
          />

          {params.date !== null && !days.includes(params.date) && (
            <p className="mt-4 text-sm text-ink" role="status">
              Elegiste el <strong>{formatLongDateOnly(params.date)}</strong>.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

interface DayChipProps {
  date: string;
  /** El nombre con el que se reemplaza al día de la semana, si lo hay. */
  label: string | undefined;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Uno de los siete atajos.
 *
 * Muestra el día de la semana arriba y el número abajo, que es la forma en que se
 * lee una agenda de pared y la única que deja siete botones en una fila de
 * teléfono. El texto completo —"jueves 11 de septiembre"— va en el `aria-label`:
 * quien usa un lector de pantalla no tiene el contexto de la fila para completar
 * "jue".
 */
function DayChip({ date, label, selected, onSelect }: DayChipProps) {
  const full = formatLongDateOnly(date);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={full}
      className={cn(
        'flex w-16 flex-col items-center gap-0.5 rounded-soft border px-3 py-2.5 transition-colors duration-150 sm:w-full',
        selected
          ? 'border-forest bg-forest text-ivory'
          : 'border-beige bg-ivory text-ink hover:border-sage',
      )}
    >
      <span
        className={cn(
          'text-xs',
          selected ? 'text-ivory/80' : 'text-ink-soft',
        )}
        aria-hidden="true"
      >
        {label ?? formatWeekdayShort(date)}
      </span>
      <span
        className={cn('text-lg font-medium', selected && 'line-through decoration-2')}
        aria-hidden="true"
      >
        {formatDayOfMonth(date)}
      </span>
      {selected && <span className="sr-only">Día seleccionado</span>}
    </button>
  );
}
