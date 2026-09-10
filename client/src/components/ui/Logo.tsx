import { BRAND } from '@/config/brand';
import { cn } from '@/utils/cn';
import { Sprig } from './Sprig';

type LogoSize = 'sm' | 'md' | 'lg';
type LogoTone = 'light' | 'dark';

interface LogoProps {
  size?: LogoSize;
  /**
   * `light` para fondos claros (la navbar), `dark` para la banda verde del pie.
   * No se detecta solo: el mismo componente se usa en los dos lugares y quién
   * mejor sabe sobre qué fondo está es quien lo coloca.
   */
  tone?: LogoTone;
  className?: string;
}

const SIZES: Record<LogoSize, { name: string; tagline: string; sprig: string }> = {
  sm: {
    name: 'text-base tracking-[0.2em]',
    tagline: 'text-[0.5rem] tracking-[0.34em]',
    sprig: 'h-3.5 w-3.5',
  },
  md: {
    name: 'text-xl tracking-[0.22em]',
    tagline: 'text-[0.6rem] tracking-[0.36em]',
    sprig: 'h-4 w-4',
  },
  lg: {
    name: 'text-3xl tracking-[0.2em]',
    tagline: 'text-xs tracking-[0.4em]',
    sprig: 'h-5 w-5',
  },
};

/**
 * La marca.
 *
 * Mientras el logo real no esté, dibuja el nombre con la tipografía del sitio:
 * `KAYA KALPA` en la serif de caja alta y `ESTÉTICA PROFESIONAL` debajo, que es
 * literalmente cómo está compuesto el original. No es un cartel de "falta el
 * logo": es una marca tipográfica terminada, que además es lo que se ve en el
 * encabezado de la lista de precios.
 *
 * El día que llegue el archivo, esto pasa a mostrar la imagen sola y no hay que
 * tocar ningún otro componente: se cambia `BRAND.logoUrl` y listo.
 */
export function Logo({ size = 'md', tone = 'light', className }: LogoProps) {
  const styles = SIZES[size];

  if (BRAND.logoUrl !== null) {
    return (
      <img
        src={BRAND.logoUrl}
        alt={BRAND.logoAlt}
        className={cn(
          size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-14',
          'w-auto',
          className,
        )}
      />
    );
  }

  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      <span className="flex items-center gap-2">
        <Sprig className={cn(styles.sprig, tone === 'dark' ? 'text-sage' : 'text-olive')} />
        <span
          className={cn(
            'font-display leading-none font-semibold uppercase',
            styles.name,
            tone === 'dark' ? 'text-cream' : 'text-deep',
          )}
        >
          {BRAND.name}
        </span>
        <Sprig
          className={cn(
            styles.sprig,
            'scale-x-[-1]',
            tone === 'dark' ? 'text-sage' : 'text-olive',
          )}
        />
      </span>

      <span
        className={cn(
          'leading-none font-medium uppercase',
          styles.tagline,
          tone === 'dark' ? 'text-sage' : 'text-ink-soft',
        )}
      >
        {BRAND.tagline}
      </span>
    </span>
  );
}
