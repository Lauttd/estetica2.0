import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchSiteSettings } from '@/api/settings.api';

/**
 * Los datos institucionales, una sola vez para todo el sitio.
 *
 * La clave es compartida, así que la navbar, el pie y la página de contacto
 * piden lo mismo y TanStack Query hace **una** petición: el resto lee de la
 * caché. Por eso el `staleTime` largo —cambian cuando la estética edita la
 * configuración, que es un evento raro— y por eso este hook no recibe
 * parámetros: no hay dos versiones de estos datos.
 */
export const siteSettingsQueryOptions = () =>
  queryOptions({
    queryKey: ['site-settings'] as const,
    queryFn: ({ signal }) => fetchSiteSettings(signal),
    staleTime: 30 * 60 * 1000,
  });

export function useSiteSettings() {
  return useQuery(siteSettingsQueryOptions());
}
