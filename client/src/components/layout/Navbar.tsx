import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  CloseButton,
} from '@headlessui/react';
import { Logo } from '@/components/ui/Logo';
import { buttonStyles } from '@/components/ui/button';
import { DESKTOP_NAV, MAIN_NAV } from '@/config/navigation';
import { PATHS } from '@/routes/paths';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';
import { cn } from '@/utils/cn';

/** El estilo de un enlace de la barra de escritorio. */
function desktopLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-soft px-3 py-2 text-sm transition-colors duration-150',
    isActive ? 'text-forest font-medium' : 'text-ink hover:text-forest',
  );
}

/**
 * La barra de navegación.
 *
 * Es `sticky` y no `fixed`: ocupa su lugar en el flujo y el contenido no tiene
 * que compensarla con un margen que después hay que mantener sincronizado con su
 * altura. El CSS ya reserva el alto al saltar a un ancla.
 *
 * En el teléfono los enlaces van a un panel lateral en vez de a un desplegable
 * debajo de la barra: con cinco secciones, un panel que entra desde el costado
 * deja los enlaces grandes y separados, y el pulgar llega a todos.
 */
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { data: settings } = useSiteSettings();

  // Cerrar el panel al navegar. Sin esto, tocar un enlace cambia la página de
  // fondo y el panel se queda abierto tapando el contenido nuevo.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-beige bg-cream/95 backdrop-blur-sm">
      <nav
        className="container-page flex h-20 items-center justify-between gap-4"
        aria-label="Navegación principal"
      >
        <Link to={PATHS.home} aria-label="Ir a la página de inicio">
          <Logo size="sm" />
        </Link>

        {/* En escritorio se dibuja `DESKTOP_NAV`, que es `MAIN_NAV` sin los
            enlaces marcados como solo-mobile. Es la misma lista: §5 pide seis
            enlaces arriba y siete en el panel del teléfono. */}
        <ul className="hidden items-center gap-1 lg:flex">
          {DESKTOP_NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={desktopLinkClass}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* En pantallas muy chicas el botón vive solo en el panel: junto al
              logo no entraría sin apretar los dos. */}
          <Link
            to={PATHS.myBookings}
            className={buttonStyles({ className: 'hidden sm:inline-flex' })}
          >
            Mis turnos
          </Link>
          <Link
            to={PATHS.bookingLookup}
            className={buttonStyles({
              variant: 'outline',
              className: 'hidden sm:inline-flex',
            })}
          >
            Consultar mi turno
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="-mr-2 rounded-soft p-2 text-deep lg:hidden"
            aria-label="Abrir el menú"
            aria-expanded={isMenuOpen}
          >
            <BarsIcon />
          </button>
        </div>
      </nav>

      <Dialog
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        className="relative z-50 lg:hidden"
      >
        <div
          className="fixed inset-0 bg-deep/40 backdrop-blur-sm transition duration-200 ease-out data-[closed]:opacity-0"
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex justify-end">
          <DialogPanel
            transition
            className="flex h-full w-full max-w-xs flex-col overflow-y-auto bg-ivory p-6 shadow-float transition duration-200 ease-out data-[closed]:translate-x-full"
          >
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="sr-only">Menú</DialogTitle>
              <Logo size="sm" />
              <CloseButton
                className="-mr-2 -mt-1 rounded-soft p-2 text-deep"
                aria-label="Cerrar el menú"
              >
                <CloseIcon />
              </CloseButton>
            </div>

            <ul className="mt-10 flex flex-col gap-1">
              {MAIN_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-soft px-3 py-3 text-base transition-colors duration-150',
                        isActive
                          ? 'bg-beige text-forest font-medium'
                          : 'text-ink hover:bg-beige',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <Link               to={PATHS.myBookings} className={buttonStyles({ size: 'lg', fullWidth: true })}>
                Mis turnos
              </Link>
              <Link
                to={PATHS.bookingLookup}
                className={buttonStyles({
                  variant: 'outline',
                  size: 'lg',
                  fullWidth: true,
                })}
              >
                Consultar mi turno
              </Link>

              {/* Si la estética todavía no cargó el WhatsApp, el botón no se
                  muestra: un enlace a `wa.me` sin número abre un error de
                  WhatsApp, y eso se lee como "no atienden". */}
              {whatsappLink !== null && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({
                    variant: 'outline',
                    size: 'lg',
                    fullWidth: true,
                  })}
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </header>
  );
}

function BarsIcon() {
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
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
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
