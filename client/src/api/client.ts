// =============================================================================
// KAYA KALPA — Cliente HTTP
// =============================================================================
// El único lugar del frontend que llama a `fetch`. Todo lo demás usa `apiRequest`
// y recibe datos ya tipados o un `ApiError`, nunca un `Response` a medio leer.
//
// Por qué existe esta capa y no `fetch` suelto en cada hook: la API contesta
// siempre con el mismo sobre (`{ data }` o `{ error }`), y desenvolverlo en cada
// llamada sería repetir el mismo código veinte veces con veinte oportunidades de
// olvidarse de un caso.
// =============================================================================

import {
  ErrorCode,
  type ApiEnvelope,
  type ApiErrorPayload,
  type ErrorCodeValue,
  type ErrorDetail,
  type ResponseMeta,
} from '@/types/api';

/**
 * Dónde vive la API.
 *
 * El default es una ruta relativa, y eso es una decisión de diseño, no una
 * comodidad: en desarrollo la resuelve el proxy de Vite hacia el puerto 4000 y en
 * producción el mismo origen que sirve el sitio. Que el cliente no sepa dónde
 * vive la API es lo que hace que la cookie de sesión del panel funcione igual en
 * los dos entornos, sin CORS ni `sameSite=None`.
 *
 * Solo hay un caso en el que no sirve una ruta relativa: el prerenderizado, que
 * corre en Node y no tiene origen contra el cual resolverla. Ese proceso llama a
 * `setApiBase()` al arrancar y nada más lo hace.
 */
let apiBase = '/api';

/**
 * Cambia la base de la API. **Solo para el render de servidor.**
 *
 * No se usa una variable `VITE_API_URL` para esto a propósito: Vite la
 * incrustaría en el bundle del navegador, y ahí el cliente pasaría a saber dónde
 * vive la API —que es justo lo que la ruta relativa evita—.
 */
export function setApiBase(base: string): void {
  apiBase = base.replace(/\/+$/, '');
}

const NETWORK_MESSAGE =
  'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.';

const MALFORMED_MESSAGE =
  'El servidor respondió algo que no esperábamos. Volvé a intentar en unos minutos.';

/**
 * Un error de la API, ya interpretado.
 *
 * `status` es el código HTTP, o **0** cuando la petición ni siquiera llegó a
 * salir (sin conexión, DNS, servidor caído). Ese cero no existe en HTTP y por eso
 * sirve: distingue "el servidor me dijo que no" de "no hubo servidor", que para
 * el usuario son dos problemas distintos con dos soluciones distintas.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCodeValue;
  readonly details: ErrorDetail[];
  readonly requestId: string | null;

  constructor(
    status: number,
    payload: {
      code: ErrorCodeValue;
      message: string;
      details?: ErrorDetail[];
      requestId?: string;
    },
  ) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details ?? [];
    this.requestId = payload.requestId ?? null;

    // Para que `instanceof` siga funcionando cuando el bundle pasa por el
    // compilador de TypeScript, que rompe la cadena de prototipos.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Si el error fue por lo que mandamos (4xx) y no por lo que pasó del otro lado
   * (5xx) ni por falta de conexión (0).
   *
   * Lo usa la política de reintentos: reintentar un 404 o un 400 da exactamente
   * el mismo resultado y solo hace esperar más al usuario.
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/** ¿El cuerpo del error tiene la forma que esperamos? */
function toErrorPayload(value: unknown): ApiErrorPayload | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate['message'] !== 'string') return null;

  const code = candidate['code'];
  const requestId = candidate['requestId'];
  const details = candidate['details'];

  return {
    // Si el código no es uno de los que conocemos se conserva igual como texto:
    // el mensaje del servidor sigue siendo lo que el usuario tiene que leer.
    code: (typeof code === 'string'
      ? code
      : ErrorCode.INTERNAL_ERROR) as ErrorCodeValue,
    message: candidate['message'],
    ...(Array.isArray(details) ? { details: details as ErrorDetail[] } : {}),
    ...(typeof requestId === 'string' ? { requestId } : {}),
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Se serializa a JSON. Si se omite, la petición no lleva cuerpo. */
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Mandar el token de acceso del panel en `Authorization`.
   *
   * Es opt-in y no automático: el sitio público no tiene sesión, y mandar un
   * `Authorization` vacío en cada consulta de catálogo sería ruido. Además, solo
   * las peticiones marcadas acá son las que se reintentan tras renovar el token,
   * así que esta bandera también decide dónde puede dispararse un refresh.
   */
  auth?: boolean;
}

// -----------------------------------------------------------------------------
// Renovación de sesión
// -----------------------------------------------------------------------------

/**
 * Pide un token nuevo. Devuelve el token, o `null` si no se pudo renovar.
 *
 * Lo registra `AuthProvider` al montar el panel. Vive acá y no importado desde
 * `auth/` porque `client.ts` es la capa más baja del frontend: si importara al
 * proveedor de sesión, importar `apiRequest` arrastraría React y el panel entero
 * —y el render de servidor, que también usa `apiRequest`, se llevaría todo eso
 * puesto—.
 */
type TokenRefresher = () => Promise<string | null>;

let refreshToken: TokenRefresher | null = null;

export function setTokenRefresher(refresher: TokenRefresher | null): void {
  refreshToken = refresher;
}

/**
 * Hace la petición y devuelve el sobre completo.
 *
 * Es la única implementación: `apiRequest` la envuelve para quedarse con `data`.
 * Tener dos copias del mismo `fetch` sería garantizar que un día se arregle un
 * caso en una y no en la otra.
 *
 * `bearer` llega ya resuelto en vez de leerlo acá adentro para que el reintento
 * de abajo pueda pasar el token **nuevo** sin depender de que el módulo ya se
 * haya actualizado.
 */
async function send<T>(
  path: string,
  options: RequestOptions,
  bearer: string | null,
): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, signal } = options;

  // Se arma con spreads condicionales y no con `undefined` explícito porque
  // `exactOptionalPropertyTypes` distingue "la propiedad no está" de "la
  // propiedad vale undefined", y `fetch` también: un `Content-Type` presente con
  // cuerpo vacío confunde a algunos servidores.
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (bearer !== null) headers['Authorization'] = `Bearer ${bearer}`;

  const init: RequestInit = {
    method,
    // La cookie httpOnly del panel viaja sola. Sin esto el refresh no funciona.
    credentials: 'include',
    ...(signal ? { signal } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, init);
  } catch (error) {
    // Cancelar es una decisión de quien llamó, no un fallo: se propaga tal cual
    // para que TanStack Query sepa que la consulta quedó obsoleta y no la marque
    // como error.
    if (error instanceof Error && error.name === 'AbortError') throw error;

    throw new ApiError(0, {
      code: ErrorCode.INTERNAL_ERROR,
      message: NETWORK_MESSAGE,
    });
  }

  // 204 no trae cuerpo. Es la respuesta de los DELETE que no devuelven nada.
  if (response.status === 204) return { data: undefined as T };

  // Se lee como texto primero y se parsea después: si el servidor devolviera una
  // página de error en HTML (un proxy caído, por ejemplo), `response.json()`
  // explotaría con un error de parseo que no dice nada sobre lo que pasó.
  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  const envelopeBody =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;

  if (!response.ok) {
    const payload = toErrorPayload(envelopeBody?.['error'] ?? null);

    throw new ApiError(
      response.status,
      payload ?? { code: ErrorCode.INTERNAL_ERROR, message: MALFORMED_MESSAGE },
    );
  }

  if (envelopeBody === null || !('data' in envelopeBody)) {
    // Éxito con un cuerpo que no respeta el sobre. No es algo que el usuario
    // pueda resolver, así que no se le explica: se le pide reintentar.
    throw new ApiError(response.status, {
      code: ErrorCode.INTERNAL_ERROR,
      message: MALFORMED_MESSAGE,
    });
  }

  return parsed as ApiEnvelope<T>;
}

/**
 * Manda la petición y, si la sesión venció, la reintenta una vez con un token
 * nuevo.
 *
 * POR QUÉ UN REINTENTO Y NO UN 401 HACIA ARRIBA
 *
 * El token de acceso dura 15 minutos y el panel se usa en el mostrador, entre
 * clientas: es normal que alguien deje la pantalla abierta y vuelva. Sin esto,
 * cada una de esas vueltas terminaría en la pantalla de ingreso aunque la sesión
 * siguiera perfectamente viva del lado del servidor, que es lo que el refresh
 * token está para evitar.
 *
 * Un solo reintento, y no un bucle: si el token recién emitido tampoco sirve, el
 * problema no es que esté vencido —es la cuenta, el rol o el `tokenVersion`— y
 * pedir otro token daría exactamente el mismo 401 para siempre.
 */
async function dispatch<T>(
  path: string,
  options: RequestOptions,
): Promise<ApiEnvelope<T>> {
  const bearer = options.auth === true ? (await currentToken()) : null;

  try {
    return await send<T>(path, options, bearer);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    if (options.auth !== true || refreshToken === null) throw error;

    const renewed = await refreshToken();
    // `null` significa que no se pudo renovar. Se propaga el 401 original, que
    // es el que describe lo que pasó desde el punto de vista de quien llamó.
    if (renewed === null) throw error;

    return await send<T>(path, options, renewed);
  }
}

/**
 * El token con el que hay que firmar esta petición.
 *
 * Se lee del módulo en vez de importarlo arriba para no crear un ciclo entre
 * `client.ts` y `auth-token.ts` —que conceptualmente son la misma capa pero se
 * separan para que este archivo no sepa de sesiones—.
 */
async function currentToken(): Promise<string | null> {
  const { getAccessToken } = await import('./auth-token');
  return getAccessToken();
}

/**
 * Hace la petición y devuelve `data`, o lanza un `ApiError`.
 *
 * Nunca devuelve una respuesta a medio examinar: quien llama recibe el dato
 * tipado o una excepción con un mensaje que se le puede mostrar a una persona.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const envelope = await dispatch<T>(path, options);
  return envelope.data;
}

/**
 * Igual que `apiRequest`, pero conserva el `meta` de la respuesta.
 *
 * Existe por las tablas del panel: para dibujar "página 2 de 7" hace falta
 * `meta.pagination.total`, que `apiRequest` descarta al devolver solo `data`. Se
 * agrega acá y no se cambia `apiRequest` porque el sitio público no usa el `meta`
 * para nada y devolverlo en las noventa llamadas del catálogo sería ruido.
 */
export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: ResponseMeta | undefined }> {
  const envelope = await dispatch<T>(path, options);
  return { data: envelope.data, meta: envelope.meta };
}
