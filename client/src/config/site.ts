// =============================================================================
// KAYA KALPA — Dónde vive el sitio
// =============================================================================
// La dirección pública, en un solo lugar. No es un dato de la estética —no se
// edita desde el panel ni sale de la base— sino una propiedad del despliegue: la
// misma base puede estar publicada en un dominio de prueba o en el definitivo.
//
// POR QUÉ ES `string | null` Y NO UN TEXTO CON UN VALOR POR DEFECTO
//
// Casi todo lo que necesita esta dirección —el `canonical`, el `og:image`— tiene
// que ser **absoluto**: un `og:image` con una ruta relativa no lo resuelve nadie,
// porque quien lo lee es un servidor ajeno que no sabe desde qué página se
// compartió el enlace. Si el dominio no está cargado, la única salida honesta es
// no emitir esas etiquetas: un `canonical` que apunta a `localhost:5173` o a un
// dominio inventado le dice a un buscador que la página buena está en otro lado.
//
// Quien consuma esto está obligado a contemplar el `null` —el tipo no lo deja
// olvidar— y ese es el punto.
// =============================================================================

/**
 * La dirección pública del sitio, o `null` si todavía no está configurada.
 *
 * Se normaliza acá, una sola vez, para que nadie que la use tenga que preguntarse
 * si tiene barra al final: `https://kayakalpa.com.ar/` y `https://kayakalpa.com.ar`
 * son el mismo sitio, y armar una dirección concatenando sin saber cuál de las dos
 * formas llegó da `//contacto` o `https://sitio.comcontacto`. Las dos se ven como
 * un enlace roto y ninguna se descubre hasta que alguien la comparte.
 */
export const SITE_URL: string | null = normalizeSiteUrl(import.meta.env.VITE_SITE_URL);

function normalizeSiteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, '') ?? '';

  if (trimmed.length === 0) return null;

  /**
   * Se exige el protocolo. Un `kayakalpa.com.ar` pelado, pegado así en el `.env`,
   * no sirve como base de una dirección absoluta: se leería como una ruta relativa
   * y el `canonical` saldría igual de roto que si no estuviera.
   */
  if (!/^https?:\/\//.test(trimmed)) return null;

  return trimmed;
}
