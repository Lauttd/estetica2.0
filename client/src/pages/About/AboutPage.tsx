import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSiteSettings } from '@/hooks/useSiteSettings';

/**
 * Quiénes somos.
 *
 * El texto institucional, la foto del espacio y la presentación del equipo
 * llegan en la fase de las páginas institucionales, junto con el material real
 * que todavía no está cargado.
 */
export function AboutPage() {
  const { data: settings } = useSiteSettings();
  const city = settings?.location.city ?? 'Formosa';

  return (
    <>
      <PageMeta
        title="Nosotros"
        description={`Conocé KAYA KALPA, la estética profesional en ${city}: cómo trabajamos y qué podés esperar de cada visita.`}
      />

      <div className="container-page">
        <PageHeader
          title="Nosotros"
          subtitle="Un espacio pensado para que cada visita sea un rato para vos."
        />
      </div>
    </>
  );
}
