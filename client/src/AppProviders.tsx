import type { ReactNode } from 'react';
import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
  type QueryClient,
} from '@tanstack/react-query';
import { queryClient as browserQueryClient } from '@/config/query-client';

interface AppProvidersProps {
  children: ReactNode;
  /**
   * La caché a usar. El navegador omite esta prop y usa la del sitio; el render
   * de servidor pasa una nueva por página, para que los datos de una no se
   * filtren a la siguiente.
   */
  client?: QueryClient;
  /**
   * Los datos que ya se pidieron del otro lado.
   *
   * Se declara `| undefined` explícitamente porque `exactOptionalPropertyTypes`
   * distingue "la prop no está" de "la prop vale undefined", y acá las dos cosas
   * significan lo mismo: no hay nada deshidratado que rehidratar.
   */
  dehydratedState?: DehydratedState | undefined;
}

/**
 * Los proveedores que envuelven a la aplicación entera.
 *
 * Existe para que el navegador y el render de servidor compartan **el mismo
 * árbol**. Si cada uno armara el suyo, el día que se agregue un proveedor a uno
 * solo el HTML prerenderizado y el hidratado dejarían de coincidir, y eso se
 * manifiesta como un parpadeo raro que cuesta mucho atribuir a su causa.
 *
 * `QueryClientProvider` va **por fuera** del router a propósito: así la caché de
 * datos sobrevive a la navegación. Si estuviera adentro, cada cambio de página
 * la reiniciaría y el sitio pediría todo de nuevo en cada clic.
 */
export function AppProviders({
  children,
  client,
  dehydratedState,
}: AppProvidersProps) {
  return (
    <QueryClientProvider client={client ?? browserQueryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
