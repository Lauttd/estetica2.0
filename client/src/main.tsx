import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from '@/App';
import '@/styles/index.css';

const container = document.getElementById('root');

if (container === null) {
  // Si el HTML no trae el contenedor, el sitio no puede funcionar y no hay forma
  // de avisarle a nadie desde acá. Es un error de compilación, no de ejecución:
  // se grita en la consola en vez de fallar en silencio con la página en blanco.
  throw new Error('Falta el elemento #root en index.html.');
}

/**
 * `StrictMode` monta cada componente dos veces en desarrollo para que los
 * efectos que no están bien escritos se noten. Las peticiones de TanStack Query
 * lo toleran; un `useEffect` con un `fetch` suelto, no — y eso es justamente lo
 * que interesa que salte antes de que llegue a producción.
 */
const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

/**
 * Hidratar o montar, según lo que traiga el HTML.
 *
 * Un contenedor con hijos significa que el archivo se sirvió prerenderizado y
 * que ese HTML ya tiene el contenido: hay que *adoptarlo* en vez de reemplazarlo,
 * que es lo que hace `hydrateRoot`. Sin esto, el navegador tiraría todo el HTML
 * que el servidor se tomó el trabajo de generar y lo volvería a dibujar desde
 * cero —que es exactamente el problema que el prerenderizado viene a resolver—.
 *
 * El chequeo no es una comodidad: en desarrollo el contenedor llega vacío y hay
 * que montar de verdad. Llamar a `hydrateRoot` sobre un `<div>` vacío avisa por
 * consola y descarta el árbol, así que las dos ramas son necesarias.
 */
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
