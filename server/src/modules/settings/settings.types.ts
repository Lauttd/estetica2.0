// =============================================================================
// KAYA KALPA — Tipos de la configuración pública del sitio
// =============================================================================

/**
 * Los datos institucionales que el frontend muestra, ya tipados.
 *
 * No se devuelve la tabla `site_settings` cruda (un mapa `clave → texto`) por dos
 * razones: el frontend tendría que conocer los nombres internos de las claves, y
 * cualquier valor que se agregue mañana a la tabla —aunque sea operativo o
 * interno— quedaría publicado solo por existir. Acá solo entra lo que está en la
 * lista blanca de `settings.service.ts`, y sale con el tipo que corresponde.
 */
export interface PublicSettings {
  salon: {
    /** `null` si la fila no está cargada; el frontend usa el nombre fijo del rubro. */
    name: string | null;
    tagline: string | null;
  };

  location: {
    address: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    /** Texto con el que se arma el enlace al mapa. */
    mapsQuery: string | null;
  };

  contact: {
    /** Como se muestra en pantalla, por ejemplo "3705-194299". */
    phoneDisplay: string | null;
    /** Solo dígitos, para armar `https://wa.me/<numero>`. */
    whatsappNumber: string | null;
    /** Mensaje precargado del botón de WhatsApp. */
    whatsappMessage: string | null;
  };

  social: {
    instagramName: string | null;
    instagramUrl: string | null;
    facebookName: string | null;
    facebookUrl: string | null;
  };

  /**
   * Contenido que todavía no se cargó y que el prompt prohíbe inventar.
   *
   * Cuando el valor es `true`, el frontend muestra un aviso de "a confirmar" en
   * lugar de datos inventados. El valor por defecto es `true`: si la fila falta o
   * está ilegible, es más seguro avisar que mostrar un horario que nadie cargó.
   */
  pending: {
    hours: boolean;
    gallery: boolean;
  };
}

/**
 * Una fila cruda de `site_settings`, como la ve el panel.
 *
 * Se devuelve la clave interna —`whatsapp_e164`, `hours_are_placeholder`— y no un
 * objeto tipado como el público: la pantalla de configuración muestra y edita
 * todas las claves, incluidas las que el sitio no publica, y traducirlas a un
 * tipo obligaría a mantener dos estructuras paralelas que se desincronizan.
 *
 * `value` es siempre texto porque la tabla guarda texto. Los números y los
 * booleanos viven ahí como `'1440'` y `'true'`, y se interpretan al leerlos.
 */
export interface SiteSettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}
