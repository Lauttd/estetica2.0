import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { CatalogPagination } from '@/components/catalog/CatalogPagination';
import { CategoryFilter } from '@/components/catalog/CategoryFilter';
import { ServiceGrid, ServiceGridSkeleton } from '@/components/catalog/ServiceGrid';
import { ServiceSearch } from '@/components/catalog/ServiceSearch';
import { useCart } from '@/cart/useCart';
import { CART_FULL_MESSAGE } from '@/cart/cart.types';
import { ApiError } from '@/api/client';
import {
  CATALOG_PER_PAGE,
  catalogFiltersFrom,
  servicesQueryOptions,
} from '@/queries/services.queries';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import { buildServiceEnquiryLink } from '@/utils/whatsapp';
import type { ServiceSummary } from '@/types/service';

/**
 * Paso 1 del asistente: qué se va a hacer.
 *
 * Son los pasos 1, 2 y 3 de §19 —categoría, servicio e información— en una sola
 * pantalla, porque en la práctica son una sola cosa: el catálogo ya tiene el
 * filtro arriba, la grilla debajo y el detalle en la ficha. Partirlo en tres
 * pantallas serían tres "siguiente" para hacer lo que se hace de una sentada.
 *
 * ES EL CATÁLOGO PÚBLICO CON OTRA ACCIÓN
 *
 * Mismo buscador, mismos chips, misma grilla, misma clave de caché: si alguien
 * viene de `/servicios`, todo esto ya está cargado y aparece sin parpadear. Lo
 * único distinto es que el pie de cada tarjeta dice "Agregar al turno" en vez de
 * "Reservar", y eso es exactamente lo que cambia `renderAction`.
 *
 * LOS SERVICIOS QUE NO SE PUEDEN RESERVAR ONLINE SE MUESTRAN IGUAL
 *
 * Once de los treinta no tienen duración confirmada y el servidor no los puede
 * agendar. Esconderlos sería hacer desaparecer un tercio del catálogo sin decir
 * por qué, y quien viene a reservar un drenaje linfático concluiría que la
 * estética no lo hace. Se muestran, con la duración "a confirmar" (§41) y el
 * enlace a WhatsApp en lugar del botón de agregar.
 */
export function StepServices() {
  const location = useLocation();
  const cart = useCart();
  const { data: settings } = useSiteSettings();

  const filters = catalogFiltersFrom(location.search);
  const services = useQuery(servicesQueryOptions(filters));
  const categories = useQuery(categoriesQueryOptions());

  /**
   * El aviso de que no entra un servicio más.
   *
   * Vive en el estado local y no en el del asistente porque es un mensaje sobre
   * esta pantalla: se va apenas la persona saca algo del carrito, sin que ninguna
   * otra pantalla tenga que acordarse de limpiarlo.
   */
  const [notice, setNotice] = useState<string | null>(null);

  const iconByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories.data ?? []) {
      map.set(category.slug, category.icon);
    }
    return map;
  }, [categories.data]);

  /**
   * Los servicios que ya están en el turno.
   *
   * Un `Set` de identificadores y no una búsqueda en el arreglo por tarjeta:
   * treinta tarjetas contra un carrito de hasta diez elementos son trescientas
   * comparaciones por render sin necesidad.
   */
  const selectedIds = useMemo(
    () => new Set(cart.items.map((item) => item.serviceId)),
    [cart.items],
  );

  function toggle(service: ServiceSummary) {
    if (selectedIds.has(service.id)) {
      cart.removeItem(service.id);
      setNotice(null);
      return;
    }

    const added = cart.addItem({
      serviceId: service.id,
      slug: service.slug,
      name: service.name,
      priceCents: service.priceCents,
      currency: service.currency,
      // El servicio llegó hasta acá porque el servidor lo marca como reservable
      // online, y esa marca exige duración cargada. El `?? 0` es la forma de
      // decirle al compilador algo que el servidor ya garantizó; un servicio sin
      // duración nunca llega a este botón, porque su tarjeta muestra WhatsApp.
      durationMin: service.durationMin ?? 0,
      categoryName: service.category.name,
    });

    setNotice(added ? null : CART_FULL_MESSAGE);
  }

  const activeCategory =
    categories.data?.find((category) => category.slug === filters.category) ?? null;

  const items = services.data?.items ?? [];
  const total = services.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PER_PAGE));
  const isFiltered = filters.category !== undefined || filters.q !== undefined;

  return (
    <>
      <PageMeta
        title="Elegí los servicios de tu turno"
        description="Elegí uno o varios tratamientos para reservar tu turno en KAYA KALPA. Después vas a poder elegir el día, el horario y con quién."
      />

      <PageHeader
        title="¿Qué te vas a hacer?"
        subtitle="Elegí uno o varios tratamientos. El turno dura lo que sumen juntos, y te lo reservamos de una sola vez."
      />

      <div className="space-y-8">
        <ServiceSearch basePath={PATHS.bookingStepPath('services')} />

        {categories.data !== undefined && (
          <CategoryFilter
            categories={categories.data}
            selected={activeCategory?.slug ?? null}
            basePath={PATHS.bookingStepPath('services')}
          />
        )}

        {notice !== null && (
          <p
            role="alert"
            className="mx-auto max-w-md rounded-soft border border-forest/30 bg-forest/5 px-4 py-3 text-center text-sm text-deep"
          >
            {notice}
          </p>
        )}

        {services.isPending ? (
          <ServiceGridSkeleton />
        ) : services.isError ? (
          <LoadError error={services.error} />
        ) : items.length === 0 ? (
          <NothingHere filtered={isFiltered} />
        ) : (
          <>
            <p className="text-center text-sm text-ink-soft">
              {total === 1 ? '1 tratamiento' : `${total} tratamientos`}
            </p>

            <div
              className={cn(
                'transition-opacity duration-200',
                services.isFetching && 'opacity-60',
              )}
            >
              <ServiceGrid
                services={items}
                iconByCategory={iconByCategory}
                renderAction={(service) =>
                  service.bookableOnline ? (
                    <AddButton
                      service={service}
                      selected={selectedIds.has(service.id)}
                      onToggle={() => toggle(service)}
                    />
                  ) : (
                    <NotBookableAction
                      service={service}
                      whatsappNumber={settings?.contact.whatsappNumber ?? null}
                      whatsappMessage={settings?.contact.whatsappMessage ?? null}
                    />
                  )
                }
              />
            </div>

            <CatalogPagination
              page={filters.page ?? 1}
              totalPages={totalPages}
              basePath={PATHS.bookingStepPath('services')}
            />
          </>
        )}
      </div>
    </>
  );
}

interface AddButtonProps {
  service: ServiceSummary;
  selected: boolean;
  onToggle: () => void;
}

/**
 * El botón de agregar o quitar.
 *
 * `aria-pressed` y no solo el cambio de texto: quien no ve la tarjeta necesita
 * saber que ese botón es un interruptor con dos estados, y que ahora está en uno
 * de ellos. El texto solo, leído dos veces seguidas, suena a dos acciones
 * distintas en vez de a la misma acción en dos estados.
 */
function AddButton({ service, selected, onToggle }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={buttonStyles({
        variant: selected ? 'outline' : 'primary',
        className: 'flex-1',
      })}
    >
      {selected ? 'Quitar del turno' : 'Agregar al turno'}
      {/* El nombre va en un texto solo para lectores de pantalla y no en un
          `aria-label`, para no tener que reescribir la etiqueta entera en cada
          rama: "Agregar al turno", treinta veces seguidas al recorrer la grilla,
          no dice de qué servicio está hablando. */}
      <span className="sr-only">{service.name}</span>
    </button>
  );
}

interface NotBookableActionProps {
  service: ServiceSummary;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
}

/**
 * Lo que se ofrece en lugar de "Agregar" cuando el servicio no se puede agendar.
 *
 * El motivo se dice con texto y no con un botón apagado: un botón deshabilitado
 * sin explicación obliga a adivinar, y los dos motivos son distintos —uno es "no
 * sabemos cuánto dura" y el otro es "la estética decidió no darlo como turno"—.
 * La duración ya se ve en el pie de la tarjeta, así que acá alcanza con nombrar
 * la salida.
 */
function NotBookableAction({
  service,
  whatsappNumber,
  whatsappMessage,
}: NotBookableActionProps) {
  const link = buildServiceEnquiryLink(whatsappNumber, service.name, whatsappMessage);

  return (
    <div className="flex-1">
      <p className="mb-2 text-center text-xs text-ink-soft">
        {service.durationMin === null
          ? 'Se coordina por WhatsApp'
          : 'No se reserva online'}
      </p>

      {link !== null ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Consultar por ${service.name} por WhatsApp`}
          className={buttonStyles({ variant: 'outline', fullWidth: true })}
        >
          Consultar
        </a>
      ) : (
        <Link
          to={PATHS.contact}
          className={buttonStyles({ variant: 'outline', fullWidth: true })}
        >
          Consultar
        </Link>
      )}
    </div>
  );
}

function LoadError({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'No pudimos cargar los servicios. Volvé a intentar en unos minutos.';

  return (
    <div
      className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>

      {error instanceof ApiError && error.requestId !== null && (
        <p className="mt-3 text-xs text-ink-soft">
          Si el problema sigue, mencioná este código: {error.requestId}
        </p>
      )}
    </div>
  );
}

function NothingHere({ filtered }: { filtered: boolean }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-lg text-deep">
        {filtered
          ? 'No encontramos servicios con esa búsqueda.'
          : 'Todavía no hay servicios cargados.'}
      </p>

      <p className="mt-3 text-sm text-ink-soft">
        {filtered
          ? 'Probá con otra palabra o mirá todas las categorías.'
          : 'Escribinos y te contamos qué tratamientos estamos haciendo.'}
      </p>
    </div>
  );
}
