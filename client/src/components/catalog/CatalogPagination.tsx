import { Link, useSearchParams } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';
import { CATALOG_PARAMS } from '@/routes/search-params';
import { cn } from '@/utils/cn';

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  /** A dónde llevan los pasos de página. Ver `CategoryFilter`. */
  basePath?: string;
}

/**
 * El paginador del catálogo.
 *
 * **Hoy no se ve**: con 30 servicios y el tope de 100 por página, el catálogo entra
 * entero en la primera. Existe porque el tope es del servidor y no del catálogo: el
 * día que la estética cargue el servicio 101, sin esto la grilla mostraría 100 y
 * los demás quedarían inalcanzables sin ningún aviso.
 *
 * Son enlaces y no botones, por lo mismo que los chips de categoría: la página 2 se
 * puede abrir en otra pestaña y el botón "atrás" la deshace.
 */
export function CatalogPagination({
  page,
  totalPages,
  basePath = PATHS.services,
}: CatalogPaginationProps) {
  const [searchParams] = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefFor(target: number): string {
    const next = new URLSearchParams(searchParams);

    if (target <= 1) next.delete(CATALOG_PARAMS.page);
    else next.set(CATALOG_PARAMS.page, String(target));

    const query = next.toString();
    return query.length === 0 ? basePath : `${basePath}?${query}`;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-4"
      aria-label="Páginas del catálogo"
    >
      <PageLink href={hrefFor(page - 1)} enabled={hasPrevious} rel="prev">
        Anterior
      </PageLink>

      <p className="text-sm text-ink-soft" aria-live="polite">
        Página {page} de {totalPages}
      </p>

      <PageLink href={hrefFor(page + 1)} enabled={hasNext} rel="next">
        Siguiente
      </PageLink>
    </nav>
  );
}

interface PageLinkProps {
  href: string;
  enabled: boolean;
  rel: 'prev' | 'next';
  children: string;
}

/**
 * Un paso de página, o su versión apagada en los extremos.
 *
 * En el extremo se dibuja un `<span>` y no un enlace deshabilitado: un `<a>` sin
 * `href` no recibe foco ni se anuncia como enlace, así que un lector de pantalla
 * leería "Anterior" como texto suelto sin decir que no hay más.
 */
function PageLink({ href, enabled, rel, children }: PageLinkProps) {
  if (!enabled) {
    return (
      <span
        className={cn(buttonStyles({ variant: 'outline' }), 'pointer-events-none opacity-40')}
        aria-disabled="true"
      >
        {children}
      </span>
    );
  }

  return (
    <Link to={href} rel={rel} className={buttonStyles({ variant: 'outline' })}>
      {children}
    </Link>
  );
}
