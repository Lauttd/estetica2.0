import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildMapsEmbedUrl, buildMapsLink } from '@/utils/whatsapp';

/**
 * El mapa, con la dirección real de la estética.
 *
 * SE ARMA CON EL TEXTO DE LA DIRECCIÓN, NO CON COORDENADAS
 *
 * Las coordenadas serían más precisas, pero nadie las cargó: inventarlas (§41)
 * pondría el pin en una esquina cualquiera de Formosa, que es peor que no tener
 * mapa. La consulta por dirección la resuelve Google, y si la dirección está mal
 * cargada el mapa muestra eso mismo —que es la verdad— en lugar de esconderlo.
 *
 * SIN DIRECCIÓN NO HAY SECCIÓN
 *
 * Devuelve `null` y no un recuadro vacío: un mapa sin dirección no se puede
 * dibujar, y un marco gris prometería algo que no está.
 *
 * EL IFRAME ES DE GOOGLE Y ESO TIENE UN COSTO
 *
 * Es contenido de un tercero: al cargarse, Google ve la IP de quien visita el
 * sitio. Va con `loading="lazy"` para que solo se cargue si alguien llega hasta
 * acá, y con un enlace visible al lado —"Abrir en Google Maps"— porque en un
 * teléfono ese enlace abre la aplicación, que es mejor que un mapa incrustado. La
 * política de seguridad de contenido de la Fase 9 tiene que permitir
 * `frame-src https://www.google.com`; está anotado en `CONFLICTOS.md`.
 */
export function ContactMap() {
  const { data: settings } = useSiteSettings();

  const query = settings?.location.mapsQuery ?? null;
  const embedUrl = buildMapsEmbedUrl(query);
  const mapsLink = buildMapsLink(query);

  if (embedUrl === null || mapsLink === null) return null;

  return (
    <section aria-labelledby="mapa">
      <h2 id="mapa" className="font-display text-xl text-deep">
        Cómo llegar
      </h2>

      <div className="mt-4 overflow-hidden rounded-card border border-beige">
        <iframe
          src={embedUrl}
          /* El `title` no es decorativo: un lector de pantalla anuncia el marco con
             este texto, y sin él diría "marco" y nada más. */
          title="Mapa con la ubicación de la estética"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-80 w-full border-0 sm:h-96"
        />
      </div>

      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-sm font-medium text-forest underline underline-offset-4"
      >
        Abrir en Google Maps
      </a>
    </section>
  );
}
