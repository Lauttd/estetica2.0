import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * El build del render de servidor.
 *
 * Es una configuración aparte de `vite.config.ts` y no una bandera dentro de
 * aquella porque producen dos cosas distintas: el build normal genera el sitio
 * para el navegador —con los archivos con hash, la hoja de estilos y el script de
 * entrada— y este genera un módulo de Node que sabe dibujar una página y devolver
 * su HTML. Comparten el alias y el plugin de React, que es lo único que tienen en
 * común.
 *
 * POR QUÉ `emptyOutDir: false`
 *
 * La salida va a `dist/server/`, adentro de `dist/`. Vite vacía el directorio de
 * salida por defecto, así que sin esta bandera este build borraría el sitio del
 * navegador que se acaba de generar. El orden importa: primero `build:spa`, después
 * `build:ssr`, y por eso el script `build` los encadena en ese orden.
 *
 * `minify: false` porque esto no se descarga: lo ejecuta Node una vez, en el build.
 * Minificarlo solo haría que un error de prerenderizado apunte a una línea
 * ilegible.
 */
export default defineConfig({
  plugins: [react()],

  /**
   * El mismo `.env` de la raíz que en `vite.config.ts`, y por una razón que no es
   * la simetría: este build genera el HTML que ve un buscador.
   *
   * Si acá la variable no se leyera, el `canonical` saldría en el HTML que arma el
   * navegador y no en el que se escribe en el build. Serían dos documentos distintos
   * para la misma dirección, y el que se indexa es justamente el segundo.
   */
  envDir: '..',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    ssr: true,
    outDir: 'dist/server',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/entry-server.tsx', import.meta.url)),
    },
  },
});
