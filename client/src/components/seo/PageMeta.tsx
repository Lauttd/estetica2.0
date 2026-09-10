import { BRAND } from '@/config/brand';

interface PageMetaProps {
  /** Sin el nombre de la estética: se agrega solo. */
  title: string;
  description: string;
}

/**
 * El título y la descripción que ve un buscador o alguien a quien le compartieron
 * el enlace.
 *
 * No usa ninguna librería: React 19 sube solo al `<head>` las etiquetas
 * `<title>` y `<meta>` que se rendericen en cualquier parte del árbol. Es una de
 * las razones para estar en React 19 y no hace falta `react-helmet`.
 *
 * El título se arma como `Servicios | KAYA KALPA ESTÉTICA PROFESIONAL` y no al
 * revés. En una lista de resultados el buscador corta el final, así que lo que
 * distingue a esta página —"Servicios"— tiene que ir primero; el nombre de la
 * estética se repite igual en todas y no aporta nada al principio.
 *
 * La `description` no se escribe acá: cada página dice la suya. Una descripción
 * genérica repetida en todo el sitio es, para un buscador, casi lo mismo que no
 * tener ninguna.
 */
export function PageMeta({ title, description }: PageMetaProps) {
  const fullTitle = `${title} | ${BRAND.name} ${BRAND.tagline}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
    </>
  );
}
