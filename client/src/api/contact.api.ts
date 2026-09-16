import { apiRequest } from '@/api/client';
import type { ContactSubmission } from '@/types/contact';
import type { ContactValues } from '@/validation/contact.schema';

/**
 * Manda el formulario de contacto.
 *
 * Lo que viaja es la **salida** del esquema y no lo que se escribió en pantalla:
 * los campos que quedaron en blanco ya se convirtieron en "sin dato" y no salen
 * como cadenas vacías. Mandar `""` haría que el servidor guardara un correo vacío
 * en lugar de ninguno.
 */
export function sendContactMessage(values: ContactValues): Promise<ContactSubmission> {
  return apiRequest<ContactSubmission>('/contact', {
    method: 'POST',
    body: values,
  });
}
