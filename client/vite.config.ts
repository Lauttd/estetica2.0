import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  /**
   * El `.env` es el de la raíz, el mismo que leen el servidor y docker-compose.
   *
   * Por defecto Vite busca el suyo en la carpeta del workspace —`client/.env`—, que
   * no existe: el proyecto tiene un solo archivo de entorno y está arriba. Sin
   * esto, `VITE_SITE_URL` se podría escribir en el `.env` y no pasaría nada, que es
   * la peor forma de fallar —el dato está, la etiqueta no sale, y nadie encuentra
   * por qué—.
   *
   * No hay riesgo de que se filtre nada: Vite solo expone las variables que
   * empiezan con `VITE_`, así que la contraseña de Postgres y el secreto de los
   * tokens siguen sin salir del servidor.
   */
  envDir: '..',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    /**
     * El manifiesto del build.
     *
     * Vite le pone un hash al nombre de cada archivo —`index-a1b2c3d4.js`— para
     * que un navegador no siga sirviendo la versión vieja después de publicar. Eso
     * significa que el HTML prerenderizado no puede saber de antemano cómo se
     * llaman el script y la hoja de estilos... salvo que los lea de acá.
     * `prerender.mjs` lee `dist/.vite/manifest.json` y se los pasa a
     * `entry-server.tsx`, que los escribe en el `<head>` y el `<body>`.
     *
     * Sin esto, el HTML de cada página saldría sin CSS y sin JavaScript: se vería
     * el contenido pero nada tendría estilo y ningún enlace respondería.
     */
    manifest: true,
  },

  server: {
    port: 5173,

    /**
     * El panel usa una cookie httpOnly para el refresh token, y las cookies no
     * cruzan de puerto: sin este proxy el navegador la descartaría por venir de
     * `localhost:4000` mientras la página vive en `localhost:5173`.
     *
     * Con el proxy, el cliente pide siempre rutas relativas `/api/...` y en
     * producción funciona igual —mismo origen, sin cambios—. Por eso el cliente
     * no necesita saber la URL de la API: no hay `VITE_API_URL` en juego en
     * desarrollo.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
