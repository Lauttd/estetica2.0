// =============================================================================
// KAYA KALPA — Enlace de WhatsApp
// =============================================================================

/**
 * Arma el enlace a WhatsApp, o `null` si no hay número cargado.
 *
 * El `null` es la parte importante. Un `https://wa.me/` sin número abre una
 * pantalla de error de WhatsApp, y un botón que lleva a un error es peor que no
 * tener el botón: la persona cree que la estética no atiende. Por eso todos los
 * lugares que muestran el botón preguntan primero, y si no hay número no lo
 * muestran.
 *
 * El número va en formato internacional y sin signos —`5493705194299`—, que es
 * como lo espera `wa.me`. Los espacios, guiones y el `+` que la gente escribe
 * naturalmente rompen el enlace, así que se limpian acá y no en cada componente.
 */
export function buildWhatsAppLink(
  number: string | null,
  message: string | null,
): string | null {
  if (number === null) return null;

  const digits = number.replace(/\D/g, '');
  if (digits.length === 0) return null;

  const base = `https://wa.me/${digits}`;
  if (message === null || message.trim().length === 0) return base;

  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * El enlace para consultar por un servicio puntual.
 *
 * La precede el mensaje que la estética cargó en su configuración, si lo hay: es
 * texto suyo y sabe mejor que nadie con qué quiere que le escriban. Solo cuando
 * no cargó ninguno se arma uno propio, y ese va en voz de quien consulta —"quiero
 * consultar por…"— y no en nombre del salón, que sería ponerle palabras en la boca.
 *
 * Existe porque hay servicios que **no se pueden reservar online**: once de los
 * treinta no tienen duración confirmada, y sin duración el servidor no los ofrece
 * como turno. Sin este enlace, la única salida para esos sería un botón de
 * reservar que falla, que es peor que no tener botón.
 */
export function buildServiceEnquiryLink(
  number: string | null,
  serviceName: string,
  salonMessage: string | null,
): string | null {
  const message =
    salonMessage ?? `Hola, quiero consultar por "${serviceName}".`;
  return buildWhatsAppLink(number, message);
}

/**
 * El enlace al mapa, armado con la dirección real de la estética.
 *
 * Es el esquema de "Maps URLs", que abre la app de mapas en el teléfono si está
 * instalada y el mapa en el navegador si no. No confundir con la API de Google
 * Maps: esa sí necesita una clave, y una clave en el frontend es exactamente lo
 * que el prompt prohíbe (§39). Esta forma no lleva ninguna.
 */
export function buildMapsLink(query: string | null): string | null {
  if (query === null || query.trim().length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
