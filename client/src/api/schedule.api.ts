import { apiRequest } from '@/api/client';
import type { WeeklySchedule } from '@/types/schedule';

/**
 * El horario de atención de la estética, día por día.
 *
 * Son siempre siete días, incluidos los cerrados: el servidor los devuelve todos
 * para que la pantalla no tenga que deducir cuáles faltan.
 */
export function fetchSchedule(signal?: AbortSignal): Promise<WeeklySchedule> {
  return apiRequest<WeeklySchedule>('/schedule', signal ? { signal } : {});
}
