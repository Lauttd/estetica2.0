// =============================================================================
// KAYA KALPA — El render de servidor
// =============================================================================
// Este archivo lo ejecuta Node durante el build, no el navegador. Recibe una
// dirección, pide los datos que esa página necesita, y devuelve el documento HTML
// completo con el contenido ya escrito adentro.
//
// POR QUÉ NO ALCANZA CON EL `index.html` VACÍO
//
// Un buscador que entra a `/servicios/maderoterapia` y recibe un `<div id="root">`
// vacío no ve ningún servicio: ve una página en blanco, y una página en blanco no
// se indexa. El prerenderizado es lo que hace que el HTML que sale del build ya
// tenga el nombre, el precio y la descripción de cada tratamiento.
//
// EL NAVEGADOR HIDRATA, NO VUELVE A DIBUJAR
//
// Los datos que se pidieron acá viajan al navegador dentro de
// `window.__KK_STATE__`, y `main.tsx` llama a `hydrateRoot` en vez de
// `createRoot`. Así el primer render del navegador produce exactamente el mismo
// árbol que el HTML y React solo lo adopta. Si los datos no viajaran, el navegador
// pediría todo de nuevo y la página parpadearía justo después de cargar —que es
// el problema que el prerenderizado viene a resolver—.
//
// POR QUÉ EL DOCUMENTO ENTERO Y NO SOLO LA APLICACIÓN
//
// React 19 iza las etiquetas `<title>` y `<meta>` que se renderizan en cualquier
// parte del árbol hasta el `<head>`… pero solo si el `<html>` lo está renderizando
// React. Devolviendo nada más el `<div id="root">`, el `<title>` que arma
// `PageMeta` queda adentro del `<div>` y el navegador lo ignora: la pestaña diría
// la dirección del sitio y ningún buscador vería el título de la página.
// =============================================================================

import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router-dom';
import { dehydrate, type QueryClient } from '@tanstack/react-query';

import { AppProviders } from '@/AppProviders';
import { createQueryClient } from '@/config/query-client';
import { routes } from '@/routes/routes';
import { PATHS } from '@/routes/paths';
import { setApiBase } from '@/api/client';
import { fetchAllServiceSlugs } from '@/api/services.api';
import {
  catalogFiltersFrom,
  serviceDetailQueryOptions,
  servicesQueryOptions,
} from '@/queries/services.queries';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { siteSettingsQueryOptions } from '@/hooks/useSiteSettings';
import { faqQueryOptions } from '@/queries/faq.queries';
import { galleryQueryOptions } from '@/queries/gallery.queries';
import { scheduleQueryOptions } from '@/queries/schedule.queries';

/** Se reexporta para que `prerender.mjs` no tenga que conocer la capa HTTP. */
export { setApiBase };

/**
 * Lo que Vite generó para el sitio: la hoja de estilos y el script de entrada,
 * con sus nombres con hash.
 *
 * Llegan desde afuera y no están escritos acá porque el hash cambia en cada build
 * —es lo que hace que un navegador no sirva la versión vieja de un archivo—.
 * `prerender.mjs` los lee del manifiesto que Vite escribe en `dist/.vite/`.
 */
export interface DocumentAssets {
  /** Las direcciones de las hojas de estilo. */
  css: string[];
  /** La del script de entrada, que es el que arranca React en el navegador. */
  js: string;
}

/**
 * El HTML que necesita cada ruta, y si se pudo conseguir.
 *
 * **Nunca se escribe una página a medio renderizar.** Si una consulta falla, la
 * ruta se omite y esa dirección la termina sirviendo el armazón sin prerenderizar,
 * que es exactamente lo que pasaba antes de que este archivo existiera. Un "no hay
 * servicios" inventado sería mucho peor: es contenido incorrecto, indexable, que
 * además tapa el problema porque la página se ve entera.
 */
/**
 * Separa la dirección de su cadena de consulta.
 *
 * Hace falta porque `render` recibe la dirección entera —`/servicios?categoria=x`—
 * y las comparaciones son contra la ruta pelada. Comparando la dirección completa
 * contra `/servicios`, el catálogo filtrado no entraría en ninguna rama: no se
 * pedirían los servicios, la página se dibujaría con el esqueleto de carga y, como
 * ninguna consulta falló, se escribiría un HTML vacío **como si estuviera bien**.
 * Es un error que no se ve: la página sale, mide lo que tiene que medir y no tiene
 * ningún servicio adentro.
 */
function splitPath(pathname: string): { path: string; search: string } {
  const index = pathname.indexOf('?');
  if (index === -1) return { path: pathname, search: '' };
  return { path: pathname.slice(0, index), search: pathname.slice(index) };
}

async function prefetch(pathname: string, queryClient: QueryClient): Promise<boolean> {
  const { path, search } = splitPath(pathname);

  const settingsJob = queryClient.fetchQuery(siteSettingsQueryOptions());
  const jobs: Array<Promise<unknown>> = [
    /**
     * Los datos institucionales los usan la barra y el pie en **todas** las
     * páginas, así que van siempre: sin ellos el HTML saldría con el teléfono y la
     * dirección vacíos y el navegador los completaría al hidratar, que es
     * justamente el parpadeo que se quiere evitar.
     */
    settingsJob,
  ];

  const detailMatch = /^\/servicios\/([^/]+)\/?$/.exec(path);

  if (detailMatch?.[1] !== undefined) {
    const slug = decodeURIComponent(detailMatch[1]);
    jobs.push(queryClient.fetchQuery(serviceDetailQueryOptions(slug)));
    // La ficha dibuja el icono de su categoría, que vive en la lista de categorías.
    jobs.push(queryClient.fetchQuery(categoriesQueryOptions()));
  } else if (path === PATHS.services || path === `${PATHS.services}/`) {
    jobs.push(queryClient.fetchQuery(categoriesQueryOptions()));
    /**
     * Los mismos filtros que va a calcular el catálogo en el navegador, con la
     * misma función y sobre la misma cadena de consulta. Es la única forma de que
     * la clave de caché coincida: si acá se armara el objeto a mano, alcanzaría con
     * que uno de los dos ponga `page: 1` y el otro lo omita para que el navegador no
     * encuentre nada y pida todo de nuevo.
     */
    jobs.push(queryClient.fetchQuery(servicesQueryOptions(catalogFiltersFrom(search))));
  } else if (path === PATHS.home || path === `${PATHS.home}/`) {
    jobs.push(queryClient.fetchQuery(servicesQueryOptions({ featured: true })));
    jobs.push(queryClient.fetchQuery(categoriesQueryOptions()));
  } else if (path === PATHS.faq) {
    jobs.push(queryClient.fetchQuery(faqQueryOptions()));
  } else if (path === PATHS.gallery) {
    jobs.push(queryClient.fetchQuery(galleryQueryOptions()));
  } else if (path === PATHS.contact) {
    const settings = await settingsJob;
    if (!settings.pending.hours) jobs.push(queryClient.fetchQuery(scheduleQueryOptions()));
  }

  const results = await Promise.allSettled(jobs);
  return results.every((result) => result.status === 'fulfilled');
}

/**
 * Serializa el estado deshidratado para meterlo en un `<script>`.
 *
 * ESCAPAR NO ES OPCIONAL
 *
 * Este texto se escribe crudo dentro de una etiqueta `<script>`. Un servicio que
 * se llame `Crema </script><script>…` cerraría la etiqueta antes de tiempo y lo
 * que siguiera se ejecutaría como código. Escapar `<`, `>` y `&` alcanza para que
 * eso sea imposible: el navegador ve `</script>`, que dentro de una
 * cadena de JavaScript es el mismo texto y no una etiqueta.
 *
 * U+2028 y U+2029 son válidos dentro de una cadena JSON pero **no** dentro de una
 * cadena de JavaScript, así que ahí cortarían el script con un error de sintaxis.
 */
function serializeState(state: unknown): string {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Dibuja una dirección y devuelve el documento completo, o `null` si no se pudo.
 *
 * `null` significa "no escribas esta página", y es la respuesta ante una consulta
 * que falló o una dirección que el router resuelve con una redirección. Quien
 * llama tiene que respetarlo: escribir un HTML incompleto es peor que no escribir
 * nada.
 */
export async function render(
  pathname: string,
  assets: DocumentAssets,
): Promise<string | null> {
  /**
   * Una caché nueva por página.
   *
   * Con una sola compartida, los datos que se pidieron para una ficha quedarían
   * cargados al renderizar la siguiente, y si un precio cambia a mitad del build
   * dos páginas podrían terminar contando cosas distintas.
   *
   * `retry: false` porque el build no está para esperar: si la API no contestó,
   * reintentar dos veces solo alarga un build que igual va a omitir la página.
   */
  const queryClient = createQueryClient({ retry: false });

  if (!(await prefetch(pathname, queryClient))) return null;

  const handler = createStaticHandler(routes);
  const request = new Request(`http://localhost${pathname}`);

  const context = await handler.query(request);
  // Una redirección o un error de ruta: no hay HTML que generar.
  if (context instanceof Response) return null;

  /**
   * Un router de datos y no uno plano.
   *
   * `RootLayout` usa `<ScrollRestoration />`, que necesita `useMatches` y por lo
   * tanto un router de datos. Con un `StaticRouter` común el render tira
   * "useMatches must be used within a data router" y no genera ninguna página.
   *
   * `hydrate={false}` evita el `<script>` con el estado del router: el sitio no usa
   * `loader`s, así que ese estado no lleva nada y sería un script más que explicar
   * en la política de seguridad del contenido.
   */
  const router = createStaticRouter(handler.dataRoutes, context);

  /**
   * El estado se lee **después** de renderizar, no antes: si algún componente
   * disparara una consulta durante el render, tiene que entrar en lo que viaja.
   */
  const html = renderToString(
    <html lang="es-AR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#4C6548" />

        {/*
          Estas etiquetas están también en `index.html`, que es lo que sirve
          `npm run dev` y lo que queda como armazón para las rutas sin
          prerenderizar. Son las dos caras del mismo documento y hay que
          mantenerlas iguales: la de acá es la que ve un buscador, la de
          `index.html` la que ve alguien navegando.

          El título, la descripción y las etiquetas `og:` de la página **no** van
          acá: las pone `PageMeta` desde el fondo del árbol y React las iza hasta
          este `<head>`. Escribirlas también acá las duplicaría, y la primera es la
          que gana.
        */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="KAYA KALPA Estética Profesional" />
        <meta property="og:locale" content="es_AR" />

        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/*
          Acá es donde React iza el `<title>` y los `<meta>` de la página. No hay
          que escribirlos: los pone `PageMeta` desde el fondo del árbol.
        */}

        {assets.css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>

      <body>
        <div id="root">
          <AppProviders client={queryClient}>
            <StaticRouterProvider router={router} context={context} hydrate={false} />
          </AppProviders>
        </div>

        {/*
          El estado va antes del script de entrada y como script común, no como
          módulo: los módulos se ejecutan diferidos, así que si fueran los dos
          módulos el orden dependería de la red y la aplicación podría arrancar
          antes de que `window.__KK_STATE__` exista.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__KK_STATE__=${serializeState(dehydrate(queryClient))};`,
          }}
        />

        <script type="module" src={assets.js} crossOrigin="anonymous" />
      </body>
    </html>,
  );

  // `renderToString` no emite el doctype, y sin él el navegador entra en "quirks
  // mode": la caja de los elementos se calcula con las reglas viejas y el diseño
  // se ve distinto que en desarrollo, donde Vite sí lo escribe.
  return `<!DOCTYPE html>${html}`;
}

/**
 * Las direcciones que hay que prerenderizar.
 *
 * Incluye el catálogo y las páginas institucionales para que buscadores y
 * previsualizaciones reciban contenido desde el primer pedido.
 *
 * Los slugs se piden paginando, porque el servidor topea `perPage` en 100 y el día
 * que el catálogo pase de ahí la lista tiene que seguir saliendo completa.
 */
export async function getPrerenderPaths(): Promise<string[]> {
  const slugs = await fetchAllServiceSlugs();

  return [
    PATHS.home,
    PATHS.services,
    ...slugs.map((slug) => PATHS.serviceDetail(slug)),
    PATHS.about,
    PATHS.contact,
    PATHS.gallery,
    PATHS.faq,
  ];
}
