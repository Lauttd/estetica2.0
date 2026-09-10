// =============================================================================
// KAYA KALPA — Tipos del módulo de contacto
// =============================================================================

import type { ContactStatus } from '@prisma/client';

/** Un mensaje tal como lo lista el panel. */
export interface ContactMessageSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  readAt: string | null;
  repliedAt: string | null;
  createdAt: string;
}

/**
 * Lo que recibe quien manda el formulario.
 *
 * No se devuelve el mensaje guardado entero —ni su id de base, ni la IP desde la
 * que se escribió—: quien completa un formulario público solo necesita saber que
 * llegó. Devolver más sería exponer datos internos sin motivo.
 */
export interface ContactSubmission {
  /** Texto ya redactado para mostrar en pantalla, así el frontend no lo inventa. */
  message: string;
}
