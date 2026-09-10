import { cn } from '@/utils/cn';

interface SprigProps {
  className?: string;
}

/**
 * El motivo botánico del sitio: una rama con dos hojas.
 *
 * Va como SVG en línea y no como archivo por dos razones. Se colorea con
 * `currentColor`, así que sirve igual sobre el fondo crema y sobre la banda
 * verde del pie sin necesidad de un segundo archivo. Y no cuesta una petición
 * más: son tres trazos.
 *
 * Está inspirado en el material de la estética, no copiado: es una rama
 * genérica, sin el detalle del original.
 */
export function Sprig({ className }: SprigProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      className={cn('h-5 w-5', className)}
      /* Es decorativo: el texto que lo acompaña ya dice todo. Sin esto, un lector
         de pantalla lo anunciaría como una imagen sin nombre. */
      aria-hidden="true"
    >
      <path d="M12 21V9" />
      <path d="M12 15c-3.2 0-5-1.8-5-4.6C10.2 10.4 12 12.2 12 15Z" />
      <path d="M12 11.5c3.2 0 5-1.8 5-4.6-3.2 0-5 1.8-5 4.6Z" />
    </svg>
  );
}

/**
 * La rama como separador horizontal entre secciones.
 *
 * Es la misma pieza con dos trazos finos a los costados, para que no quede
 * flotando sola en el medio de la página.
 */
export function SprigDivider({ className }: SprigProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-4', className)}
      aria-hidden="true"
    >
      <span className="h-px w-16 bg-beige" />
      <Sprig className="h-5 w-5 text-sage" />
      <span className="h-px w-16 bg-beige" />
    </div>
  );
}
