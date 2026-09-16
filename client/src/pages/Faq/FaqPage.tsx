import { Link } from 'react-router-dom';
import { FaqAccordion } from '@/components/faq/FaqAccordion';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { ApiError } from '@/api/client';
import { useFaq } from '@/queries/faq.queries';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { buildWhatsAppLink } from '@/utils/whatsapp';
import type { FaqItem } from '@/types/faq';

/**
 * Preguntas frecuentes.
 *
 * Las preguntas y las respuestas salen de la API, así que la estética puede
 * agregar las que le empiecen a repetir por WhatsApp sin llamar a nadie (§26 pide
 * exactamente eso: que se administren desde el backend).
 *
 * Al pie hay una salida a WhatsApp. Es la pregunta que no está en la lista —y
 * siempre hay una—: sin esa salida, lo único que le queda a quien no encontró su
 * respuesta es volver al inicio y buscar el teléfono en el pie.
 */
export function FaqPage() {
  const faq = useFaq();
  const { data: settings } = useSiteSettings();

  const items = faq.data ?? [];

  // Sin `useMemo`: son siete preguntas y agruparlas es recorrer la lista dos
  // veces. Memorizar esto costaría más de lo que ahorra y agregaría una
  // dependencia que hay que mantener bien, que es de donde salen los errores.
  const groups = groupByCategory(items);

  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  return (
    <>
      <PageMeta
        title="Preguntas frecuentes"
        description="Dudas frecuentes sobre los turnos, los tratamientos y cómo prepararte para tu visita a KAYA KALPA."
      />

      <div className="container-page">
        <PageHeader
          title="Preguntas frecuentes"
          subtitle="Lo que más nos consultan, respondido."
        />

        <div className="mx-auto max-w-3xl space-y-10 pb-20">
          {faq.isPending ? (
            <FaqSkeleton />
          ) : faq.isError ? (
            <FaqError error={faq.error} />
          ) : items.length === 0 ? (
            <EmptyFaq />
          ) : (
            groups.map((group) => (
              <section key={group.title ?? 'todas'}>
                {/* Solo se dibuja el título cuando hay más de un grupo: con una
                    sola lista, un encabezado que diga "Preguntas" arriba de las
                    preguntas no agrega nada. */}
                {group.title !== null && (
                  <h2 className="mb-4 text-xl text-deep">{group.title}</h2>
                )}

                <FaqAccordion items={group.items} />
              </section>
            ))
          )}

          {whatsappLink !== null && items.length > 0 && (
            <p className="text-center text-sm text-ink-soft">
              ¿No encontrás tu respuesta?{' '}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-forest underline underline-offset-4"
              >
                Escribinos por WhatsApp
              </a>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Un grupo de preguntas. `title` en `null` es el grupo sin categoría. */
interface FaqGroup {
  title: string | null;
  items: FaqItem[];
}

/**
 * Agrupa las preguntas por su categoría, si es que hay más de una.
 *
 * Se agrupa **solo cuando hay al menos dos categorías distintas**. Con una sola
 * —o con ninguna, que es como están cargadas hoy las siete preguntas— devuelve un
 * único grupo sin título y la página se ve como una lista sola: partir en dos un
 * grupo de uno no ordena nada, solo agrega un encabezado.
 *
 * Las preguntas sin categoría van primero, en su propio grupo, y no repartidas
 * entre las demás: no hay ninguna razón para meterlas en "Turnos" si no lo están.
 * El orden de los grupos es el de aparición, que es el que ya eligió la estética
 * con el `sortOrder` de cada pregunta.
 */
function groupByCategory(items: FaqItem[]): FaqGroup[] {
  const titles = [
    ...new Set(
      items.map((item) => item.category).filter((title): title is string => title !== null),
    ),
  ];

  if (titles.length < 2) return [{ title: null, items }];

  const uncategorized = items.filter((item) => item.category === null);

  return [
    ...(uncategorized.length > 0 ? [{ title: null, items: uncategorized }] : []),
    ...titles.map((title) => ({
      title,
      items: items.filter((item) => item.category === title),
    })),
  ];
}

/** Lo que se ve mientras llegan las preguntas. */
function FaqSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="divide-y divide-beige overflow-hidden rounded-card border border-beige bg-ivory"
      aria-busy="true"
      aria-label="Cargando las preguntas"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="px-5 py-5 sm:px-6">
          <div className="h-5 w-2/3 animate-pulse rounded bg-beige/60" />
        </div>
      ))}
    </div>
  );
}

/**
 * Lo que se ve cuando la API no contestó.
 *
 * El mensaje es el del servidor, y el botón de WhatsApp queda igual: la respuesta
 * que no llegó se puede preguntar por el mismo canal por el que la estética ya
 * atiende consultas.
 */
function FaqError({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'No pudimos cargar las preguntas. Volvé a intentar en unos minutos.';

  return (
    <div
      className="rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>

      {error instanceof ApiError && error.requestId !== null && (
        <p className="mt-3 text-xs text-ink-soft">
          Si el problema sigue, mencioná este código: {error.requestId}
        </p>
      )}

      <Link to={PATHS.contact} className={buttonStyles({ variant: 'outline', className: 'mt-6' })}>
        Ir a contacto
      </Link>
    </div>
  );
}

/** Todavía no hay preguntas cargadas. */
function EmptyFaq() {
  return (
    <div className="py-10 text-center">
      <p className="text-lg text-deep">Todavía no hay preguntas cargadas.</p>

      <p className="mt-3 text-sm text-ink-soft">
        Escribinos y te respondemos lo que necesites.
      </p>

      <Link to={PATHS.contact} className={buttonStyles({ className: 'mt-6' })}>
        Ir a contacto
      </Link>
    </div>
  );
}
