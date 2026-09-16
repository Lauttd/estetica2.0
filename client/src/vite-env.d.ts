/// <reference types="vite/client" />

// =============================================================================
// KAYA KALPA — Las variables de entorno que ve el navegador
// =============================================================================
// Vite solo expone las que empiezan con `VITE_`, y eso es lo que hace que el
// `.env` de la raíz —el mismo que lee el servidor, con la contraseña de Postgres
// adentro— se pueda compartir sin que nada de eso termine en un archivo que se
// descarga cualquiera.
//
// Declararlas acá no es ceremonia: sin esto `import.meta.env.VITE_LO_QUE_SEA` es
// `any`, y un nombre mal escrito devuelve `undefined` en silencio en vez de un
// error de compilación.
// =============================================================================

interface ImportMetaEnv {
  /**
   * La dirección pública del sitio, con protocolo y sin barra final:
   * `https://kayakalpa.com.ar`.
   *
   * Es la que arma las direcciones absolutas que el sitio no puede deducir solo:
   * el `canonical` de cada página y el `og:image`, que por especificación tienen
   * que ser absolutos.
   *
   * **El dominio todavía no está definido** (ver `CONFLICTOS.md`), así que hoy no
   * está cargada y esas etiquetas no se emiten. Es lo correcto: un `canonical`
   * inventado le dice a un buscador que la página buena vive en otro lado, que es
   * peor que no decirle nada.
   */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
