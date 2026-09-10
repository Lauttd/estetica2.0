// =============================================================================
// KAYA KALPA — Preguntas frecuentes, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/faq/faq.types.ts`.
// =============================================================================

/**
 * Una pregunta frecuente.
 *
 * El servidor solo devuelve las activas a través de `GET /api/faq`, así que acá
 * no hay bandera de estado: lo que llega es lo que se muestra.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  /** Agrupador libre ("Turnos", "Precios", "Tratamientos"). Puede ser `null`. */
  category: string | null;
}
