import { apiRequest, apiRequestWithMeta } from '@/api/client';
import { buildQuery } from '@/api/query-string';
import type { ServiceDetail, ServiceFilters, ServiceSummary } from '@/types/service';

/**
 * El catálogo, filtrado y paginado.
 *
 * Devuelve también el total porque el listado lo necesita para decidir si hay una
 * página siguiente. `apiRequestWithMeta` es la única forma de ver `meta`, y por eso
 * existe: `apiRequest` devuelve solo `data`.
 *
 * Los filtros llegan tal como están en la URL —`category` es un slug y no un id—
 * para que lo que se comparte por WhatsApp sea legible y no un uuid.
 */
export async function fetchServices(
  filters: ServiceFilters,
  signal?: AbortSignal,
): Promise<{ items: ServiceSummary[]; total: number }> {
  const query = buildQuery({
    category: filters.category,
    q: filters.q,
    featured: filters.featured,
    bookable: filters.bookable,
    page: filters.page,
    perPage: filters.perPage,
  });

  const { data, meta } = await apiRequestWithMeta<ServiceSummary[]>(
    `/services${query}`,
    signal ? { signal } : {},
  );

  // El servidor manda siempre `meta.pagination` en un listado. El `??` cubre el
  // caso de una respuesta sin meta —un proxy que la recorte, por ejemplo—: sin él
  // el total sería `undefined` y la paginación mostraría "NaN páginas".
  return { items: data, total: meta?.pagination?.total ?? data.length };
}

/** Un servicio por su slug. Es la consulta de la ficha y la que trae el detalle. */
export function fetchServiceBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<ServiceDetail> {
  return apiRequest<ServiceDetail>(
    `/services/${encodeURIComponent(slug)}`,
    signal ? { signal } : {},
  );
}

/**
 * El catálogo entero, sin filtros.
 *
 * Pide `perPage` al tope que acepta el servidor (100) y pagina hasta agotar. El
 * catálogo hoy tiene 30 servicios y esto entra en una sola petición, pero el día
 * que pase de 100 la lista tiene que seguir saliendo completa.
 *
 * Lo usan dos cosas que necesitan el catálogo de una y no de a páginas: el
 * prerenderizado, para saber qué fichas generar, y el asistente de turnos cuando
 * el servidor rechaza una reserva porque un servicio dejó de poder reservarse
 * online —ahí hay que encontrar cuál de los elegidos es, y la lista es la única
 * fuente que dice cómo están las cosas **ahora**—.
 */
export async function fetchAllServices(signal?: AbortSignal): Promise<ServiceSummary[]> {
  const perPage = 100;
  const all: ServiceSummary[] = [];

  for (let page = 1; ; page += 1) {
    const { items, total } = await fetchServices({ page, perPage }, signal);
    all.push(...items);

    // Se corta por cantidad acumulada y no por `page >= totalPages`: así una
    // respuesta con el total mal informado no puede provocar un bucle infinito.
    if (all.length >= total || items.length === 0) return all;
  }
}

/** Solo los slugs, para el prerenderizado, que no necesita el resto del servicio. */
export async function fetchAllServiceSlugs(): Promise<string[]> {
  const services = await fetchAllServices();
  return services.map((service) => service.slug);
}
