// =============================================================================
// KAYA KALPA — Categorías, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/categories/categories.types.ts`.
// =============================================================================

/**
 * Una categoría del catálogo.
 *
 * Solo existe la versión pública: el panel necesita además `sortOrder` y
 * `active`, pero esas son de `CategoryAdminSummary`, que vive en el espejo del
 * panel y no acá. El catálogo público no recibe filas desactivadas.
 */
export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  /**
   * Nombre del icono dentro del set del frontend —`face`, `hands`, `leaf`…—.
   *
   * El servidor guarda el nombre, no el dibujo: los iconos son una decisión de
   * presentación y viven en `components/ui/CategoryIcon.tsx`. Que llegue `null`
   * es normal y está previsto: ese caso cae al motivo botánico del sitio.
   */
  icon: string | null;
  /** Cuántos servicios activos tiene. Alimenta los filtros del catálogo. */
  serviceCount: number;
}
