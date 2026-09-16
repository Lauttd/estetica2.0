// =============================================================================
// KAYA KALPA — Formulario de contacto, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/contact/contact.types.ts`.
// =============================================================================

/**
 * Lo que contesta el servidor cuando el mensaje llegó.
 *
 * El texto viene ya redactado desde el servidor y la pantalla lo muestra tal cual.
 * Escribirlo también acá sería tener dos versiones de la misma confirmación, y un
 * día dirían cosas distintas.
 */
export interface ContactSubmission {
  message: string;
}
