import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageMeta } from '@/components/seo/PageMeta';
import { buttonStyles } from '@/components/ui/button';
import { SprigDivider } from '@/components/ui/Sprig';
import { PriceTag } from '@/components/catalog/PriceTag';
import { ServiceDetailBody } from '@/components/catalog/ServiceDetailBody';
import { ServiceImage } from '@/components/catalog/ServiceImage';
import { ApiError } from '@/api/client';
import { serviceDetailQueryOptions } from '@/queries/services.queries';
import { categoriesQueryOptions } from '@/queries/categories.queries';
import { PATHS } from '@/routes/paths';
import { CATALOG_PARAMS } from '@/routes/search-params';

/**
 * La ficha de un servicio.
 *
 * Es la página que más tráfico orgánico va a traer: quien busca "maderoterapia
 * Formosa" o "lifting de pestañas Formosa" cae acá y no en la portada. Por eso la
 * URL lleva el slug —`/servicios/drenaje-linfatico-manual`— y no un número, y por
 * eso esta es una de las rutas que se prerenderiza: el HTML llega con el nombre,
 * el precio y la descripción ya escritos, listos para que los lea un buscador.
 */
export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const service = useQuery({
    ...serviceDetailQueryOptions(slug ?? ''),
    // Sin slug en la ruta no hay nada que pedir. No llega a pasar —la ruta lo
    // exige— pero el tipo lo permite y una consulta con clave vacía quedaría
    // cacheada como si fuera un servicio real.
    enabled: slug !== undefined,
  });

  const categories = useQuery(categoriesQueryOptions());

  if (service.isPending) {
    return <DetailSkeleton />;
  }

  if (service.isError) {
    const notFound = service.error instanceof ApiError && service.error.status === 404;
    return <DetailError notFound={notFound} error={service.error} />;
  }

  const detail = service.data;

  const iconName =
    categories.data?.find((category) => category.slug === detail.category.slug)?.icon ??
    null;

  return (
    <>
      <PageMeta
        title={detail.name}
        /* La descripción corta es la de la estética y describe el servicio mejor
           que cualquier frase armada acá. Se le suma la duración cuando existe,
           que es el dato que más se consulta antes de reservar. */
        description={`${detail.shortDescription} Reservá tu turno en KAYA KALPA Estética Profesional.`}
        /* La foto del tratamiento, cuando la estética la haya cargado: es la
           imagen que le pone cara al enlace cuando alguien lo comparte. Hoy
           `Service.image` está en `null` para todo el catálogo, así que no se
           emite ninguna; el día que se cargue desde el panel, sale sola. */
        image={detail.image}
      />

      <div className="container-page pb-20">
        <Breadcrumb categoryName={detail.category.name} categorySlug={detail.category.slug} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="aspect-[4/3] overflow-hidden rounded-card">
            <ServiceImage
              src={detail.image}
              alt={detail.name}
              iconName={iconName}
              iconClassName="h-20 w-20"
            />
          </div>

          <div>
            <p className="text-xs font-medium tracking-wider text-olive uppercase">
              {detail.category.name}
            </p>

            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{detail.name}</h1>

            <p className="mt-5 text-base text-ink-soft">{detail.shortDescription}</p>

            <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <PriceTag service={detail} className="text-3xl" />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={PATHS.booking}
                className={buttonStyles({ size: 'lg', className: 'sm:flex-1' })}
              >
                Reservar turno
              </Link>
            </div>
          </div>
        </div>

        <SprigDivider className="my-14" />

        <div className="mx-auto max-w-3xl">
          <ServiceDetailBody service={detail} />
        </div>
      </div>
    </>
  );
}

/**
 * El camino de vuelta al catálogo.
 *
 * La categoría es un enlace al catálogo ya filtrado por ella, no texto suelto:
 * quien llegó acá desde un buscador y quiere ver qué más hay de lo mismo tiene que
 * poder hacerlo de un toque. Es además la forma de repartir hacia adentro el
 * tráfico que trae esta página.
 */
function Breadcrumb({
  categoryName,
  categorySlug,
}: {
  categoryName: string;
  categorySlug: string;
}) {
  // El nombre del parámetro sale de `CATALOG_PARAMS` y no escrito acá: es el
  // mismo que lee el catálogo para filtrar, y una letra distinta daría un enlace
  // que lleva al catálogo sin filtrar sin que se note.
  const categoryParams = new URLSearchParams({ [CATALOG_PARAMS.category]: categorySlug });

  return (
    <nav className="pt-8 pb-8 text-sm" aria-label="Ubicación">
      <ol className="flex flex-wrap items-center gap-2 text-ink-soft">
        <li>
          <Link to={PATHS.services} className="hover:text-forest">
            Servicios
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            to={`${PATHS.services}?${categoryParams.toString()}`}
            className="hover:text-forest"
          >
            {categoryName}
          </Link>
        </li>
      </ol>
    </nav>
  );
}

/** La ficha mientras llega. Conserva la forma de dos columnas para no saltar. */
function DetailSkeleton() {
  return (
    <div className="container-page pb-20" aria-busy="true" aria-label="Cargando el tratamiento">
      <div className="pt-8 pb-8">
        <div className="h-4 w-40 animate-pulse rounded bg-beige/60" />
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="aspect-[4/3] animate-pulse rounded-card bg-beige/60" />

        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-beige/60" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-beige/60" />
          <div className="h-4 w-full animate-pulse rounded bg-beige/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-beige/60" />
          <div className="h-8 w-32 animate-pulse rounded bg-beige/60" />
        </div>
      </div>
    </div>
  );
}

/**
 * Cuando la ficha no se pudo cargar.
 *
 * Se distingue el 404 de todo lo demás porque son dos situaciones opuestas: un
 * servicio que no existe —o que la estética desactivó, que para el caso es lo
 * mismo— se resuelve yendo al catálogo, mientras que un error del servidor se
 * resuelve esperando. Decirle "no existe" a alguien cuando en realidad la API se
 * cayó sería mandarlo a buscar algo que sí está.
 */
function DetailError({ notFound, error }: { notFound: boolean; error: unknown }) {
  const message = notFound
    ? 'No encontramos ese tratamiento.'
    : error instanceof ApiError
      ? error.message
      : 'No pudimos cargar el tratamiento. Volvé a intentar en unos minutos.';

  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl font-semibold">
        {notFound ? 'Ese tratamiento no está disponible' : 'Algo no salió bien'}
      </h1>

      <p className="mx-auto mt-4 max-w-md text-base text-ink-soft">{message}</p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to={PATHS.services} className={buttonStyles({ size: 'lg' })}>
          Ver todos los servicios
        </Link>

        <Link
          to={PATHS.contact}
          className={buttonStyles({ variant: 'outline', size: 'lg' })}
        >
          Contactanos
        </Link>
      </div>
    </div>
  );
}
