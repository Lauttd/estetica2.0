import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchGallery } from '@/api/gallery.api';

/**
 * Las fotos de la galería.
 *
 * Media hora de vigencia, como las categorías y las preguntas: son archivos que
 * la estética cambia cada tanto y que no tienen por qué volver a pedirse entre
 * dos clics. El caché del navegador hace el resto, porque las imágenes se sirven
 * desde `/images/` y no cambian de dirección.
 */
export const galleryQueryOptions = () =>
  queryOptions({
    queryKey: ['gallery'] as const,
    queryFn: ({ signal }) => fetchGallery(signal),
    staleTime: 30 * 60 * 1000,
  });

export function useGallery() {
  return useQuery(galleryQueryOptions());
}
