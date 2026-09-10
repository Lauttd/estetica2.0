import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/money';
import type { ServiceSummary } from '@/types/service';

interface PriceTagProps {
  service: ServiceSummary;
  className?: string;
}

/**
 * El precio de un servicio, con el caso "a consultar" ya resuelto.
 *
 * La bandera `priceOnRequest` la calcula el servidor y es la fuente de verdad: el
 * chequeo de `priceCents === null` está por si alguna respuesta llegara sin la
 * bandera. Las dos cosas significan lo mismo, así que mostrar el texto de "a
 * consultar" cuando cualquiera de las dos lo pide nunca puede estar mal.
 *
 * Lo que **no** se hace es mostrar `$ 0`. Un cero en este sistema significa
 * bonificado, que es lo contrario de "todavía no lo cargamos", y §41 prohíbe
 * inventar el precio que falta.
 */
export function PriceTag({ service, className }: PriceTagProps) {
  const onRequest = service.priceOnRequest || service.priceCents === null;

  return (
    <span
      className={cn(
        'text-lg font-semibold',
        // El precio a consultar va en gris y un punto más chico: no es un precio,
        // y darle el mismo peso visual que a uno real invita a leerlo como si lo
        // fuera.
        onRequest ? 'text-base font-normal text-ink-soft' : 'text-deep',
        className,
      )}
    >
      {formatPrice(onRequest ? null : service.priceCents, service.currency)}
    </span>
  );
}
