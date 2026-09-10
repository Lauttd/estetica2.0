import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

/**
 * La configuración de TanStack Query para todo el sitio.
 *
 * Los valores por defecto de la librería están pensados para datos que cambian
 * todo el tiempo. Los de acá son para lo contrario: un catálogo de servicios que
 * la estética toca cada tanto y unos datos de contacto que casi nunca cambian.
 */

/**
 * Reintentar solo lo que tiene sentido reintentar.
 *
 * Un error de red o un 500 pueden resolverse solos; un 400 o un 404 devuelven lo
 * mismo las veces que se pidan, y reintentarlos solo hace esperar a la persona
 * mirando un spinner que nunca va a cambiar de resultado.
 */
function retryPolicy(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.isClientError) return false;
  return failureCount < 2;
}

export interface QueryClientOverrides {
  /**
   * Política de reintentos.
   *
   * El render de servidor pasa `false`: si la API no contestó durante el build,
   * reintentar dos veces solo alarga un build que igual va a omitir la página.
   */
  retry?: boolean | typeof retryPolicy;
}

/**
 * Arma una caché nueva.
 *
 * Es una función y no un objeto suelto por el prerenderizado: el render de
 * servidor genera muchas páginas en el mismo proceso, y con una caché compartida
 * los servicios que se pidieron para la página 3 quedarían cargados cuando se
 * renderiza la 4. Eso no rompe nada visible —los datos son los mismos— hasta que
 * un dato cambia a mitad del build y dos páginas quedan contando cosas distintas.
 *
 * En el navegador se usa el singleton de abajo, que es lo que hace que navegar
 * entre páginas no vuelva a pedir lo que ya está.
 */
export function createQueryClient(overrides: QueryClientOverrides = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Cinco minutos de datos "frescos".
         *
         * En ese lapso, navegar de Servicios a Inicio y volver no vuelve a pedir
         * nada: se muestra al instante lo que ya estaba. Es la diferencia entre
         * un sitio que se siente inmediato y uno que parpadea en cada clic.
         */
        staleTime: 5 * 60 * 1000,

        retry: overrides.retry ?? retryPolicy,

        /**
         * No recargar al volver a la pestaña. En un catálogo de estética no hay
         * nada que justifique un parpadeo cada vez que alguien mira otra cosa y
         * vuelve.
         *
         * Las excepciones —el contador de mensajes sin leer del panel, que sí
         * quiere refrescarse solo— lo piden en su propia consulta. Cambiarlo acá
         * afectaría también al sitio público, que es justo lo que no se quiere.
         */
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** La caché del navegador: una sola para todo el sitio. */
export const queryClient = createQueryClient();
