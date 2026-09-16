import { useEffect } from 'react';
import { Dialog, DialogPanel, CloseButton, Transition } from '@headlessui/react';
import { cn } from '@/utils/cn';
import type { GalleryImage } from '@/types/gallery';

interface GalleryLightboxProps {
  images: GalleryImage[];
  /**
   * Qué foto se está mirando.
   *
   * Se conserva después de cerrar, durante la animación de salida: si el padre la
   * borrara al cerrar, el visor se vaciaría antes de terminar de irse.
   */
  index: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * El visor de una foto.
 *
 * SOBRE FONDO OSCURO, AL CONTRARIO QUE EL RESTO DEL SITIO
 *
 * Es la única pantalla del sitio que no es clara, y es a propósito: acá la foto es
 * lo único que importa, y sobre crema una foto con fondo claro se confunde con la
 * página. El verde profundo del sistema hace de fondo neutro sin meter un gris
 * que no está en la paleta.
 *
 * SE PUEDE RECORRER SIN EL MOUSE
 *
 * Las flechas del teclado y los botones hacen lo mismo, y el foco queda atrapado
 * adentro mientras está abierto (lo pone el `Dialog` de Headless UI). Sin eso,
 * tabular desde el visor llevaría a los enlaces del pie, que están tapados por el
 * fondo oscuro: se estaría navegando a ciegas entre cosas que no se ven.
 *
 * La foto no se estira más allá de la pantalla: `max-h` y `object-contain` para
 * que una imagen muy alta se vea entera en lugar de recortada.
 */
export function GalleryLightbox({
  images,
  index,
  open,
  onClose,
  onNavigate,
}: GalleryLightboxProps) {
  const current = images[index];
  const total = images.length;
  const hasMany = total > 1;

  const goPrevious = () => onNavigate((index - 1 + total) % total);
  const goNext = () => onNavigate((index + 1) % total);

  /**
   * Las flechas del teclado.
   *
   * El `Escape` no está acá: lo maneja el `Dialog`, que además es el que sabe si
   * se puede cerrar. Duplicarlo sería tener dos manejadores del mismo evento.
   */
  useEffect(() => {
    if (!open || !hasMany) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onNavigate((index - 1 + total) % total);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNavigate((index + 1) % total);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, hasMany, index, total, onNavigate]);

  // Sin foto no hay nada que mostrar. Pasa solo si la lista llegara vacía con el
  // visor abierto, que la pantalla no permite, pero `images[index]` puede ser
  // `undefined` y el compilador obliga a contemplarlo.
  if (current === undefined) return null;

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <Transition show={open}>
        <div
          className="fixed inset-0 bg-deep/95 backdrop-blur-sm transition duration-200 ease-out data-[closed]:opacity-0"
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex flex-col">
          {/* La barra de arriba: la cuenta y el botón de cerrar. Va separada de
              la foto para que el botón no se corra cuando la foto cambia de
              tamaño al pasar de una vertical a una horizontal. */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="text-sm text-cream/70" aria-live="polite">
              {index + 1} / {total}
            </p>

            <CloseButton
              className="rounded-soft p-2 text-cream/80 transition-colors duration-150 hover:text-cream"
              aria-label="Cerrar la imagen"
            >
              <CloseIcon />
            </CloseButton>
          </div>

          {/* `min-h-0` en la fila y `h-full` en el panel: la foto tiene que
              quedar **adentro** del alto que sobra después de la barra de
              arriba. Sin eso, el panel mide lo que mide la imagen —`max-h-full`
              de un padre sin alto propio no limita nada— y una foto vertical se
              va abajo de la pantalla, que es exactamente lo que hace que un
              visor se sienta roto. */}
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pt-2 pb-4 sm:gap-4 sm:px-6">
            {hasMany && <ArrowButton direction="previous" onClick={goPrevious} />}

            <DialogPanel
              transition
              className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center transition duration-200 ease-out data-[closed]:scale-[0.98] data-[closed]:opacity-0"
            >
              <img
                key={current.id}
                src={current.src}
                alt={current.alt}
                decoding="async"
                className="max-h-full max-w-full animate-zoom-in rounded-card object-contain"
              />
            </DialogPanel>

            {hasMany && <ArrowButton direction="next" onClick={goNext} />}
          </div>
        </div>
      </Transition>
    </Dialog>
  );
}

interface ArrowButtonProps {
  direction: 'previous' | 'next';
  onClick: () => void;
}

/**
 * Las flechas de los costados.
 *
 * Van fuera del panel de la foto y no encima: superpuestas, taparían un pedazo de
 * una imagen horizontal en un teléfono, que es justo donde el ancho no sobra.
 */
function ArrowButton({ direction, onClick }: ArrowButtonProps) {
  const isPrevious = direction === 'previous';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrevious ? 'Imagen anterior' : 'Imagen siguiente'}
      className={cn(
        'shrink-0 rounded-full border border-cream/25 p-2.5 text-cream/80',
        'transition-colors duration-150 hover:border-cream/50 hover:text-cream sm:p-3',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d={isPrevious ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
