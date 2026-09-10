import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/AppProviders';
import { router } from '@/routes/router';

/**
 * La aplicación tal como corre en el navegador.
 *
 * `window.__KK_STATE__` es lo que dejó el prerenderizado: los datos que el
 * servidor ya pidió, para que el primer render del navegador muestre lo mismo
 * que el HTML y la hidratación no encuentre diferencias. En desarrollo —y en
 * cualquier ruta que no se prerenderice— está vacío y cada consulta se pide
 * desde acá como siempre.
 */
export function App() {
  return (
    <AppProviders dehydratedState={window.__KK_STATE__}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
