import { apiRequest } from '@/api/client';
import type { FaqItem } from '@/types/faq';

/** Las preguntas frecuentes activas, ya ordenadas por el servidor. */
export function fetchFaq(signal?: AbortSignal): Promise<FaqItem[]> {
  return apiRequest<FaqItem[]>('/faq', signal ? { signal } : {});
}
