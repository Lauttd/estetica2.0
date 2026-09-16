// =============================================================================
// KAYA KALPA — Galería, del lado del cliente
// =============================================================================
// Espejo de lo que devuelve `GET /api/gallery` (ver
// `server/src/modules/gallery/gallery.repository.ts`).
//
// Está duplicado a propósito, igual que `types/service.ts`: el cliente no puede
// importar del servidor porque arrastraría Prisma al bundle del navegador.
// =============================================================================

/**
 * Una imagen de la galería.
 *
 * `width` y `height` vienen de la base y **no** son decorativos: el `<img>` los
 * lleva puestos para que el navegador reserve el lugar antes de descargar el
 * archivo. Sin ellos, la grilla se reacomoda a medida que cada imagen llega y la
 * página salta bajo el dedo de quien está por tocar una foto.
 */
export interface GalleryImage {
  id: string;
  src: string;
  /** El texto alternativo, cargado por la estética junto con la foto. */
  alt: string;
  /** Agrupador libre ("Faciales", "Manos"). Puede ser `null`. */
  category: string | null;
  width: number;
  height: number;
}

/**
 * Lo que devuelve la API.
 *
 * `categories` son las que aparecen de verdad entre las fotos cargadas, ya sin
 * repetir y calculadas en el servidor. No es una lista fija: si la estética suma
 * una foto de una categoría nueva, el filtro la muestra sola.
 */
export interface Gallery {
  images: GalleryImage[];
  categories: string[];
}
