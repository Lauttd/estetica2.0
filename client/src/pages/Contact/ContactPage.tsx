import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSiteSettings } from '@/hooks/useSiteSettings';

/**
 * Contacto: dirección, teléfono, WhatsApp, mapa y formulario.
 *
 * El formulario escribe en `contact_messages` y el panel lo lee. El horario de
 * atención aparece solo cuando esté cargado: el prompt prohíbe inventarlo (§41)
 * y `settings.pending.hours` avisa si todavía falta.
 */
export function ContactPage() {
  const { data: settings } = useSiteSettings();
  const city = settings?.location.city ?? 'Formosa';

  return (
    <>
      <PageMeta
        title="Contacto"
        description={`Dirección, teléfono y WhatsApp de KAYA KALPA en ${city}. Escribinos para consultar por un tratamiento o reservar tu turno.`}
      />

      <div className="container-page">
        <PageHeader
          title="Contacto"
          subtitle="Escribinos o acercate. Te respondemos a la brevedad."
        />
      </div>
    </>
  );
}
