import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import { CATALOG_PER_PAGE, catalogFiltersFrom, servicesQueryOptions } from '@/queries/services.queries';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';
import type { ServiceSummary } from '@/types/service';

export function StepServices() {
  const location = useLocation();
  const cart = useCart();
  const filters = catalogFiltersFrom(location.search);
  const services = useQuery(servicesQueryOptions(filters));
  const categories = useQuery(categoriesQueryOptions());
  const [notice, setNotice] = useState<string | null>(null);

  const iconByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories.data ?? []) map.set(category.slug, category.icon);
    return map;
  }, [categories.data]);

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
      durationMin: 60,
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
        description="Elegí uno o varios tratamientos para reservar tu turno en KAYA KALPA."
      />
      <PageHeader
        title="¿Qué te vas a hacer?"
        subtitle="Elegí uno o varios tratamientos y reservá tu turno."
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
          <p role="alert" className="mx-auto max-w-md rounded-soft border border-forest/30 bg-forest/5 px-4 py-3 text-center text-sm text-deep">
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
            <div className={cn('transition-opacity duration-200', services.isFetching && 'opacity-60')}>
              <ServiceGrid
                services={items}
                iconByCategory={iconByCategory}
                renderAction={(service) => (
                  <AddButton
                    service={service}
                    selected={selectedIds.has(service.id)}
                    onToggle={() => toggle(service)}
                  />
                )}
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

function AddButton({ service, selected, onToggle }: {
  service: ServiceSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={buttonStyles({ variant: selected ? 'outline' : 'primary', className: 'flex-1' })}
    >
      {selected ? 'Quitar del turno' : 'Agregar al turno'}
      <span className="sr-only">{service.name}</span>
    </button>
  );
}

function LoadError({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'No pudimos cargar los servicios. Volvé a intentar en unos minutos.';
  return (
    <div className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center" role="alert">
      <p className="text-base text-ink">{message}</p>
      {error instanceof ApiError && error.requestId !== null && (
        <p className="mt-3 text-xs text-ink-soft">Si el problema sigue, mencioná este código: {error.requestId}</p>
      )}
    </div>
  );
}

function NothingHere({ filtered }: { filtered: boolean }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-lg text-deep">
        {filtered ? 'No encontramos servicios con esa búsqueda.' : 'Todavía no hay servicios cargados.'}
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        {filtered ? 'Probá con otra palabra o mirá todas las categorías.' : 'Escribinos y te contamos qué tratamientos estamos haciendo.'}
      </p>
    </div>
  );
}
