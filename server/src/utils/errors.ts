// =============================================================================
// KAYA KALPA — Errores de la aplicación
// =============================================================================
// Todo error que el cliente debe ver pasa por acá. La regla del prompt es que
// NUNCA se filtre un error interno: el `errorHandler` solo expone el mensaje de
// un `AppError`, y cualquier otra excepción se convierte en un 500 genérico.
//
// Por eso los mensajes de estas clases se escriben pensando en el cliente final,
// en castellano y sin jerga técnica: son literalmente lo que va a leer.
// =============================================================================

/**
 * Códigos estables que el frontend puede comparar. El texto del mensaje puede
 * cambiar; estos no. El wizard de turnos, por ejemplo, reacciona a `SLOT_TAKEN`
 * volviendo al paso de elección de horario.
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
   * La cuenta sigue usando la contraseña que le puso otra persona.
   *
   * Es un 403 y no un 401 a propósito: la sesión es válida —por eso el panel no
   * tiene que mandar a nadie al login— pero hay algo que hacer antes de seguir.
   * El panel lo usa para llevar a la pantalla de cambio de contraseña.
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

export interface AppErrorOptions {
  details?: ErrorDetail[];
  /** Error original, solo para el log. Nunca se serializa al cliente. */
  cause?: unknown;
}

/**
 * Error esperado, con un mensaje apto para el cliente.
 *
 * `isOperational` distingue "algo que el usuario hizo mal" de "algo que se rompió
 * en el servidor". El `errorHandler` usa esa bandera para decidir si loguea en
 * nivel `warn` (ruido normal) o `error` con stack (hay que investigarlo).
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue;
  readonly details?: ErrorDetail[];
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ErrorCodeValue,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    if (options.details && options.details.length > 0) {
      this.details = options.details;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super(400, ErrorCode.VALIDATION_ERROR, message, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Necesitás iniciar sesión para continuar.', options?: AppErrorOptions) {
    super(401, ErrorCode.UNAUTHORIZED, message, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tenés permisos para hacer esta acción.', options?: AppErrorOptions) {
    super(403, ErrorCode.FORBIDDEN, message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'No encontramos lo que buscabas.', options?: AppErrorOptions) {
    super(404, ErrorCode.NOT_FOUND, message, options);
  }
}

/**
 * La contraseña sigue siendo la provisoria y hay que cambiarla antes de operar.
 *
 * Un 403 y no un 401: la sesión sirve, lo que falta es un paso. Confundirlos
 * haría que el panel echara a la persona al login cada vez que intenta entrar a
 * una pantalla, que es justo lo contrario de lo que hay que hacer —llevarla a
 * cambiar la contraseña—.
 */
export class PasswordChangeRequiredError extends AppError {
  constructor(
    message = 'Tenés que cambiar la contraseña antes de seguir.',
    options?: AppErrorOptions,
  ) {
    super(403, ErrorCode.PASSWORD_CHANGE_REQUIRED, message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: AppErrorOptions) {
    super(409, ErrorCode.CONFLICT, message, options);
  }
}

/**
 * El horario se ocupó entre que el cliente lo eligió y confirmó.
 *
 * Es un caso de uso normal, no un bug: dos personas pueden estar reservando el
 * mismo horario a la vez. El wizard lo trata volviendo al paso de horarios con
 * un aviso, no con una pantalla de error.
 */
export class SlotTakenError extends AppError {
  constructor(
    message = 'Ese horario se acaba de ocupar. Elegí otro, por favor.',
    options?: AppErrorOptions,
  ) {
    super(409, ErrorCode.SLOT_TAKEN, message, options);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Demasiados intentos seguidos. Esperá un momento y volvé a probar.',
    options?: AppErrorOptions,
  ) {
    super(429, ErrorCode.RATE_LIMITED, message, options);
  }
}

/** ¿Es un error que ya sabemos traducir? */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
