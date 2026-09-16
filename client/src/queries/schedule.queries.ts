import { queryOptions } from '@tanstack/react-query';
import { fetchSchedule } from '@/api/schedule.api';

/**
 * El horario de atención semanal.
 *
 * Cambia cuando la estética lo edita desde el panel, que es un evento raro: de ahí
 * el `staleTime` largo, igual que el de las preguntas frecuentes.
 *
 * No hay un `useSchedule()` que lo envuelva a secas porque el único lugar que lo
 * muestra —la página de contacto— lo pide **condicionado** a que los horarios
 * estén confirmados: mientras `hours_are_placeholder` siga en pie, la pantalla no
 * afirma ningún horario y pedirlos sería traer un dato para no mostrarlo.
 */
export const scheduleQueryOptions = () =>
  queryOptions({
    queryKey: ['schedule'] as const,
    queryFn: ({ signal }) => fetchSchedule(signal),
    staleTime: 30 * 60 * 1000,
  });
