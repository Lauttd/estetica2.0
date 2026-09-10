// =============================================================================
// KAYA KALPA — El contrato de la API, del lado del cliente
// =============================================================================
// Es un espejo de `server/src/utils/http.ts` y `server/src/utils/errors.ts`.
// Está duplicado a propósito: son dos paquetes distintos y el cliente no puede
// importar del servidor (arrastraría Prisma al bundle del navegador). Lo que sí
// se evita es que las dos copias se separen en silencio — si el servidor cambia
// la forma de una respuesta, esto deja de compilar al usarla.
// =============================================================================

/**
 * Los códigos que el frontend puede comparar.
 *
 * El texto del mensaje lo escribe el servidor y puede cambiar cuando quiera;
 * estos no. El wizard de turnos, por ejemplo, reacciona a `SLOT_TAKEN`
 * volviendo al paso de elección de horario, y eso tiene que seguir funcionando
 * aunque el mensaje pase de "ese horario ya se ocupó" a cualquier otra frase.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  /**
   * La cuenta todavía usa la contraseña provisoria del seed.
   *
   * Llega como 403, no como 401: la sesión sirve, lo que falta es un paso. El
   * panel lo distingue del 403 de permisos —que significa "no te corresponde"—
   * y en este caso lleva a la pantalla de cambio de contraseña sin desloguear.
   */
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',

  // Turnos
  SLOT_TAKEN: 'SLOT_TAKEN',
  SERVICE_NOT_BOOKABLE: 'SERVICE_NOT_BOOKABLE',
  PROFESSIONAL_UNAVAILABLE: 'PROFESSIONAL_UNAVAILABLE',
  BOOKING_ALREADY_CANCELLED: 'BOOKING_ALREADY_CANCELLED',
  OUTSIDE_BOOKING_WINDOW: 'OUTSIDE_BOOKING_WINDOW',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Un detalle de validación, con el campo que lo origina. */
export interface ErrorDetail {
  field: string;
  message: string;
}

/** El cuerpo de una respuesta de error. */
export interface ApiErrorPayload {
  code: ErrorCodeValue;
  message: string;
  details?: ErrorDetail[];
  /** Para cruzarlo con el log del servidor. Se muestra al usuario como último recurso. */
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
}

/** El sobre de toda respuesta exitosa. */
export interface ApiEnvelope<T> {
  data: T;
  meta?: ResponseMeta;
}
