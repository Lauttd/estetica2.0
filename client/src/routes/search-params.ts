// =============================================================================
// KAYA KALPA — El vocabulario de la query string
// =============================================================================
// Los nombres de los parámetros que aparecen en la barra de direcciones. Están
// acá y no sueltos en cada pantalla por la misma razón que las rutas están en
// `paths.ts`: una URL que se escribe en dos lugares es una URL que un día queda
// distinta en uno de los dos.
//
// Van en castellano porque son parte de la dirección que la gente ve, comparte y
// eventualmente indexa (§37). No tienen por qué coincidir con los nombres que usa
// la API del otro lado: la URL es del sitio, no del servidor.
// =============================================================================

export const CATALOG_PARAMS = {
  /** Slug de la categoría por la que se filtra. */
  category: 'categoria',
  /** Texto del buscador. */
  query: 'buscar',
  /** Número de página, cuando el catálogo no entra en una sola. */
  page: 'pagina',
} as const;

/**
 * Los dos únicos datos del asistente de turnos que van en la dirección.
 *
 * El día y el profesional, y ninguno más. Son los que tiene sentido mandarle a
 * alguien —"mirá, el jueves con Ana"— y los que hacen que recargar la página no
 * pierda el trabajo. El horario elegido y los datos del cliente **no** van acá:
 * el horario es volátil y un enlace viejo que lo incluya llevaría a un error que
 * no es tal; los datos son personales y una URL termina en el historial, en los
 * registros del servidor y en cualquier `Referer`.
 */
export const BOOKING_PARAMS = {
  /** Día elegido, `'YYYY-MM-DD'`. */
  date: 'fecha',
  /** Id del profesional elegido. Ausente = "el que esté disponible". */
  professional: 'profesional',
  /**
   * El código de un turno, en la pantalla de consulta.
   *
   * No es un dato del asistente sino de la consulta posterior, pero vive acá
   * igual: es un parámetro de la dirección del sitio y ese vocabulario está todo
   * junto. `booking.params.ts` —que lee los dos de arriba— lo ignora.
   */
  code: 'codigo',
} as const;
