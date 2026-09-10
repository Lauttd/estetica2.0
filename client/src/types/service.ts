// =============================================================================
// KAYA KALPA — Servicios, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/services/services.types.ts`.
//
// Está duplicado a propósito, igual que `types/api.ts`: el cliente no puede
// importar del servidor porque arrastraría Prisma al bundle del navegador. Lo que
// sí se evita es que las dos copias se separen en silencio — si el servidor
// cambia un campo, esto deja de compilar al usarlo.
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
 * No trae la descripción larga, los beneficios ni las recomendaciones: eso llega
 * al abrir el detalle. En una grilla de 30 servicios esos campos multiplican el
 * peso de la respuesta y en un teléfono se nota.
 */
export interface ServiceSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  /** En centavos. El formato lo hace `formatCents`. */
  priceCents: number | null;
  /**
   * Si el precio todavía no está cargado.
   *
   * Es distinto de `priceCents: 0`, que significa bonificado. La bandera la
   * calcula el servidor para que el catálogo no tenga que interpretar un `null`
   * suelto: §41 prohíbe inventar el precio que falta, así que lo correcto es
   * mostrar "a consultar".
   */
  priceOnRequest: boolean;
  currency: string;
  durationMin: number | null;
  /** Lo que decidió la estética: si el servicio se ofrece como turno. */
  bookable: boolean;
  /**
   * Si se puede reservar online **ahora**.
   *
   * Es `bookable` más el requisito de tener duración cargada, y lo calcula el
   * servidor. El catálogo lo usa tal cual y **no** vuelve a deducir la regla:
   * hay servicios que la estética quiere dar como turno pero cuya duración
   * todavía no confirmó (§41), y esa es una decisión del servidor, no del
   * frontend. Cuando es `false`, la tarjeta ofrece consultar por WhatsApp en
   * lugar del botón de reservar.
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

/**
 * Los filtros del catálogo, ya en la forma en que viajan en la URL.
 *
 * Son todos opcionales porque la pantalla arranca sin ninguno. `page` y `perPage`
 * los agrega quien consulta, no la persona: el catálogo los necesita para pedir y
 * la URL no tiene por qué mostrarlos.
 */
export interface ServiceFilters {
  /** Slug de la categoría, no su id: así la URL se lee y se comparte. */
  category?: string | undefined;
  q?: string | undefined;
  featured?: boolean | undefined;
  bookable?: boolean | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}
