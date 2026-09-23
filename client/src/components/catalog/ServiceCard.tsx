import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PriceTag } from './PriceTag';
import { ServiceImage } from './ServiceImage';
import { buttonStyles } from '@/components/ui/button';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { formatDurationOrPending } from '@/utils/format';
import { buildServiceEnquiryLink } from '@/utils/whatsapp';
import type { ServiceSummary } from '@/types/service';

interface ServiceCardProps {
  service: ServiceSummary;
  /** El icono de la categoría, tal como lo manda `GET /api/categories`. */
  iconName: string | null;
  /** Abre el detalle en el modal. Si no se pasa, no se ofrece ese atajo. */
  onDetails?: ((service: ServiceSummary) => void) | undefined;
  /**
   * Reemplaza los botones del pie.
   *
   * En el catálogo la acción es "Reservar" —que lleva al asistente— y en el
   * asistente es "Agregar al turno". Son la misma tarjeta con dos acciones
   * distintas, y la alternativa a este prop sería un segundo componente con las
   * mismas noventa líneas de maquetado copiadas, que es la forma más segura de
   * que un día las dos tarjetas se vean distinto sin que nadie lo haya decidido.
   */
  action?: ReactNode;
}

/**
 * Una tarjeta del catálogo.
 *
 * LA ACCIÓN PRINCIPAL NO ES SIEMPRE LA MISMA, Y ESO ES EL PUNTO
 *
 * Once de los treinta servicios no tienen duración confirmada, y sin duración el
 * servidor no los puede agendar: `bookableOnline` llega en `false`. Para esos, un
 * botón de "Reservar" llevaría a un asistente que no puede hacer nada con ellos.
 * La tarjeta ofrece WhatsApp en su lugar, que es el canal por el que la estética
 * ya recibe consultas.
 *
 * La decisión **no se toma acá**: se lee `bookableOnline`, que el servidor ya
 * calculó. Deducir la regla en el cliente —"si no hay duración, no se puede
 * reservar"— sería tenerla escrita en dos lugares, y el día que cambie una de las
 * dos el catálogo va a ofrecer algo que el servidor rechaza.
 */
export function ServiceCard({ service, iconName, onDetails, action }: ServiceCardProps) {
  const { data: settings } = useSiteSettings();

  const enquiryLink = buildServiceEnquiryLink(
    settings?.contact.whatsappNumber ?? null,
    service.name,
    settings?.contact.whatsappMessage ?? null,
  );

  const detailHref = PATHS.serviceDetail(service.slug);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-beige bg-ivory shadow-card transition-shadow duration-200 hover:shadow-float">
      <Link
        to={detailHref}
        className="block aspect-[4/3] overflow-hidden"
        /* El enlace ya lleva el nombre del servicio en el título de abajo: sin
           esto, un lector de pantalla lo anunciaría dos veces con el mismo texto. */
        tabIndex={-1}
        aria-hidden="true"
      >
        <ServiceImage
          src={service.image}
          alt={service.name}
          iconName={iconName}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <p className="text-xs font-medium tracking-wider text-olive uppercase">
          {service.category.name}
        </p>

        <h3 className="mt-2 text-base sm:text-xl">
          <Link
            to={detailHref}
            className="transition-colors duration-150 hover:text-forest"
          >
            {service.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
          {service.shortDescription}
        </p>

        <div className="mt-4 flex flex-col gap-1 border-t border-beige pt-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3 sm:gap-y-1 sm:pt-4">
          <PriceTag service={service} />
          <span className="text-xs text-ink-soft sm:text-sm">
            {formatDurationOrPending(service.durationMin)}
          </span>
        </div>

        {/* `mt-auto` empuja los botones al pie para que queden alineados entre
            tarjetas de distinta altura: sin esto, una descripción de dos líneas
            deja los botones más abajo que la de al lado y la grilla se ve
            desprolija. */}
        <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:pt-5">
          {action !== undefined ? (
            action
          ) : (
            <>
              {onDetails !== undefined && (
                <button
                  type="button"
                  onClick={() => onDetails(service)}
                  className={buttonStyles({ variant: 'outline', className: 'flex-1' })}
                >
                  Ver más
                </button>
              )}

              {service.bookableOnline ? (
                <Link
                  to={PATHS.booking}
                  className={buttonStyles({ className: 'flex-1' })}
                >
                  Reservar
                </Link>
              ) : (
                enquiryLink !== null && (
                  <a
                    href={enquiryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    /* "Consultar" a secas no dice por dónde: quien usa un lector de
                       pantalla necesita saber que abre WhatsApp. */
                    aria-label={`Consultar por ${service.name} por WhatsApp`}
                    className={buttonStyles({ variant: 'outline', className: 'flex-1' })}
                  >
                    Consultar
                  </a>
                )
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
