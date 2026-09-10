import { apiRequest } from '@/api/client';
import type { PublicSettings } from '@/types/settings';

/** Los datos institucionales: nombre, dirección, teléfono, WhatsApp y redes. */
export function fetchSiteSettings(signal?: AbortSignal): Promise<PublicSettings> {
  return apiRequest<PublicSettings>(
    '/settings',
    signal ? { signal } : {},
  );
}
