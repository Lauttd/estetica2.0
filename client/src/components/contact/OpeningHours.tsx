import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { scheduleQueryOptions } from '@/queries/schedule.queries';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';
import type { TimeRange, WeekdaySchedule } from '@/types/schedule';

/**
 * Los días en el orden en que se leen, no en el que los numera el sistema.
 *
 * `weekday` arranca en domingo porque sigue a `Date.getDay()`, pero un horario de
 * atención se lee de lunes a domingo: empezar por el domingo obligaría a bajar
 * hasta el final para saber si el lunes se atiende. Los nombres van escritos acá y
 * no resueltos con `toLocaleDateString`, que devolvería el idioma del navegador de
 * quien mira y no el del sitio.
 */
const DAYS: ReadonlyArray<{ weekday: number; name: string }> = [
  { weekday: 1, name: 'Lunes' },
  { weekday: 2, name: 'Martes' },
  { weekday: 3, name: 'Miércoles' },
  { weekday: 4, name: 'Jueves' },
  { weekday: 5, name: 'Viernes' },
  { weekday: 6, name: 'Sábado' },
  { weekday: 0, name: 'Domingo' },
];

/**
 * El horario de atención semanal.
 *
 * NO AFIRMA HORARIOS QUE NADIE CONFIRMÓ
 *
 * Los horarios que hay cargados en la base son un **ejemplo de trabajo**: ni el
 * prompt ni la lista de precios los dieron (§41), y están marcados con
 * `hours_are_placeholder` justamente para esto. Mientras la bandera siga en pie,
 * esta pantalla no muestra ninguna franja: dice que falta confirmarlas. Un horario
 * inventado no se ve como un dato faltante, se ve como una promesa, y alguien
 * organiza su día alrededor.
 *
 * Por eso, además, **no se piden**: mientras estén sin confirmar, la consulta ni
 * sale. Traer siete días de franjas para descartarlas sería trabajo al pedo en cada
 * visita y, peor, dejaría los datos en la caché del navegador de cualquiera.
 */
export function OpeningHours() {
  const { data: settings } = useSiteSettings();
  const isPlaceholder = settings?.pending.hours === true;

  /**
   * La consulta sale solo si los horarios están confirmados.
   *
   * `enabled` y no un `if` adentro del `queryFn`: así TanStack Query sabe que la
   * consulta no corresponde y no la marca como fallida ni la reintenta.
   */
  const hours = useQuery({ ...scheduleQueryOptions(), enabled: !isPlaceholder });

  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  const weekdays = hours.data?.weekdays ?? [];
  const allClosed = weekdays.length > 0 && weekdays.every((day) => day.closed);

  return (
    <section aria-labelledby="horarios">
      <h2 id="horarios" className="font-display text-xl text-deep">
        Horarios de atención
      </h2>

      <div className="mt-4">
        {isPlaceholder ? (
          <Notice>
            Estamos confirmando los horarios. Escribinos y te contamos la
            disponibilidad
            {whatsappLink !== null && (
              <>
                {' '}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest underline underline-offset-4"
                >
                  por WhatsApp
                </a>
              </>
            )}
            .
          </Notice>
        ) : hours.isPending ? (
          <HourSkeleton />
        ) : hours.isError ? (
          <Notice>{messageFrom(hours.error)}</Notice>
        ) : allClosed || weekdays.length === 0 ? (
          <Notice>
            Todavía no hay horarios cargados. Escribinos y te contamos cuándo
            podemos atenderte.
          </Notice>
        ) : (
          <dl className="divide-y divide-beige overflow-hidden rounded-card border border-beige bg-ivory">
            {DAYS.map(({ weekday, name }) => (
              <DayRow key={weekday} name={name} day={findDay(weekdays, weekday)} />
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/**
 * Un día del listado.
 *
 * El día que no vino en la respuesta no se dibuja como "cerrado": eso afirmaría
 * algo que no sabemos. Se muestra un guion, que es lo que se pone cuando un dato
 * falta.
 */
function DayRow({ name, day }: { name: string; day: WeekdaySchedule | undefined }) {
  const closed = day === undefined || day.closed;

  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
      <dt className="font-medium text-deep">{name}</dt>

      <dd className={closed ? 'text-ink-soft' : 'text-ink'}>
        {day === undefined ? '—' : closed ? 'Cerrado' : formatRanges(day.ranges)}
      </dd>
    </div>
  );
}

function findDay(
  weekdays: WeekdaySchedule[],
  weekday: number,
): WeekdaySchedule | undefined {
  return weekdays.find((day) => day.weekday === weekday);
}

/**
 * Las franjas de un día, como se dicen en voz alta.
 *
 * Un día partido —mañana y tarde— se lee "09:00 a 13:00 y 16:00 a 20:00". Se arma
 * con comas y una "y" final en vez de encadenar "y" entre todas: con tres franjas,
 * "9 a 11 y 12 a 14 y 16 a 18" se lee como una enumeración sin orden.
 */
function formatRanges(ranges: TimeRange[]): string {
  const parts = ranges.map((range) => `${range.startTime} a ${range.endTime}`);
  const last = parts.pop();

  if (last === undefined) return '—';
  return parts.length === 0 ? last : `${parts.join(', ')} y ${last}`;
}

/** El mensaje del servidor si lo hay; uno propio si el error no vino de la API. */
function messageFrom(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'No pudimos cargar los horarios. Volvé a intentar en unos minutos.';
}

/** El recuadro de los avisos: "no está confirmado", "no se pudo cargar". */
function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-beige bg-ivory px-5 py-4 text-sm text-ink-soft">
      {children}
    </p>
  );
}

/** Lo que se ve mientras llegan los horarios. */
function HourSkeleton() {
  return (
    <div
      className="divide-y divide-beige overflow-hidden rounded-card border border-beige bg-ivory"
      aria-busy="true"
      aria-label="Cargando los horarios"
    >
      {DAYS.map(({ weekday }) => (
        <div key={weekday} className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="h-4 w-20 animate-pulse rounded bg-beige/60" />
          <div className="h-4 w-32 animate-pulse rounded bg-beige/60" />
        </div>
      ))}
    </div>
  );
}
