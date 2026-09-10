// =============================================================================
// KAYA KALPA — Armar la query de una petición
// =============================================================================
// Una sola función para las cuarenta llamadas que llevan filtros. Escribir a mano
// el `?category=...&q=...` en cada módulo es la forma más fácil de que una se
// olvide de `encodeURIComponent` y un servicio con "&" en el nombre —o con tilde—
// rompa la búsqueda de una manera que solo aparece con ese dato.
// =============================================================================

/** Lo que se puede mandar como valor de un parámetro. */
type QueryValue = string | number | boolean | undefined;

/**
 * Arma el sufijo de la query, con el `?` adelante, o cadena vacía si no hay nada.
 *
 * Los `undefined` se saltean en vez de viajar como `"undefined"`. La distinción
 * importa: `?category=undefined` es un filtro por la categoría "undefined" —que no
 * existe, así que devuelve una lista vacía sin ningún error—, mientras que la
 * ausencia del parámetro es "sin filtro". Es el mismo cuidado que tiene el
 * servidor con `searchSchema`, del otro lado.
 *
 * Los booleanos van como `'true'`/`'false'` porque es lo único que acepta
 * `booleanQuerySchema`; cualquier otra forma falla con un 400 en vez de
 * interpretarse al revés en silencio.
 */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query.length === 0 ? '' : `?${query}`;
}
