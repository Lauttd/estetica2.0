// =============================================================================
// KAYA KALPA — Tipos del módulo de servicios
// =============================================================================
// Lo que sale de la API. Es a propósito distinto de lo que devuelve Prisma: la
// forma de la respuesta es una decisión de diseño y no debe cambiar sola cada
// vez que se toca el schema de la base.
// =============================================================================

/** La categoría vista desde un servicio: solo lo necesario para mostrarla. */
export interface ServiceCategoryRef {
  id: string;
  slug: string;
  name: string;
}

/**
 * Un servicio tal como aparece en las tarjetas del catálogo.
 *
 * No incluye la descripción larga, los beneficios ni las recomendaciones: en una
 * grilla de 30 servicios eso multiplica el peso de la respuesta, y en mobile
 * (§33) se nota. Esos campos se piden al abrir el detalle.
 */
export interface ServiceSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  /** En centavos. El formato lo hace el cliente con Intl. */
  priceCents: number | null;
  /**
   * true cuando el precio todavía no está cargado.
   *
   * Es distinto de `priceCents: 0`, que significaría bonificado. Sin esta
   * bandera el cliente tendría que interpretar un `null` suelto, y el prompt §41
   * prohíbe inventar el precio que falta: lo correcto es mostrar "a consultar".
   */
  priceOnRequest: boolean;
  currency: string;
  durationMin: number | null;
  /** Lo que decidió la estética: si el servicio se agenda como turno suelto. */
  bookable: boolean;
  /**
   * Si se puede reservar online AHORA.
   *
   * Es `bookable` más el requisito de tener duración cargada. Se calcula en el
   * servidor y no en el cliente porque hay servicios que la estética quiere
   * ofrecer como turno pero cuya duración todavía no está confirmada (§41), y el
   * frontend no tiene por qué conocer esa regla. Cuando es false, el catálogo
   * ofrece consultar por WhatsApp en vez del botón de reservar.
   */
  bookableOnline: boolean;
  image: string | null;
  category: ServiceCategoryRef;
}

/** El detalle completo, para la ficha y el modal "Ver más". */
export interface ServiceDetail extends ServiceSummary {
  description: string | null;
  benefits: string[];
  recommendations: string | null;
  extraInfo: string | null;
  /** "Retirados", "Paquetes": agrupa dentro de una categoría. */
  subgroup: string | null;
  featured: boolean;
  /** Profesionales habilitados para realizarlo. */
  professionals: Array<{ id: string; slug: string; name: string }>;
}

export interface ListServicesQuery {
  category?: string;
  q?: string;
  featured?: boolean;
  bookable?: boolean;
  page: number;
  perPage: number;
}

/** Filtros del listado del panel. Ver `listForAdmin` para las diferencias. */
export interface ListServicesAdminQuery {
  categoryId?: string;
  q?: string;
  active?: boolean;
  needsReview?: boolean;
  bookable?: boolean;
  page: number;
  perPage: number;
}

/**
 * Un servicio tal como lo ve el panel.
 *
 * Trae los campos de edición —`active`, `sortOrder`, `updatedAt`— y la categoría
 * con su estado. Ese último detalle importa: un servicio activo dentro de una
 * categoría desactivada no se ve en la web, y sin la bandera el panel mostraría
 * "activo" y nadie entendería por qué no aparece.
 */
export interface ServiceAdminEntry {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  category: ServiceCategoryRef & { active: boolean };
  shortDescription: string;
  description: string | null;
  benefits: string[];
  recommendations: string | null;
  extraInfo: string | null;
  durationMin: number | null;
  /** En centavos, igual que en el resto de la API. `null` = a consultar. */
  priceCents: number | null;
  currency: string;
  image: string | null;
  subgroup: string | null;
  bookable: boolean;
  /**
   * El servicio tiene algún dato que la estética todavía no confirmó.
   *
   * Lo calcula y lo guarda el seed, y el panel lo usa para listar lo que falta
   * completar. No se deriva del precio en el momento porque un servicio sin
   * precio puede ser una decisión —"solo por presupuesto"— y no un olvido.
   */
  needsReview: boolean;
  featured: boolean;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
  /** Si se puede reservar online, con la misma regla que el catálogo público. */
  bookableOnline: boolean;
}
