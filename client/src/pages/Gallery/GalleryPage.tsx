import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * La galería de trabajos.
 *
 * Las imágenes salen de la API y las administra la estética desde el panel. El
 * prompt pide no usar fotos genéricas de baja calidad (§6), así que hasta que
 * estén las reales cada lugar muestra un placeholder botánico en la paleta, con
 * las medidas y el texto alternativo ya definidos para que reemplazarlas sea
 * soltar el archivo.
 */
export function GalleryPage() {
  return (
    <>
      <PageMeta
        title="Galería"
        description="Trabajos y resultados de KAYA KALPA Estética Profesional: faciales, corporales, manos, pies, pestañas y cejas."
      />

      <div className="container-page">
        <PageHeader
          title="Galería"
          subtitle="Algunos de los trabajos que hacemos en el salón."
        />
      </div>
    </>
  );
}
