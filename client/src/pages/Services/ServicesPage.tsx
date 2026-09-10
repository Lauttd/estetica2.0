import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { CatalogPagination } from '@/components/catalog/CatalogPagination';
import { CategoryFilter } from '@/components/catalog/CategoryFilter';
import { ServiceGrid, ServiceGridSkeleton } from '@/components/catalog/ServiceGrid';
import { ServiceModal } from '@/components/catalog/ServiceModal';
import { ServiceSearch } from '@/components/catalog/ServiceSearch';
import { ApiError } from '@/api/client';
import {
  CATALOG_PER_PAGE,
  catalogFiltersFrom,
  servicesQueryOptions,
} from '@/queries/services.queries';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import type { ServiceSummary } from '@/types/service';

/**
 * El catálogo completo, con filtros por categoría y búsqueda.
 *
 * LOS FILTROS VIVEN EN LA DIRECCIÓN
 *
 * La categoría y el texto buscado se leen de la URL y no de un `useState`. Eso
 * hace que el filtro se pueda compartir por WhatsApp —que es como esta estética
 * manda precios—, que el botón "atrás" funcione como cualquiera espera, y que el
 * catálogo filtrado se pueda prerenderizar, porque el render de servidor no tiene
 * estado que mantener.
 *
 * Los precios, las duraciones y la posibilidad de reservar llegan de la API y no
 * se calculan acá (§18): lo único que decide esta pantalla es cómo se ve.
 */
export function ServicesPage() {
  const location = useLocation();

  /**
   * Los filtros salen de `catalogFiltersFrom` y no de un objeto armado acá: la
   * misma función la usa el prerenderizado, y es lo que garantiza que el navegador
   * busque en la caché exactamente la misma clave que dejó el servidor.
   */
  const filters = catalogFiltersFrom(location.search);

  const services = useQuery(servicesQueryOptions(filters));
  const categories = useQuery(categoriesQueryOptions());

  const [selected, setSelected] = useState<ServiceSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * El icono de cada categoría, indexado por slug.
   *
   * Se arma una vez y se comparte con toda la grilla: las tarjetas no piden
   * categorías por su cuenta, así que dibujar treinta iconos cuesta una sola
   * petición.
   */
  const iconByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories.data ?? []) {
      map.set(category.slug, category.icon);
    }
    return map;
  }, [categories.data]);

  const activeCategory =
    categories.data?.find((category) => category.slug === filters.category) ?? null;

  const items = services.data?.items ?? [];
  const total = services.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PER_PAGE));
  const isFiltered = filters.category !== undefined || filters.q !== undefined;

  function openDetails(service: ServiceSummary) {
    setSelected(service);
    setIsModalOpen(true);
  }

  return (
    <>
      <PageMeta
        title={
          activeCategory === null
            ? 'Servicios y precios'
            : `${activeCategory.name}: servicios y precios`
        }
        description={
          activeCategory === null
            ? 'Todos los tratamientos de KAYA KALPA con sus duraciones y precios: faciales, corporales, maderoterapia, manos, pies, pestañas y cejas.'
            : `${activeCategory.name} en KAYA KALPA. Conocé los tratamientos, sus duraciones y sus precios.`
        }
      />

      <div className="container-page">
        <PageHeader
          title="Servicios"
          subtitle="Tratamientos faciales y corporales, maderoterapia, manos, pies, pestañas y cejas. Los precios y las duraciones son los que la estética tiene cargados hoy."
        />

        <div className="space-y-8 pb-20">
          <ServiceSearch />

          {/* Mientras no llegaron las categorías no se dibuja el filtro: mostrar
              los chips y que aparezcan un instante después mueve toda la grilla
              hacia abajo justo cuando alguien está por tocar uno. */}
          {categories.data !== undefined && (
            <CategoryFilter
              categories={categories.data}
              selected={activeCategory?.slug ?? null}
            />
          )}

          {services.isPending ? (
            <ServiceGridSkeleton />
          ) : services.isError ? (
            <CatalogError error={services.error} />
          ) : items.length === 0 ? (
            <EmptyCatalog filtered={isFiltered} />
          ) : (
            <>
              <p className="text-center text-sm text-ink-soft">
                {total === 1 ? '1 tratamiento' : `${total} tratamientos`}
              </p>

              {/* Mientras llega la lista nueva se atenúa la vieja en vez de
                  vaciarla: el cambio de filtro se ve como una transición y no
                  como un parpadeo. */}
              <div
                className={cn(
                  'transition-opacity duration-200',
                  services.isFetching && 'opacity-60',
                )}
              >
                <ServiceGrid
                  services={items}
                  iconByCategory={iconByCategory}
                  onDetails={openDetails}
                />
              </div>

              <CatalogPagination page={filters.page ?? 1} totalPages={totalPages} />
            </>
          )}
        </div>
      </div>

      <ServiceModal
        service={selected}
        open={isModalOpen}
        iconName={
          selected === null
            ? null
            : (iconByCategory.get(selected.category.slug) ?? null)
        }
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Lo que se ve cuando la API no contestó.
 *
 * Se muestra el mensaje del servidor tal como llegó y no uno propio: si la API
 * explica qué pasó, esa explicación es mejor que cualquier texto genérico escrito
 * acá. El `requestId` se ofrece solo como último recurso, para que quien reclame
 * tenga algo concreto que dar.
 */
function CatalogError({ error }: { error: unknown }) {
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

      <Link
        to={PATHS.services}
        className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
      >
        Ver todos los servicios
      </Link>
    </div>
  );
}

/**
 * Nada que mostrar.
 *
 * Se distinguen dos casos porque son dos problemas distintos: con un filtro puesto
 * lo que hay que hacer es sacarlo, y sin filtro el catálogo está realmente vacío
 * —que es lo que pasa antes de que la estética cargue los servicios—. Ofrecer
 * "quitá los filtros" cuando no hay ninguno sería mandar a nadie a hacer algo que
 * no cambia nada.
 */
function EmptyCatalog({ filtered }: { filtered: boolean }) {
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

      {filtered && (
        <Link
          to={PATHS.services}
          className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
        >
          Ver todos los servicios
        </Link>
      )}
    </div>
  );
}
