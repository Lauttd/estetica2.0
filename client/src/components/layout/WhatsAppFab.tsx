import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * El botón flotante de WhatsApp.
 *
 * El prompt lo pide explícitamente (§33) y es el canal por el que esta estética
 * recibe consultas: en Formosa la gente escribe por WhatsApp antes de reservar.
 *
 * Tres decisiones que no son obvias:
 *
 * · **No aparece si no hay número cargado.** Un `wa.me` sin número no lleva a
 *   ningún lado, y un botón roto es peor que no tener el botón.
 * · **Está abajo a la derecha y no centrado**, para no tapar lo que la persona
 *   está leyendo y para quedar del lado donde llega el pulgar en un teléfono.
 * · **El `aria-label` empieza con la acción**, no con "WhatsApp": quien usa un
 *   lector de pantalla necesita saber qué pasa si lo toca, y "WhatsApp" a secas
 *   no dice si es para escribir, para llamar o para compartir.
 */
export function WhatsAppFab() {
  const { data: settings } = useSiteSettings();

  const link = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  if (link === null) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="bg-forest hover:bg-forest-dark fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full py-3 pr-5 pl-4 text-ivory shadow-float transition-colors duration-150 sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon />
      <span className="text-sm font-medium">Escribinos</span>
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}
