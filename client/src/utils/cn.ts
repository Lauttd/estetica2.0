import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases de Tailwind resolviendo los conflictos.
 *
 * Sin `twMerge`, un componente con `px-4` propio y `px-8` pasado desde afuera
 * aplicaría las dos y ganaría la que esté más abajo en la hoja de estilos —que no
 * es la que se escribió última—. Con esto, la última gana, que es lo que
 * cualquiera espera.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
