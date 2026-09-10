// =============================================================================
// KAYA KALPA — Prerenderizado
// =============================================================================
// Recorre las direcciones del sitio, le pide a `entry-server.js` el HTML de cada
// una y lo escribe en `dist/`, de modo que `/servicios/maderoterapia` sea un
// archivo con contenido en vez de un armazón vacío que espera a JavaScript.
//
// POR QUÉ ES JAVASCRIPT PLANO Y NO TYPESCRIPT
//
// Este archivo no tiene JSX ni importa nada del código del sitio: solo lee
// archivos, llama a la API y ejecuta el módulo que Vite ya compiló. Escribirlo en
// TypeScript obligaría a meter `tsx` como dependencia del cliente para ganar
// ninguna seguridad, porque lo que hace es mover archivos y escribir bytes.
//
// Y hay una razón más: el lint del cliente cubre `src/**` y prohíbe `console`. Un
// script de build tiene que poder contar lo que hizo.
// =============================================================================

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(here, '..');
const distDir = join(clientDir, 'dist');
const serverEntry = join(distDir, 'server', 'entry-server.js');
const manifestPath = join(distDir, '.vite', 'manifest.json');

const apiBase = process.env.PRERENDER_API_BASE ?? 'http://localhost:4000/api';

/**
 * Con `true`, no poder prerenderizar nada hace fallar el build.
 *
 * Por defecto es `false` y el build termina bien: publicar el sitio sin
 * prerenderizar es peor que publicarlo con él, pero es mucho mejor que no publicar
 * nada, y la base no está levantada en cualquier máquina donde se compile. En
 * integración continua se prende, para que un cambio que rompa el prerenderizado
 * se note ahí y no en producción.
 */
const isStrict = process.env.PRERENDER_STRICT === 'true';

const successes = [];
const skipped = [];

function log(message) {
  console.log(`[prerender] ${message}`);
}

/**
 * ¿Está la API contestando?
 *
 * Es una comprobación previa y no un `try` alrededor de todo: si el servidor no
 * está, la respuesta correcta no es intentar cuarenta páginas y fallar cuarenta
 * veces, sino decirlo una vez y seguir con el sitio armado.
 */
async function apiIsUp() {
  try {
    const response = await fetch(`${apiBase}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Las direcciones de la hoja de estilos y del script de entrada.
 *
 * Se leen del manifiesto porque llevan el hash del contenido en el nombre. La
 * entrada es la clave `index.html`: es el archivo que Vite toma como punto de
 * partida del build del navegador, y es la que tiene `isEntry`.
 */
async function readAssets() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  const entry = Object.values(manifest).find((chunk) => chunk.isEntry === true);

  if (entry === undefined) {
    throw new Error('El manifiesto no tiene ninguna entrada marcada como isEntry.');
  }

  return {
    // Las direcciones del manifiesto son relativas a `dist/`, y en el HTML tienen
    // que ser absolutas: la ficha de un servicio vive en `/servicios/<slug>/`, y
    // una ruta relativa desde ahí buscaría los archivos en la carpeta equivocada.
    css: (entry.css ?? []).map((file) => `/${file}`),
    js: `/${entry.file}`,
  };
}

/** Dónde se escribe el HTML de una dirección. */
function outputFileFor(pathname) {
  if (pathname === '/') return join(distDir, 'index.html');
  return join(distDir, pathname.replace(/^\//, ''), 'index.html');
}

/**
 * El armazón que se sirve cuando una dirección no tiene HTML propio.
 *
 * Es `dist/index.html` —el que genera el build del navegador— copiado a
 * `200.html`. `200.html` es el nombre que usan los hostings estáticos para decir
 * "serví este archivo, con estado 200, para cualquier dirección que no exista como
 * archivo": es lo que hace que `/admin/turnos` funcione y lo que hace que una
 * dirección inexistente monte el 404 de la aplicación en vez de la página de error
 * del servidor.
 *
 * Se copia **antes** de generar nada, y ese orden es lo único que importa acá: el
 * día que se prerenderice `/`, el Home se va a escribir encima de `dist/index.html`.
 * Copiando primero, `200.html` guarda el armazón vacío; copiando después, guardaría
 * el Home, y entonces `/admin/*` y los 404 mostrarían el contenido del Home como si
 * fuera suyo.
 *
 * `dist/index.html` **no se toca**: sigue siendo el armazón, y es lo que sirve la
 * dirección `/` mientras el Home no se prerenderice.
 */
async function writeFallbackShell() {
  await copyFile(join(distDir, 'index.html'), join(distDir, '200.html'));
}

async function main() {
  if (!existsSync(serverEntry)) {
    throw new Error(
      `No está el build del render de servidor en ${serverEntry}. ` +
        'Corré `npm run build:ssr` antes.',
    );
  }

  await writeFallbackShell();

  if (!(await apiIsUp())) {
    log(`La API no contesta en ${apiBase}.`);
    log('No se prerenderizó ninguna página: el sitio queda armado y sin contenido,');
    log('que es como funcionaba antes. Levantá la base y volvé a compilar.');

    if (isStrict) {
      log('PRERENDER_STRICT está activo: el build falla.');
      process.exitCode = 1;
    }
    return;
  }

  const entry = await import(pathToFileURL(serverEntry).href);
  entry.setApiBase(apiBase);

  const assets = await readAssets();
  const paths = await entry.getPrerenderPaths();

  log(`API en ${apiBase}. ${paths.length} direcciones para generar.`);

  for (const pathname of paths) {
    // En serie y no en paralelo: cada página pide a la misma API y arma su propia
    // caché, así que en paralelo solo se lograría saturar un servidor que corre en
    // la misma máquina. Son cuarenta páginas y tarda segundos.
    let html;
    try {
      html = await entry.render(pathname, assets);
    } catch (error) {
      log(`  ✗ ${pathname} — ${error instanceof Error ? error.message : error}`);
      skipped.push(pathname);
      continue;
    }

    /**
     * `null` significa "esta página no se pudo dibujar entera".
     *
     * No se escribe a medias: un catálogo vacío o una ficha sin precio son
     * contenido incorrecto, y además indexable. Esa dirección la sirve el armazón
     * y el navegador la arma con JavaScript, que es exactamente lo que pasaba
     * antes de que existiera este script.
     */
    if (html === null) {
      log(`  ✗ ${pathname} — se omite (no se pudieron traer todos los datos)`);
      skipped.push(pathname);
      continue;
    }

    const file = outputFileFor(pathname);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, 'utf8');
    successes.push(pathname);
  }

  log(`Listo: ${successes.length} páginas escritas, ${skipped.length} omitidas.`);

  if (skipped.length > 0) {
    log('Las omitidas las sirve el armazón y las arma el navegador.');
  }

  // Si no se pudo generar **ninguna**, algo está mal de fondo —la API contesta el
  // health pero falla todo lo demás— y conviene que se note.
  if (successes.length === 0 && isStrict) {
    log('No se generó ninguna página y PRERENDER_STRICT está activo: el build falla.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[prerender] Falló:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
