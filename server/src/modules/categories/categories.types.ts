// =============================================================================
// KAYA KALPA — Tipos del módulo de categorías
// =============================================================================

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  /** Nombre del icono en el set del frontend. */
  icon: string | null;
  /** Cuántos servicios activos tiene. Alimenta los filtros del catálogo. */
  serviceCount: number;
}

/**
 * Una categoría como la ve el panel.
 *
 * Se distingue de `CategorySummary` porque el panel necesita además el estado y
 * el orden —para mostrarlos y para editarlos— y porque el catálogo público no
 * debería recibir filas desactivadas ni el `sortOrder` interno.
 */
export interface CategoryAdminSummary extends CategorySummary {
  sortOrder: number;
  active: boolean;
}
