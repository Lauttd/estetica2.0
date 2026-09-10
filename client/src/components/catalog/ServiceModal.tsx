import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  CloseButton,
  Transition,
} from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { PriceTag } from './PriceTag';
import { ServiceImage } from './ServiceImage';
import { ServiceDetailBody } from './ServiceDetailBody';
import { buttonStyles } from '@/components/ui/button';
import { serviceDetailQueryOptions } from '@/queries/services.queries';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { buildServiceEnquiryLink } from '@/utils/whatsapp';
import type { ServiceSummary } from '@/types/service';

interface ServiceModalProps {
  /**
   * El servicio a mostrar. Se conserva después de cerrar, durante la animación de
   * salida: si el padre lo borrara al cerrar, el panel se vaciaría antes de
   * terminar de irse y se vería el contenido desaparecer de golpe.
   */
  service: ServiceSummary | null;
  open: boolean;
  iconName: string | null;
  onClose: () => void;
}

/**
 * El detalle de un servicio sin salir del catálogo.
 *
 * Es una hoja que sube desde abajo en el teléfono y un panel centrado en
 * escritorio (§34). La diferencia no es decorativa: en un teléfono, un panel
 * centrado deja el botón de cerrar lejos del pulgar, y una hoja que sube se cierra
 * con un gesto natural y deja ver el catálogo detrás.
 *
 * Pide el detalle completo a la API al abrirse. La tarjeta solo trae el resumen
 * —nombre, precio, duración—, y la descripción larga, los beneficios y los
 * profesionales no viajan en la lista porque en treinta servicios multiplicarían
 * el peso de la respuesta.
 */
export function ServiceModal({ service, open, iconName, onClose }: ServiceModalProps) {
  const { data: settings } = useSiteSettings();

  const slug = service?.slug ?? '';

  const detail = useQuery({
    ...serviceDetailQueryOptions(slug),
    // Solo se pide con el modal abierto: el catálogo no tiene por qué traer
    // treinta fichas completas para mostrar una.
    enabled: open && service !== null,
  });

  if (service === null) return null;

  const enquiryLink = buildServiceEnquiryLink(
    settings?.contact.whatsappNumber ?? null,
    service.name,
    settings?.contact.whatsappMessage ?? null,
  );

  const detailHref = PATHS.serviceDetail(service.slug);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <Transition show={open}>
        <div
          className="fixed inset-0 bg-deep/40 backdrop-blur-sm transition duration-200 ease-out data-[closed]:opacity-0"
          aria-hidden="true"
        />

        {/* `items-end` en el teléfono y `items-center` de `sm` para arriba: es el
            único cambio que separa la hoja del panel centrado. */}
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
          <DialogPanel
            transition
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card bg-ivory shadow-float transition duration-200 ease-out data-[closed]:translate-y-8 data-[closed]:opacity-0 sm:max-w-2xl sm:rounded-card"
          >
            <div className="flex items-start justify-between gap-4 border-b border-beige px-6 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wider text-olive uppercase">
                  {service.category.name}
                </p>
                <DialogTitle className="mt-1 text-2xl">{service.name}</DialogTitle>
              </div>

              <CloseButton
                className="-mr-2 shrink-0 rounded-soft p-2 text-ink-soft transition-colors duration-150 hover:text-deep"
                aria-label="Cerrar"
              >
                <CloseIcon />
              </CloseButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-6 aspect-[16/9] overflow-hidden rounded-card">
                <ServiceImage
                  src={service.image}
                  alt={service.name}
                  iconName={iconName}
                  iconClassName="h-16 w-16"
                />
              </div>

              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <PriceTag service={service} className="text-2xl" />
                <Link
                  to={detailHref}
                  className="text-sm text-forest underline underline-offset-4"
                >
                  Ver la ficha completa
                </Link>
              </div>

              {detail.isPending ? (
                <DetailSkeleton />
              ) : detail.isError ? (
                /* El resumen ya se ve arriba, así que un fallo acá no deja la
                   pantalla vacía: se avisa que lo largo no llegó y se ofrece la
                   ficha completa, que se pide por otra vía. */
                <p className="rounded-soft bg-beige/50 px-4 py-3 text-sm text-ink-soft">
                  No pudimos cargar la descripción completa. Podés verla en la
                  ficha del tratamiento.
                </p>
              ) : (
                <ServiceDetailBody
                  service={detail.data}
                  actions={
                    <>
                      {service.bookableOnline ? (
                        <Link
                          to={PATHS.booking}
                          onClick={onClose}
                          className={buttonStyles({ className: 'flex-1' })}
                        >
                          Reservar turno
                        </Link>
                      ) : (
                        enquiryLink !== null && (
                          <a
                            href={enquiryLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonStyles({ className: 'flex-1' })}
                          >
                            Consultar por WhatsApp
                          </a>
                        )
                      )}

                      <Link
                        to={detailHref}
                        onClick={onClose}
                        className={buttonStyles({
                          variant: 'outline',
                          className: 'flex-1',
                        })}
                      >
                        Ver ficha completa
                      </Link>
                    </>
                  }
                />
              )}
            </div>
          </DialogPanel>
        </div>
      </Transition>
    </Dialog>
  );
}

/** Un bloque con la forma del contenido, para que el panel no salte al cargar. */
function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando el detalle">
      <div className="h-4 w-full animate-pulse rounded bg-beige/60" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-beige/60" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-beige/60" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-beige/60" />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
