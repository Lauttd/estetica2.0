import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { cn } from '@/utils/cn';

interface ServiceImageProps {
  /** La dirección de la foto, o `null` si todavía no hay. */
  src: string | null;
  /** Lo que muestra la foto. Es también el texto alternativo. */
  alt: string;
  /**
   * El nombre del icono de la categoría, tal como lo manda `GET /api/categories`.
   *
   * Llega por prop y no se deduce del servicio a propósito: el icono es un dato
   * de la categoría y vive en la base, editable desde el panel. Una tabla de
   * correspondencias acá sería una segunda fuente de verdad que el día que la
   * estética cambie un icono quedaría mostrando el viejo sin que nadie lo note.
   */
  iconName: string | null;
  className?: string;
  /** El tamaño del icono de reemplazo. En el detalle la caja es más grande. */
  iconClassName?: string;
}

/**
 * La imagen de un servicio, o su reemplazo botánico.
 *
 * **Ningún servicio tiene foto todavía** —`image` llega en `null` en los treinta— y
 * §6 prohíbe usar fotos de stock. Así que el reemplazo no es un "mientras tanto"
 * provisorio: es lo que se va a ver hasta que la estética entregue sus propias
 * fotos, y por eso está dibujado con el mismo cuidado que el resto del sitio en
 * lugar de ser un rectángulo gris con un ícono de imagen rota.
 *
 * El fondo es un verde muy lavado y no un gris: sobre el crema de la página un
 * gris se lee como un hueco, y un verde se lee como una decisión.
 *
 * El día que llegue la foto no hay que tocar ninguna tarjeta: `image` ya viaja en
 * la respuesta y este componente la usa sola.
 */
export function ServiceImage({
  src,
  alt,
  iconName,
  className,
  iconClassName,
}: ServiceImageProps) {
  if (src !== null && src.trim().length > 0) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-forest/5',
        className,
      )}
      /* Decorativo: el nombre del servicio está escrito al lado, en la tarjeta. */
      aria-hidden="true"
    >
      <CategoryIcon
        name={iconName}
        className={cn('h-12 w-12 text-forest/35', iconClassName)}
      />
    </div>
  );
}
