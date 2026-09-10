// =============================================================================
// KAYA KALPA — Acceso a datos de la galería
// =============================================================================
// La galería es data y no una lista escrita en React: la estética va a reemplazar
// las fotos sin tocar código, y mientras tanto las filas apuntan a los
// placeholders de la paleta que ya están sembrados.
// =============================================================================

import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

const IMAGE_SELECT = {
  id: true,
  src: true,
  alt: true,
  category: true,
  width: true,
  height: true,
} satisfies Prisma.GalleryImageSelect;

export type GalleryImageRow = Prisma.GalleryImageGetPayload<{
  select: typeof IMAGE_SELECT;
}>;

export const galleryRepository = {
  async listActive(): Promise<GalleryImageRow[]> {
    return prisma.galleryImage.findMany({
      where: { active: true },
      select: IMAGE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },
};
