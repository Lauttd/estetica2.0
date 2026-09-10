// =============================================================================
// KAYA KALPA — Lógica de la galería
// =============================================================================

import { galleryRepository } from './gallery.repository';

export const galleryService = {
  /**
   * Las fotos activas, en el orden definido desde el panel.
   *
   * Devuelve también las categorías presentes, ya sin repetir, para que la
   * galería arme sus filtros con lo que hay cargado en vez de con una lista fija
   * que quedaría desactualizada al sumar fotos.
   */
  async list() {
    const images = await galleryRepository.listActive();

    const categories = [
      ...new Set(
        images
          .map((image) => image.category)
          .filter((category): category is string => category !== null),
      ),
    ];

    return { images, categories };
  },
};
