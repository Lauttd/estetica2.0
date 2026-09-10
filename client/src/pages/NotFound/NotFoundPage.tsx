import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';

/**
 * La página que no existe.
 *
 * Dice qué pasó y ofrece dos salidas, en vez de dejarlo a la persona en un
 * callejón: el catálogo, que es donde probablemente quería ir, y el inicio.
 *
 * Lleva `noindex` porque una página de error no tiene nada que hacer en los
 * resultados de búsqueda: si un buscador la indexa, aparece compitiendo con las
 * páginas reales del sitio.
 */
export function NotFoundPage() {
  return (
    <>
      <PageMeta
        title="Página no encontrada"
        description="La página que buscás no existe o cambió de dirección."
      />
      <meta name="robots" content="noindex" />

      <div className="container-page">
        <PageHeader
          title="No encontramos esa página"
          subtitle="Puede que el enlace esté mal escrito o que la página haya cambiado de dirección."
        />

        <div className="flex flex-col items-center justify-center gap-3 pb-20 sm:flex-row">
          <Link to={PATHS.services} className={buttonStyles({ size: 'lg' })}>
            Ver los servicios
          </Link>
          <Link
            to={PATHS.home}
            className={buttonStyles({ variant: 'outline', size: 'lg' })}
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </>
  );
}
