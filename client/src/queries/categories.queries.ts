import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/api/categories.api';

/**
 * Las categorías, una sola vez para todo el sitio.
 *
 * Cambian cuando la estética toca el catálogo, que es un evento raro, así que
 * valen mucho más cacheadas que frescas: el filtro del catálogo y la portada leen
 * la misma entrada y solo se pide una vez.
 */
export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['categories'] as const,
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 30 * 60 * 1000,
  });

export function useCategories() {
  return useQuery(categoriesQueryOptions());
}
