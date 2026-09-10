// =============================================================================
// KAYA KALPA — El token de acceso del panel, en memoria
// =============================================================================
// Vive en una variable de módulo y NO en un contexto de React. Es a propósito y
// es la parte que más fácil se entiende mal:
//
//   · `apiRequest` no es un hook. Es una función que se llama desde cualquier
//     lado —incluido el `queryFn` de TanStack Query, que no es un componente— y
//     no puede leer un contexto. Si el token viviera en React, cada llamada
//     tendría que recibirlo por parámetro y eso sería pasarlo a mano por veinte
//     funciones.
//
//   · En memoria y no en `localStorage`: un token en `localStorage` lo lee
//     cualquier script de la página. El refresh token ya está protegido en una
//     cookie httpOnly; guardar el de acceso en un lugar accesible desde
//     JavaScript sería dejar la puerta de al lado abierta.
//
// La contrapartida es que recargar la página lo borra. Eso no se arregla acá:
// se arregla pidiendo un refresh al montar el panel, que es lo que hace
// `AuthProvider`.
// =============================================================================

let accessToken: string | null = null;

/** El token actual, o `null` si no hay sesión. */
export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
