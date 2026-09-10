// =============================================================================
// KAYA KALPA — Tipos del módulo de preguntas frecuentes
// =============================================================================

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  /** Agrupador libre ("Turnos", "Precios", "Tratamientos"). Puede ser null. */
  category: string | null;
}

/**
 * Una pregunta como la ve el panel.
 *
 * Sin `category: null` en la respuesta se pierde la diferencia entre "sin
 * agrupar" y "agrupada en una categoría vacía", y el panel no podría distinguir
 * qué mostrar en el campo.
 */
export interface FaqAdminEntry extends FaqItem {
  sortOrder: number;
  active: boolean;
  updatedAt: string;
}
