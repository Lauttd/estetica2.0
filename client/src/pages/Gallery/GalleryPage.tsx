import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GalleryGrid, GalleryGridSkeleton } from '@/components/gallery/GalleryGrid';
import { GalleryLightbox } from '@/components/gallery/GalleryLightbox';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { ApiError } from '@/api/client';
import { useGallery } from '@/queries/gallery.queries';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { cn } from '@/utils/cn';

/**
 * La galería de trabajos.
 *
 * LAS FOTOS SON DATOS, NO UNA LISTA ESCRITA ACÁ
 *
 * Salen de la API y las va a administrar la estética desde el panel. Mientras
 * tanto, las ocho filas sembradas apuntan a cuatro ilustraciones botánicas del
 * mismo lenguaje que el resto del sitio: §6 prohíbe las fotos genéricas de baja
 * calidad y §41 prohíbe inventar datos, así que una foto de stock de otro salón
 * sería una afirmación falsa sobre este. Se dice que son ilustraciones y listo.
 */
export function GalleryPage() {
  const gallery = useGallery();
  const { data: settings } = useSiteSettings();

  /** La categoría elegida, o `null` para "Todas". */
  const [category, setCategory] = useState<string | null>(null);

  /**
   * El visor. El índice se conserva al cerrar para que la foto no desaparezca
   * antes de que termine la animación de salida.
   */
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const images = gallery.data?.images ?? [];
  const categories = gallery.data?.categories ?? [];

  /**
   * El filtro aparece solo si hay más de una categoría.
   *
   * Hoy las ocho fotos están cargadas como "General", así que un filtro con una
   * sola opción sería un renglón de chips que no filtra nada. No es código
   * muerto: el servidor devuelve las categorías presentes justamente para esto, y
   * el día que la estética suba fotos de faciales y de manos el filtro se arma
   * solo.
   */
  const showFilter = categories.length > 1;
  const activeCategory = showFilter ? category : null;

  const visible =
    activeCategory === null
      ? images
      : images.filter((image) => image.category === activeCategory);

  const isPlaceholder = settings?.pending.gallery === true;

  function selectCategory(next: string | null) {
    setCategory(next);
    // El visor guarda una posición dentro de la lista que se está viendo: al
    // cambiar de filtro esa posición apunta a otra foto, así que vuelve al
    // principio.
    setIndex(0);
  }

  function openImage(at: number) {
    setIndex(at);
    setIsOpen(true);
  }

  return (
    <>
      <PageMeta
        title="Galería"
        description="Trabajos y resultados de KAYA KALPA Estética Profesional: faciales, corporales, manos, pies, pestañas y cejas."
      />

      <div className="container-page">
        <PageHeader
          title="Galería"
          /* El subtítulo cambia con la bandera, y no es un detalle de redacción:
             "algunos de los trabajos que hacemos" es una afirmación sobre la
             estética, y con los dibujos puestos sería falsa. El aviso de abajo la
             desmentiría dos centímetros más abajo, que es la peor forma de
             mentir: la que el propio sitio contradice. */
          subtitle={
            isPlaceholder
              ? 'Ilustraciones de la marca, mientras llegan las fotos de los trabajos.'
              : 'Algunos de los trabajos que hacemos en el salón.'
          }
        />

        <div className="space-y-8 pb-20">
          {/* El aviso de que las imágenes son ilustraciones. Va arriba y no al
              pie: es lo que hay que leer **antes** de mirar, no después. */}
          {isPlaceholder && images.length > 0 && (
            <p className="mx-auto max-w-2xl rounded-card border border-beige bg-ivory px-5 py-4 text-center text-sm text-ink-soft">
              Las imágenes de esta galería son ilustraciones de referencia. Las
              fotos de los trabajos se van a publicar cuando la estética las
              entregue.
            </p>
          )}

          {showFilter && (
            <nav aria-label="Filtrar por categoría">
              <ul className="flex flex-wrap justify-center gap-2">
                <li>
                  <Chip active={activeCategory === null} onClick={() => selectCategory(null)}>
                    Todas
                  </Chip>
                </li>

                {categories.map((name) => (
                  <li key={name}>
                    <Chip
                      active={activeCategory === name}
                      onClick={() => selectCategory(name)}
                    >
                      {name}
                    </Chip>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {gallery.isPending ? (
            <GalleryGridSkeleton />
          ) : gallery.isError ? (
            <GalleryError error={gallery.error} />
          ) : visible.length === 0 ? (
            <EmptyGallery filtered={activeCategory !== null} />
          ) : (
            <GalleryGrid images={visible} onOpen={openImage} />
          )}
        </div>
      </div>

      <GalleryLightbox
        images={visible}
        index={index}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigate={setIndex}
      />
    </>
  );
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: string;
}

/**
 * Un chip del filtro.
 *
 * Son botones y no enlaces, al contrario que los del catálogo. Ahí el filtro vive
 * en la dirección porque el catálogo filtrado se comparte por WhatsApp y se
 * prerenderiza; acá son ocho fotos y el filtro es una comodidad para mirar, así
 * que no hay nada que ganar ensuciando la dirección.
 */
function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      /* El color solo no alcanza para saber cuál está elegido. */
      aria-pressed={active}
      className={cn(
        'rounded-full border px-4 py-2 text-sm transition-colors duration-150',
        active
          ? 'border-forest bg-forest text-ivory'
          : 'border-beige bg-ivory text-ink hover:border-sage hover:text-forest',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Lo que se ve cuando la API no contestó.
 *
 * Se muestra el mensaje del servidor tal como llegó y no uno propio: si la API
 * explica qué pasó, esa explicación es mejor que cualquier texto genérico escrito
 * acá.
 */
function GalleryError({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'No pudimos cargar la galería. Volvé a intentar en unos minutos.';

  return (
    <div
      className="mx-auto max-w-md rounded-card border border-beige bg-ivory p-8 text-center"
      role="alert"
    >
      <p className="text-base text-ink">{message}</p>

      {error instanceof ApiError && error.requestId !== null && (
        <p className="mt-3 text-xs text-ink-soft">
          Si el problema sigue, mencioná este código: {error.requestId}
        </p>
      )}

      <Link to={PATHS.services} className={buttonStyles({ variant: 'outline', className: 'mt-6' })}>
        Ver los servicios
      </Link>
    </div>
  );
}

/**
 * Nada que mostrar.
 *
 * Se distinguen dos casos porque son dos problemas distintos: con un filtro
 * puesto lo que hay que hacer es sacarlo, y sin filtro la galería está vacía de
 * verdad —que es lo que pasa antes de que la estética cargue las fotos—.
 */
function EmptyGallery({ filtered }: { filtered: boolean }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-lg text-deep">
        {filtered
          ? 'No hay fotos en esa categoría.'
          : 'Todavía no hay fotos cargadas.'}
      </p>

      <p className="mt-3 text-sm text-ink-soft">
        {filtered
          ? 'Probá con otra categoría.'
          : 'Mientras tanto, podés ver los tratamientos y sus precios en el catálogo.'}
      </p>

      <Link to={PATHS.services} className={buttonStyles({ className: 'mt-6' })}>
        Ver los servicios
      </Link>
    </div>
  );
}
