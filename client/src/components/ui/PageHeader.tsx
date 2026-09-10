import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { SprigDivider } from './Sprig';

interface PageHeaderProps {
  title: string;
  /** Una línea que explique de qué se trata la página. */
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * El encabezado de las páginas que no son la de inicio.
 *
 * Existe para que "Servicios", "Nosotros", "Galería", "Preguntas frecuentes" y
 * "Contacto" empiecen todas igual: mismo aire arriba, mismo tamaño de título,
 * mismo separador. Es la clase de detalle que hace que un sitio se vea cuidado
 * sin que nadie pueda señalar por qué.
 */
export function PageHeader({
  title,
  subtitle,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('pt-12 pb-10 text-center sm:pt-16', className)}>
      <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl">{title}</h1>

      <SprigDivider className="mt-6" />

      {subtitle !== undefined && (
        <p className="mx-auto mt-6 max-w-2xl text-base text-ink-soft sm:text-lg">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
}
