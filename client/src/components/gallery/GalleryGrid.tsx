import { cn } from '@/utils/cn';
import type { GalleryImage } from '@/types/gallery';

interface GalleryGridProps {
  images: GalleryImage[];
  /** Abre el visor en esa posición de la lista. */
  onOpen: (index: number) => void;
  className?: string;
}

/** Las columnas de la grilla, en el mismo orden en que las pide §25. */
const GRID_COLUMNS = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

/**
 * Cuántas fotos entran en la animación de entrada.
 *
 * Las que siguen aparecen de una. Con ocho fotos el tope no se nota, pero el día
 * que la estética cargue sesenta, una lista escalonada de sesenta pasos tendría a
 * la última esperando tres segundos y medio para aparecer: la animación dejaría
 * de ser un detalle y pasaría a ser la razón por la que la página se ve lenta.
 */
const STAGGER_LIMIT = 12;

/** El escalón entre una foto y la siguiente, en milisegundos. */
const STAGGER_STEP = 55;

/**
 * La grilla de la galería.
 *
 * DOS COLUMNAS EN EL TELÉFONO, TRES EN TABLETA, CUATRO EN ESCRITORIO (§25)
 *
 * Es lo que pide el prompt y además es lo que corresponde a cada ancho: a 375 px
 * dos fotos verticales se ven cómodas; a 768 px tres llenan la pantalla sin que
 * ninguna quede del tamaño de un sello; de 1024 px para arriba cuatro arman una
 * pared que se recorre de un vistazo.
 *
 * CADA FOTO ES UN BOTÓN Y NO UN ENLACE
 *
 * No lleva a otra página: abre el visor encima. Un `<a>` sin `href` que igual
 * hace algo es un enlace roto para quien navega con teclado o lector de pantalla.
 *
 * La proporción de cada foto sale de `width` y `height`, que vienen de la base, en
 * vez de estar fijada en `aspect-[4/5]`. Hoy todas son verticales 800×1000 y se
 * ven igual, pero el día que la estética suba una horizontal no se va a recortar
 * sola: la grilla le va a dar el alto que le corresponde.
 */
export function GalleryGrid({ images, onOpen, className }: GalleryGridProps) {
  return (
    <ul className={cn('grid gap-3 sm:gap-4', GRID_COLUMNS, className)}>
      {images.map((image, index) => (
        <li
          key={image.id}
          className="animate-rise"
          /* El escalón se corta en `STAGGER_LIMIT` y no crece con la lista. */
          style={{ animationDelay: `${Math.min(index, STAGGER_LIMIT) * STAGGER_STEP}ms` }}
        >
          <button
            type="button"
            onClick={() => onOpen(index)}
            className="group relative block w-full overflow-hidden rounded-card border border-beige bg-ivory shadow-card transition-shadow duration-200 hover:shadow-float"
            /* La proporción real de la foto, reservada antes de que el archivo
               llegue: sin esto la grilla se reacomoda mientras carga. */
            style={{ aspectRatio: `${image.width} / ${image.height}` }}
          >
            {/* El `alt` describe la foto, así que el botón ya tiene nombre: no
                hace falta un `aria-label` que diga "abrir imagen", que además
                taparía la descripción con algo menos útil. */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />

            {/* El velo del hover. Es decorativo —lo que hace falta saber ya está
                en el `alt`— pero es lo que avisa que la foto se puede tocar. */}
            <span
              className="absolute inset-0 bg-deep/0 transition-colors duration-200 group-hover:bg-deep/15"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lo que se ve mientras llegan las fotos.
 *
 * Es la misma grilla con la misma cantidad de columnas y la proporción de las
 * fotos cargadas, así que al llegar los datos nada se mueve de lugar. Un spinner
 * centrado cumpliría la misma función pero haría saltar la página entera al
 * terminar de cargar.
 */
export function GalleryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className={cn('grid gap-3 sm:gap-4', GRID_COLUMNS)}
      aria-busy="true"
      aria-label="Cargando la galería"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="aspect-[4/5] animate-pulse rounded-card border border-beige bg-beige/60" />
        </li>
      ))}
    </ul>
  );
}
