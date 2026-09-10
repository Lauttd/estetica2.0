import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Preguntas frecuentes.
 *
 * Las respuestas salen de la API, así que la estética puede agregar las que le
 * empiecen a repetir por WhatsApp sin llamar a nadie.
 */
export function FaqPage() {
  return (
    <>
      <PageMeta
        title="Preguntas frecuentes"
        description="Dudas frecuentes sobre los turnos, los tratamientos y cómo prepararte para tu visita a KAYA KALPA."
      />

      <div className="container-page">
        <PageHeader
          title="Preguntas frecuentes"
          subtitle="Lo que más nos consultan, respondido."
        />
      </div>
    </>
  );
}
