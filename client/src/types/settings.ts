// =============================================================================
// KAYA KALPA — Configuración pública del sitio, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/settings/settings.types.ts`.
//
// Todo lo que sea dato de contacto sale de acá y NO se escribe en el código: la
// estética cambia el número o el horario desde el panel y el sitio lo refleja
// sin tocar un archivo ni volver a publicar.
// =============================================================================

export interface PublicSettings {
  salon: {
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
   * Cuando el valor es `true`, la pantalla muestra un aviso de "a confirmar" en
   * lugar de datos inventados: el horario de atención, por ejemplo, no lo dio ni
   * el prompt ni la lista de precios.
   */
  pending: {
    hours: boolean;
    gallery: boolean;
  };
}
