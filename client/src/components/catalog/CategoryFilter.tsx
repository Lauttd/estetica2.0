import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PATHS } from '@/routes/paths';
import { CATALOG_PARAMS } from '@/routes/search-params';
import { cn } from '@/utils/cn';
import type { CategorySummary } from '@/types/category';

interface CategoryFilterProps {
  categories: CategorySummary[];
  /** El slug elegido, o `null` para "Todos". */
  selected: string | null;
  /**
   * A dónde llevan los chips.
   *
   * Es `/servicios` en el catálogo y `/turnos/servicios` dentro del asistente. Se
   * pasa y no se deduce de la dirección actual porque los dos filtros comparten
   * los mismos parámetros: sin esto, filtrar dentro del asistente devolvería a la
   * persona al catálogo público, que es justo de donde venía.
   */
  basePath?: string;
}

/**
 * El filtro por categoría, como una fila de chips.
 *
 * SON ENLACES Y NO BOTONES
 *
 * Cada chip es un `<a>` con la dirección completa —`/servicios?categoria=manos`—
 * y no un botón que cambia el estado. Eso da tres cosas que un botón no da: el
 * filtro se puede abrir en otra pestaña, el botón "atrás" del navegador deshace el
 * filtro como deshace cualquier otra navegación, y un buscador puede llegar a la
 * categoría por su dirección.
 *
 * Al cambiar de filtro se borra el número de página: quedarse en la 3 de una
 * categoría que tiene una sola página mostraría una lista vacía sin explicación.
 */
export function CategoryFilter({
  categories,
  selected,
  basePath = PATHS.services,
}: CategoryFilterProps) {
  const [searchParams] = useSearchParams();

  function hrefFor(slug: string | null): string {
    const next = new URLSearchParams(searchParams);

    if (slug === null) next.delete(CATALOG_PARAMS.category);
    else next.set(CATALOG_PARAMS.category, slug);

    next.delete(CATALOG_PARAMS.page);

    const query = next.toString();
    return query.length === 0 ? basePath : `${basePath}?${query}`;
  }

  /**
   * El total de servicios activos, sumando todas las categorías.
   *
   * Se usa para el chip "Todos". Es la suma de los `serviceCount` que ya vinieron
   * en la respuesta de categorías: no hace falta otra petición para saber cuántos
   * hay en total, y el número que muestra coincide con lo que suman los demás.
   */
  const total = categories.reduce((sum, category) => sum + category.serviceCount, 0);

  return (
    <nav aria-label="Filtrar por categoría">
      <ul className="flex flex-wrap justify-center gap-2">
        <li>
          <Chip href={hrefFor(null)} active={selected === null}>
            Todos
            {total > 0 && <Count value={total} />}
          </Chip>
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <Chip
              href={hrefFor(category.slug)}
              active={selected === category.slug}
              icon={category.icon}
            >
              {category.name}
              {category.serviceCount > 0 && <Count value={category.serviceCount} />}
            </Chip>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface ChipProps {
  href: string;
  active: boolean;
  icon?: string | null;
  children: ReactNode;
}

function Chip({ href, active, icon, children }: ChipProps) {
  return (
    <Link
      to={href}
      /* `aria-current` es lo que le dice a un lector de pantalla cuál está
         elegido. El color solo no alcanza: quien no lo ve no tiene forma de
         saberlo. */
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-150',
        active
          ? 'border-forest bg-forest text-ivory'
          : 'border-beige bg-ivory text-ink hover:border-sage hover:text-forest',
      )}
    >
      {icon !== undefined && <CategoryIcon name={icon} className="h-4 w-4" />}
      {children}
    </Link>
  );
}

/**
 * Cuántos servicios tiene la categoría.
 *
 * Va en un `<span>` aparte y atenuado para que el nombre de la categoría se lea
 * solo: quien recorre los chips con la vista busca "Manos" y el número es un dato
 * de apoyo, no parte del nombre.
 */
function Count({ value }: { value: number }) {
  return <span className="text-xs opacity-70">{value}</span>;
}
