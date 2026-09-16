import { useLocation } from 'react-router-dom';
import { BRAND } from '@/config/brand';
import { SITE_URL } from '@/config/site';

interface PageMetaProps {
  /** Sin el nombre de la estética: se agrega solo. */
  title: string;
  description: string;
  /**
   * Una imagen para la vista previa al compartir el enlace (§37), como la guarda
   * el catálogo: una ruta del sitio —`/images/servicios/x.jpg`— o una dirección
   * entera si algún día la imagen vive afuera.
   *
   * Es opcional y lo es de verdad: la mayoría de las páginas no tiene una imagen
   * propia, y sin ella la vista previa sale con el título y la descripción, que es
   * lo que WhatsApp —el canal por el que más se va a compartir esto— muestra
   * igual de bien.
   */
  image?: string | null;
}

/**
 * El título y la descripción que ve un buscador o alguien a quien le compartieron
 * el enlace.
 *
 * No usa ninguna librería: React 19 sube solo al `<head>` las etiquetas
 * `<title>`, `<meta>` y `<link>` que se rendericen en cualquier parte del árbol. Es
 * una de las razones para estar en React 19 y no hace falta `react-helmet`.
 *
 * El título se arma como `Servicios | KAYA KALPA ESTÉTICA PROFESIONAL` y no al
 * revés. En una lista de resultados el buscador corta el final, así que lo que
 * distingue a esta página —"Servicios"— tiene que ir primero; el nombre de la
 * estética se repite igual en todas y no aporta nada al principio.
 *
 * La `description` no se escribe acá: cada página dice la suya. Una descripción
 * genérica repetida en todo el sitio es, para un buscador, casi lo mismo que no
 * tener ninguna.
 *
 * EL CANONICAL
 *
 * Es la dirección que le dice a un buscador cuál es la buena cuando el mismo
 * contenido se puede alcanzar de varias formas. Acá pasa de verdad: el catálogo se
 * filtra por la cadena de consulta —`/servicios?categoria=masajes`—, así que hay
 * tantas direcciones como combinaciones de filtros y todas son la misma página con
 * distinto recorte. Por eso el canonical se arma con el **camino** y no con la
 * dirección entera: la cadena de consulta se descarta a propósito.
 *
 * Se emite solo si el dominio está cargado (`SITE_URL`). Ver `config/site.ts`.
 *
 * EL `og:image` NECESITA EL DOMINIO
 *
 * Por especificación tiene que ser una dirección absoluta: quien la lee es el
 * servidor de WhatsApp o de Facebook, que no tiene forma de saber desde qué página
 * se compartió el enlace. Con el dominio sin definir no se emite, y la vista previa
 * sale con título y descripción.
 */
export function PageMeta({ title, description, image }: PageMetaProps) {
  const { pathname } = useLocation();

  const fullTitle = `${title} | ${BRAND.name} ${BRAND.tagline}`;

  const canonicalUrl = SITE_URL === null ? null : `${SITE_URL}${pathname}`;
  const imageUrl = absoluteUrl(image);

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {imageUrl !== null && <meta property="og:image" content={imageUrl} />}

      {canonicalUrl !== null && <link rel="canonical" href={canonicalUrl} />}
      {/* `og:url` es el canonical del protocolo Open Graph: el mismo dato, para
          quien lee las etiquetas `og:` y no la del `<link>`. Van juntos o no va
          ninguno. */}
      {canonicalUrl !== null && <meta property="og:url" content={canonicalUrl} />}
    </>
  );
}

/**
 * Convierte la imagen de una página en una dirección absoluta, o devuelve `null`
 * si no se puede.
 *
 * Los dos motivos por los que devuelve `null` son distintos y conviene no
 * mezclarlos: no hay imagen, o hay imagen pero el dominio no está cargado y una
 * ruta relativa no le sirve a nadie. En los dos casos la salida correcta es la
 * misma: no escribir la etiqueta.
 */
function absoluteUrl(image: string | null | undefined): string | null {
  const trimmed = image?.trim() ?? '';
  if (trimmed.length === 0) return null;

  // Una imagen que ya vive afuera se usa tal cual: el dominio del sitio no tiene
  // nada que ver con el de la imagen.
  if (/^https?:\/\//.test(trimmed)) return trimmed;

  if (SITE_URL === null) return null;

  return `${SITE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}
