import { apiRequest } from '@/api/client';
import type { Gallery } from '@/types/gallery';

/**
 * Las fotos de la galería.
 *
 * Es un listado corto y sin parámetros que se cachea entero, igual que el de
 * categorías. Devuelve las imágenes y las categorías presentes en una sola
 * petición: son la misma consulta y pedirlas por separado sería pedir dos veces
 * lo mismo para dibujar una pantalla.
 */
export function fetchGallery(signal?: AbortSignal): Promise<Gallery> {
  return apiRequest<Gallery>('/gallery', signal ? { signal } : {});
}
