import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ServiceGrid } from '@/components/catalog/ServiceGrid';
import { ServiceModal } from '@/components/catalog/ServiceModal';
import { SprigDivider } from '@/components/ui/Sprig';
import { buttonStyles } from '@/components/ui/button';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { CATALOG_PER_PAGE, servicesQueryOptions } from '@/queries/services.queries';
import { PATHS } from '@/routes/paths';
import type { ServiceSummary } from '@/types/service';

/**
 * Los servicios destacados del inicio.
 *
 * CUANDO NO HAY NINGUNO, LA SECCIÓN NO EXISTE
 *
 * "Destacado" es una decisión de la estética: hoy hay tres marcados así —la
 * limpieza facial profunda, el combo de peeling con dermaplaning y la pedicura
 * con semipermanente—, y si algún día los desmarca todos, este componente
 * devuelve `null` y el inicio queda con el hero y los valores, sin un hueco ni un
 * cartel de "no hay nada".
 *
 * La alternativa —mostrar los primeros de la lista cuando no hay destacados—
 * sería peor que no mostrar nada: estaría eligiendo por la estética qué servicios
 * poner en la portada y presentándolos como si ella los hubiera elegido. §41
 * prohíbe inventar datos, y una vidriera inventada es un dato inventado. Cuando
 * alguien marque los suyos desde el panel, la sección aparece sola, sin tocar
 * código.
 *
 * NO HAY UN TOPE DE CUÁNTOS SE MUESTRAN
 *
 * Si la estética destaca ocho, se muestran los ocho. Recortar a los primeros
 * cuatro sería una decisión editorial tomada en silencio y sin aviso: los otros
 * cuatro desaparecerían del inicio sin que nadie sepa por qué. Que la lista se
 * haga larga es un problema de curaduría, no algo que el código deba resolver
 * escondiendo servicios.
 */
export function FeaturedServices() {
  const [selected, setSelected] = useState<ServiceSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * `perPage` va al tope del servidor y no a la cantidad que se espera ver.
   *
   * El servidor no tiene un "todos": si se pidieran cinco y la estética hubiera
   * destacado siete, los otros dos no llegarían nunca y nadie se enteraría. Se
   * pide el máximo y se muestran todos los que vengan.
   */
  const featured = useQuery(
    servicesQueryOptions({ featured: true, perPage: CATALOG_PER_PAGE }),
  );
  const categories = useQuery(categoriesQueryOptions());

  /** El icono de cada categoría, indexado por slug. Ver `ServiceGrid`. */
  const iconByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories.data ?? []) {
      map.set(category.slug, category.icon);
    }
    return map;
  }, [categories.data]);

  const items = featured.data?.items ?? [];

  /**
   * Mientras carga no se dibuja nada: ni el título, ni un esqueleto.
   *
   * Si al terminar resulta que no hay destacados, un esqueleto que apareció y se
   * fue deja la sensación de que algo falló. Y un error se calla por el mismo
   * motivo que el catálogo no grita cuando la portada no puede mostrar una
   * vidriera: el inicio entero sigue estando, con su hero y sus valores, así que
   * no hay nada que el visitante tenga que hacer al respecto.
   */
  if (featured.isPending || featured.isError || items.length === 0) return null;

  function openDetails(service: ServiceSummary) {
    setSelected(service);
    setIsModalOpen(true);
  }

  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="destacados">
      <h2 id="destacados" className="text-center text-3xl sm:text-4xl">
        Servicios destacados
      </h2>

      <SprigDivider className="mt-6" />

      <p className="mx-auto mt-6 max-w-2xl text-center text-base text-ink-soft">
        Una selección de los tratamientos que más nos piden.
      </p>

      <div className="mt-12">
        <ServiceGrid
          services={items}
          iconByCategory={iconByCategory}
          onDetails={openDetails}
        />
      </div>

      <div className="mt-12 text-center">
        <Link
          to={PATHS.services}
          className={buttonStyles({ variant: 'outline', size: 'lg' })}
        >
          Ver todos los servicios
        </Link>
      </div>

      {/* El mismo modal que usa el catálogo, para que un servicio destacado se
          pueda mirar entero sin salir del inicio y se vea igual que allá. */}
      <ServiceModal
        service={selected}
        open={isModalOpen}
        iconName={
          selected === null ? null : (iconByCategory.get(selected.category.slug) ?? null)
        }
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
}
