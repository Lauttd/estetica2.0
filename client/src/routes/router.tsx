import { createBrowserRouter } from 'react-router-dom';
import { routes } from './routes';

/**
 * El router del navegador.
 *
 * Todo el contenido está en `routes.tsx`; acá solo se lo conecta al historial
 * del navegador, que es lo único que no funciona fuera de él.
 */
export const router = createBrowserRouter(routes);
