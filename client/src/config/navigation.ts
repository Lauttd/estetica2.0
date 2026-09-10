// =============================================================================
// KAYA KALPA — Los enlaces del sitio
// =============================================================================
// La navbar, el menú del teléfono y el pie de página muestran los mismos
// enlaces. Definirlos una vez evita que agregar una sección deje tres listas
// desincronizadas.
// =============================================================================

import { PATHS } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;
}

/**
 * El orden importa: es el orden en que se leen.
 *
 * "Servicios" va primero porque es lo que la gente busca cuando entra —cuánto
 * sale y qué se hacen—, y las preguntas frecuentes quedan al final porque se
 * consultan cuando ya hay interés.
 *
 * "Turnos" no está en la lista: es el botón destacado, no un enlace más.
 */
export const MAIN_NAV: readonly NavItem[] = [
  { label: 'Servicios', to: PATHS.services },
  { label: 'Nosotros', to: PATHS.about },
  { label: 'Galería', to: PATHS.gallery },
  { label: 'Preguntas frecuentes', to: PATHS.faq },
  { label: 'Contacto', to: PATHS.contact },
];

/** El enlace que acompaña al botón de turnos en el pie. */
export const BOOKING_NAV: NavItem = { label: 'Reservar turno', to: PATHS.booking };
