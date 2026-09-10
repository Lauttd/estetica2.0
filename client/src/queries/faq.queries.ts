import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchFaq } from '@/api/faq.api';

/**
 * Las preguntas frecuentes.
 *
 * Se cachean media hora por la misma razón que las categorías: son texto que la
 * estética escribe cada tanto y que no cambia entre dos clics.
 */
export const faqQueryOptions = () =>
  queryOptions({
    queryKey: ['faq'] as const,
    queryFn: ({ signal }) => fetchFaq(signal),
    staleTime: 30 * 60 * 1000,
  });

export function useFaq() {
  return useQuery(faqQueryOptions());
}
