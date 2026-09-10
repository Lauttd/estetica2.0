import { apiRequest } from '@/api/client';
import type { CategorySummary } from '@/types/category';

/**
 * Las categorías del catálogo, con cuántos servicios activos tiene cada una.
 *
 * Es un listado corto y sin parámetros —siete filas— que se cachea entero, así que
 * no hay paginación que mirar.
 */
export function fetchCategories(signal?: AbortSignal): Promise<CategorySummary[]> {
  return apiRequest<CategorySummary[]>('/categories', signal ? { signal } : {});
}
