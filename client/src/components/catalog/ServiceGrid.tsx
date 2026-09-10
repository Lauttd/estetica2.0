import type { ReactNode } from 'react';
import { ServiceCard } from './ServiceCard';
import type { ServiceSummary } from '@/types/service';

interface ServiceGridProps {
  services: ServiceSummary[];
  /**
   * El icono de cada categoría, por slug.
   *
   * Llega armado desde la pantalla y no se consulta acá adentro: las categorías
   * son una sola petición para todo el catálogo, y pedirlas por tarjeta sería
   * treinta peticiones —o treinta lecturas de caché— para dibujar un adorno.
   */
  iconByCategory: ReadonlyMap<string, string | null>;
  onDetails?: ((service: ServiceSummary) => void) | undefined;
  /**
   * La acción del pie de cada tarjeta, armada a partir del servicio.
   *
   * Es una función y no un nodo ya hecho porque la acción depende del servicio
   * —cada uno sabe si ya está en el turno—. Ver `ServiceCard.action`.
   */
  renderAction?: ((service: ServiceSummary) => ReactNode) | undefined;
}

/**
 * La grilla del catálogo.
 *
 * Una columna en el teléfono y no dos: a 375 px, dos tarjetas dejan el nombre de
 * un servicio como "Limpieza Facial Profunda" cortado en cuatro renglones y el
 * precio apretado contra el borde. Una tarjeta por fila se lee bien y se toca
 * mejor, y como el catálogo se recorre con el filtro, el largo no molesta.
 *
 * En escritorio sí abre: dos, tres y hasta cuatro columnas, que es donde la grilla
 * gana —comparar precios de un vistazo—.
 */
export function ServiceGrid({
  services,
  iconByCategory,
  onDetails,
  renderAction,
}: ServiceGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {services.map((service) => (
        <li key={service.id} className="flex">
          <ServiceCard
            service={service}
            iconName={iconByCategory.get(service.category.slug) ?? null}
            onDetails={onDetails}
            action={renderAction?.(service)}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Lo que se ve mientras llega el catálogo.
 *
 * Es la misma grilla con la misma cantidad de columnas y un bloque de la altura
 * de una tarjeta en cada celda: así, cuando los datos llegan, nada se mueve de
 * lugar. Un spinner centrado cumpliría la misma función pero hace que la página
 * salte entera al terminar de cargar.
 */
export function ServiceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      /* Se anuncia una sola vez como "cargando" en lugar de que un lector de
         pantalla lea ocho tarjetas vacías. */
      aria-busy="true"
      aria-label="Cargando los servicios"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="overflow-hidden rounded-card border border-beige bg-ivory shadow-card">
            <div className="aspect-[4/3] animate-pulse bg-beige/60" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-beige/60" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-beige/60" />
              <div className="h-4 w-full animate-pulse rounded bg-beige/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-beige/60" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
