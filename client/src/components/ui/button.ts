// =============================================================================
// KAYA KALPA — Estilos de botón
// =============================================================================
// Se exporta la función de estilos y no un componente `<Button>` porque la
// mayoría de los botones del sitio son enlaces: "Reservar turno" navega, no
// ejecuta nada. Un componente que hubiera que envolver en un `<Link>` para
// después pelear con el anidado de elementos sería más código para el mismo
// resultado.
//
// Quien necesite un `<button>` de verdad —un formulario, un acordeón— usa
// `buttonStyles()` sobre la etiqueta.
//
// El estado de foco no se define acá: lo pone la capa base del CSS para todo el
// sitio, así que no puede quedar un botón sin anillo de foco por olvido.
// =============================================================================

import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'outline';
export type ButtonSize = 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  /** La acción principal de la pantalla. Nunca hay dos juntos. */
  primary:
    'bg-forest text-ivory hover:bg-forest-dark active:bg-deep shadow-sm',
  /** La acción secundaria, cuando conviven dos. */
  outline:
    'border border-forest text-forest bg-transparent hover:bg-forest hover:text-ivory active:bg-forest-dark',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  /** Para el llamado principal en un teléfono, donde el dedo necesita más área. */
  lg: 'px-7 py-3.5 text-base',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa todo el ancho disponible. Es lo habitual en el menú del teléfono. */
  fullWidth?: boolean;
  className?: string;
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    // `inline-flex` y no `inline-block` para que el texto quede centrado también
    // cuando el botón lleva un ícono al lado.
    'inline-flex items-center justify-center gap-2 rounded-soft',
    // La transición es corta a propósito: un botón que tarda en reaccionar se
    // siente roto, no elegante.
    'font-medium tracking-wide transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}
