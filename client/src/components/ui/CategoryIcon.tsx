import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Los iconos de las categorías.
 *
 * El servidor guarda **el nombre** del icono (`face`, `hands`, `leaf`…) y no el
 * dibujo, porque el dibujo es una decisión de presentación: cambia si cambia el
 * diseño y no tiene por qué tocar la base. Este archivo es el otro extremo de ese
 * acuerdo — el set completo, en un solo lugar.
 *
 * Son trazos de línea y no rellenos, con el mismo grosor que la rama del sitio.
 * Un icono de color pleno al lado de la tipografía serif se lee como una pegatina;
 * a línea, acompaña. Todos dibujan dentro de la misma caja de 24 y usan
 * `currentColor`, así que heredan el color del texto que los rodea.
 *
 * Un nombre desconocido —o `null`, que es lo que llega hoy en las siete
 * categorías— cae al motivo botánico del sitio. Nunca a un cuadro vacío: un hueco
 * en la grilla se lee como un error del sitio.
 */
const ICONS: Record<string, ReactNode> = {
  /** Faciales: un rostro sereno, de línea. */
  face: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M9.5 14.6c.7.9 1.5 1.3 2.5 1.3s1.8-.4 2.5-1.3" />
    </>
  ),

  /** Radiofrecuencia: el destello de la energía aplicada. */
  sparkles: (
    <>
      <path d="M13 3Q14 11 22 12 14 13 13 21 12 13 4 12 12 11 13 3Z" />
      <path d="M5.5 2.5Q6 5.5 9 6 6 6.5 5.5 9.5 5 6.5 2 6 5 5.5 5.5 2.5Z" />
    </>
  ),

  /** Masajes corporales: una flor de loto, que es el gesto del masaje. */
  hands: (
    <>
      <path d="M12 11.5C14.2 14.6 14.2 17.6 12 20.5 9.8 17.6 9.8 14.6 12 11.5Z" />
      <path d="M12 20.5C9.2 19.4 7.3 17 6.8 14 9.9 14.3 11.9 16.7 12 20.5Z" />
      <path d="M12 20.5C14.8 19.4 16.7 17 17.2 14 14.1 14.3 12.1 16.7 12 20.5Z" />
    </>
  ),

  /** Maderoterapia: una hoja, que es de lo que están hechas las maderas. */
  leaf: (
    <>
      <path d="M5 19C5 11 11 5 19 5 19 13 13 19 5 19Z" />
      <path d="M5 19C9 15 13 11 19 5" />
    </>
  ),

  /** Manos: una mano abierta. */
  hand: (
    <>
      <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 11V7.5a1.5 1.5 0 0 1 3 0V13" />
      <path d="M8 12v-1a1.5 1.5 0 0 0-3 0v4a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6" />
    </>
  ),

  /** Pies: una planta y sus dedos. */
  foot: (
    <>
      <path d="M10 11.5c-1.7 0-3 1.7-3 4.2 0 2.4 1.2 4.3 3 4.3s3-1.9 3-4.3c0-2.5-1.3-4.2-3-4.2Z" />
      <circle cx="6.6" cy="6.6" r="1.8" />
      <circle cx="10.6" cy="4.4" r="1.6" />
      <circle cx="14.2" cy="5.4" r="1.3" />
      <circle cx="16.8" cy="8.2" r="1" />
    </>
  ),

  /** Pestañas y cejas: el ojo con sus pestañas. */
  eye: (
    <>
      <path d="M12 6.5c4.5 0 8.2 2.6 9.7 5.5-1.5 2.9-5.2 5.5-9.7 5.5S3.8 14.9 2.3 12C3.8 9.1 7.5 6.5 12 6.5Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M5 16.4l-1.3 1.9M9.3 18.5l-.7 2.1M14.7 18.5l.7 2.1M19 16.4l1.3 1.9" />
    </>
  ),
};

/** El motivo botánico, para una categoría sin icono propio o con uno desconocido. */
const FALLBACK: ReactNode = (
  <>
    <path d="M12 21V9" />
    <path d="M12 15c-3.2 0-5-1.8-5-4.6C10.2 10.4 12 12.2 12 15Z" />
    <path d="M12 11.5c3.2 0 5-1.8 5-4.6-3.2 0-5 1.8-5 4.6Z" />
  </>
);

interface CategoryIconProps {
  /** El nombre que manda la API. `null` cae al motivo botánico. */
  name: string | null;
  className?: string;
}

export function CategoryIcon({ name, className }: CategoryIconProps) {
  // `name` puede ser null y `ICONS[name]` daría undefined: con
  // `noUncheckedIndexedAccess` el compilador obliga a contemplarlo, y el `??`
  // es la respuesta correcta y no una forma de callarlo.
  const shape = (name === null ? undefined : ICONS[name]) ?? FALLBACK;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      /* Decorativo: la categoría siempre aparece escrita al lado. */
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
