import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { useCart } from '@/cart/useCart';
import { useBooking } from '@/booking/useBooking';
import { useBookingSubmit } from '@/booking/useBookingSubmit';
import { bookingParamsFrom, bookingPathWith } from '@/booking/booking.params';
import { useProfessionals } from '@/queries/professionals.queries';
import { PATHS } from '@/routes/paths';
import { formatLongDateOnly } from '@/utils/format';
import { DEFAULT_CURRENCY, formatPrice, sumKnownPrices } from '@/utils/money';

/**
 * Paso 6 del asistente: confirmar (paso 9 de §19).
 *
 * ES LA ÚLTIMA PANTALLA DONDE SE PUEDE CORREGIR, Y POR ESO REPITE TODO
 *
 * Alguien llega acá habiendo pasado por seis pantallas, y lo que va a apretar crea
 * un turno de verdad. Todo lo elegido se muestra junto —servicios, día, hora, con
 * quién, a nombre de quién— con un enlace al lado de cada bloque para volver a ese
 * paso. Sin esto, la única forma de revisar si el día quedó bien sería retroceder
 * paso por paso y volver a avanzar.
 *
 * LOS TOTALES SON LOS DEL SERVIDOR
 *
 * La duración sale de `totalDurationMin` de `/api/availability` y no de la suma de
 * las duraciones de las tarjetas: el servidor es el que sabe si entre dos
 * servicios hay un tiempo de preparación (§20). El precio sí se suma acá, porque
 * los precios del carrito son los que la persona vio al agregarlos y el servidor
 * los vuelve a calcular al confirmar —lo que se muestra es lo que se vio, no lo
 * que se cobra—.
 */
export function StepSummary() {
  const [searchParams] = useSearchParams();
  const cart = useCart();
  const booking = useBooking();
  const { submit, isSubmitting } = useBookingSubmit();

  const params = bookingParamsFrom(searchParams);
  const serviceIds = cart.items.map((item) => item.serviceId);
  const slot = booking.slot;

  /**
   * La duración total, del servidor.
   *
   * Se pide sin `enabled: false` a diferencia de la barra: acá el número se afirma
   * como el definitivo, así que si la respuesta guardada ya venció conviene volver
   * a pedirla en vez de mostrar un número que puede haber cambiado. Es la misma
   * clave de caché que dejó el paso de horario, así que en el caso normal —llegar
   * derecho desde ahí— no hay ninguna petición nueva.
   */
  // El nombre de quien atiende. La lista es la misma que se mostró en el paso del
  // profesional, así que en el recorrido normal ya está en caché.
  const professionals = useProfessionals(serviceIds);

  if (slot === null || booking.customer === null) {
    // El guard del armazón ya redirige. Es para que el tipo sea estrecho y no haya
    // que preguntar por `null` en cada línea de acá abajo.
    return null;
  }

  const customer = booking.customer;
  const currency = cart.items[0]?.currency ?? DEFAULT_CURRENCY;
  const partialPrice = sumKnownPrices(cart.items.map((item) => item.priceCents));
  const hasPriceOnRequest = cart.items.some((item) => item.priceCents === null);

  const selectedProfessional =
    params.professionalId === null
      ? null
      : (professionals.data?.find((item) => item.id === params.professionalId) ?? null);

  const candidateNames = slot.professionalIds
    .map((id) => professionals.data?.find((item) => item.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  const detailsPath = bookingPathWith(PATHS.bookingStepPath('details'), searchParams);

  return (
    <>
      <PageMeta
        title="Confirmá tu turno"
        description="Revisá los datos de tu turno en KAYA KALPA y confirmalo."
      />

      <PageHeader
        title="Revisá y confirmá"
        subtitle="Si algo no está bien, podés cambiarlo antes de confirmar."
      />

      <div className="mx-auto max-w-2xl space-y-5">
        <Section title="Servicios" editPath={PATHS.bookingStepPath('services')} editLabel="Cambiar">
          <ul className="space-y-3">
            {cart.items.map((item) => (
              <li key={item.serviceId} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{item.name}</span>
                </span>
                <span className="shrink-0 text-sm text-ink">
                  {formatPrice(item.priceCents, item.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-beige pt-4">
            {/* Mientras la respuesta no está, un puntos suspensivos y no un cero:
                "0 min" sería un dato, y el dato todavía no llegó. */}
            <span className="text-sm font-medium text-deep">Total</span>
            <span className="text-base font-medium text-deep">
              {partialPrice === null ? (
                <span className="text-ink-soft">Precio a consultar</span>
              ) : (
                <>
                  {formatPrice(partialPrice, currency)}
                  {/* Con un precio a consultar entre los elegidos, este número es
                      la suma de los que sí tienen precio. Decirlo evita que se lea
                      como el total del turno. */}
                  {hasPriceOnRequest && (
                    <span className="ml-1 text-xs font-normal text-ink-soft">
                      + a consultar
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        </Section>

        <Section
          title="Cuándo"
          editPath={bookingPathWith(PATHS.bookingStepPath('date'), searchParams)}
          editLabel="Cambiar el día"
        >
          <p className="text-sm text-ink">
            {formatLongDateOnly(slot.forDate)} a las {slot.startTime}
          </p>

          <Link
            to={bookingPathWith(PATHS.bookingStepPath('slot'), searchParams)}
            className="mt-2 inline-block text-sm text-forest underline decoration-forest/30 underline-offset-4 transition-colors duration-150 hover:decoration-forest"
          >
            Cambiar el horario
          </Link>
        </Section>

        <Section
          title="Con quién"
          editPath={bookingPathWith(PATHS.bookingStepPath('professional'), searchParams)}
          editLabel="Cambiar"
        >
          {selectedProfessional !== null ? (
            <p className="text-sm text-ink">{selectedProfessional.name}</p>
          ) : (
            <>
              <p className="text-sm text-ink">La primera que tenga lugar ese día.</p>
              {/* Los nombres de quienes podrían atender ese horario. No es una
                  promesa de quién va a ser —eso lo decide el servidor al
                  confirmar—, así que se dice como posibilidad y no como dato. */}
              {candidateNames.length > 0 && (
                <p className="mt-1 text-xs text-ink-soft">
                  Puede ser {candidateNames.join(' o ')}.
                </p>
              )}
            </>
          )}
        </Section>

        <Section title="A nombre de" editPath={detailsPath} editLabel="Cambiar">
          <p className="text-sm text-ink">
            {customer.firstName} {customer.lastName}
          </p>
          <p className="text-sm text-ink-soft">{customer.phone}</p>
          {customer.email.length > 0 && (
            <p className="text-sm text-ink-soft">{customer.email}</p>
          )}
          {customer.notes.length > 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              <span className="text-ink">Notas: </span>
              {customer.notes}
            </p>
          )}
        </Section>

        <button
          type="button"
          onClick={() => {
            void submit();
          }}
          disabled={isSubmitting}
          className={buttonStyles({ fullWidth: true, className: 'disabled:opacity-60' })}
        >
          {isSubmitting ? 'Confirmando…' : 'Confirmar turno'}
        </button>

        <p className="text-center text-xs text-ink-soft">
          Al confirmar vas a recibir un código para consultar o cancelar el turno.
        </p>
      </div>
    </>
  );
}

interface SectionProps {
  title: string;
  editPath: string;
  editLabel: string;
  children: ReactNode;
}

/**
 * Un bloque del resumen, con su enlace para corregirlo.
 *
 * El enlace lleva al paso correspondiente **conservando los parámetros de la
 * dirección**: volver al paso de horario tiene que llegar con el día elegido
 * todavía puesto, no con el selector de fecha vacío.
 */
function Section({ title, editPath, editLabel, children }: SectionProps) {
  return (
    <section className="rounded-card border border-beige bg-ivory p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-medium tracking-wider text-olive uppercase">
          {title}
        </h2>

        <Link
          to={editPath}
          className="text-sm text-forest underline decoration-forest/30 underline-offset-4 transition-colors duration-150 hover:decoration-forest"
        >
          {editLabel}
        </Link>
      </div>

      {children}
    </section>
  );
}
