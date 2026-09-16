// =============================================================================
// KAYA KALPA — Los enlaces del sitio
// =============================================================================
// La navbar, el menú del teléfono y el pie de página muestran los mismos
// enlaces. Definirlos una vez evita que agregar una sección deje tres listas
// desincronizadas.
//
// La lista es la de §5 y §27: las mismas siete secciones, en el mismo orden.
// Que el pie y el panel del teléfono coincidan no es casualidad —el prompt pide
// lo mismo en los dos lados— y por eso salen de la misma constante.
// =============================================================================

import { PATHS } from '@/routes/paths';

export interface NavItem {
  label: string;
  to: string;

  /**
   * Solo en el panel del teléfono.
   *
   * §5 pide seis enlaces en la barra de escritorio y siete en el panel del
   * teléfono: la diferencia es "Preguntas frecuentes". No es un olvido del
   * prompt —en el teléfono los enlaces van en una lista vertical y entran
   * cómodos; en la barra horizontal, el séptimo obliga a apretar los demás—.
   *
   * Va como bandera en el enlace y no como un filtro suelto en la navbar porque
   * la excepción tiene que leerse donde está la lista. Un `.filter()` en otro
   * archivo deja a quien agregue una sección preguntándose por qué su enlace no
   * aparece en escritorio.
   */
  mobileOnly?: boolean;
}

/**
 * Las secciones del sitio, en el orden en que se leen.
 *
 * "Inicio" va primero porque es a donde se vuelve, y "Servicios" después porque
 * es lo que la gente busca cuando entra —cuánto sale y qué se hacen—. "Turnos"
 * aparece como sección además de como botón porque §5 lo pide en los dos
 * lugares: el botón es el atajo de quien ya decidió, el enlace es el de quien
 * todavía está mirando.
 */
export const MAIN_NAV: readonly NavItem[] = [
  { label: 'Inicio', to: PATHS.home },
  { label: 'Servicios', to: PATHS.services },
  { label: 'Turnos', to: PATHS.booking },
  { label: 'Nosotros', to: PATHS.about },
  { label: 'Galería', to: PATHS.gallery },
  { label: 'Preguntas frecuentes', to: PATHS.faq, mobileOnly: true },
  { label: 'Contacto', to: PATHS.contact },
];

/** Los que entran en la barra de escritorio: todos menos los de `mobileOnly`. */
export const DESKTOP_NAV: readonly NavItem[] = MAIN_NAV.filter(
  (item) => item.mobileOnly !== true,
);
