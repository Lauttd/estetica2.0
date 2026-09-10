import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { fetchServiceBySlug, fetchServices } from '@/api/services.api';
import { CATALOG_PARAMS } from '@/routes/search-params';
import type { ServiceFilters } from '@/types/service';

/**
 * Cuántos servicios pide la grilla de una vez.
 *
 * Es el tope que acepta el servidor (`MAX_PER_PAGE`), y se pide entero a
 * propósito: el catálogo tiene 30 servicios y la gracia de la grilla es poder
 * recorrerlos todos sin pensar en páginas, con el filtro por categoría y el
 * buscador como las herramientas para acotar. Pedir de a 24 obligaría a una
 * segunda página para ver un catálogo que entra cómodo en la primera.
 *
 * El paginador existe igual y aparece solo si el catálogo supera este número. No
 * es código muerto: es lo que hace que el día que la estética cargue el servicio
 * 101 la grilla siga funcionando en vez de mostrar 100 y callarse.
 */
export const CATALOG_PER_PAGE = 100;

/**
 * La clave del catálogo.
 *
 * `['services', …]` es el namespace público de los servicios: el panel invalida
 * `['services']` después de cambiar un precio y eso alcanza a esta lista y a todas
 * las fichas de detalle, sin que nadie tenga que acordarse de enumerarlas.
 *
 * Los filtros entran tal cual en la clave. TanStack Query la serializa ordenando
 * las claves del objeto y descartando los `undefined` —`JSON.stringify` los
 * omite—, así que `{ category: undefined, q: 'peeling' }` y `{ q: 'peeling' }`
 * producen la misma clave y no dos entradas de caché para la misma lista.
 */
export const servicesQueryOptions = (filters: ServiceFilters) =>
  queryOptions({
    queryKey: ['services', 'list', filters] as const,
    queryFn: ({ signal }) => fetchServices(filters, signal),
    /**
     * Mientras llega la lista nueva —al cambiar de categoría o al buscar— se sigue
     * mostrando la anterior en vez de vaciar la grilla. Sin esto, cada clic en un
     * filtro hace parpadear la pantalla a un esqueleto y de vuelta, que es
     * exactamente lo que hace que un catálogo se sienta lento aunque no lo sea.
     */
    placeholderData: keepPreviousData,
  });

/**
 * Los filtros del catálogo, leídos de la dirección.
 *
 * Vive acá y no en la pantalla porque **el prerenderizado usa la misma función**.
 * Es la única forma de garantizar que la clave de caché que se llenó del lado del
 * servidor sea exactamente la que el navegador va a buscar al hidratar: si cada
 * uno armara el objeto por su cuenta, alcanzaría con que uno ponga `page: 1` y el
 * otro lo omita para que el HTML llegue con los datos y el navegador pida todo de
 * nuevo, parpadeando.
 *
 * Una categoría vacía o una página que no es un número se descartan en vez de
 * viajar: `?pagina=abc` tiene que mostrar la primera página, no romper.
 */
export function catalogFiltersFrom(search: string): ServiceFilters {
  const params = new URLSearchParams(search);

  const category = params.get(CATALOG_PARAMS.category);
  const query = params.get(CATALOG_PARAMS.query);
  const page = Number(params.get(CATALOG_PARAMS.page));

  return {
    category: category === null || category === '' ? undefined : category,
    q: query === null || query.trim() === '' ? undefined : query.trim(),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    perPage: CATALOG_PER_PAGE,
  };
}

/** Una ficha de servicio, por slug. Comparte el namespace `services`. */
export const serviceDetailQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['services', 'detail', slug] as const,
    queryFn: ({ signal }) => fetchServiceBySlug(slug, signal),
  });
