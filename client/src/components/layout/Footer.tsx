import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { MAIN_NAV } from '@/config/navigation';
import { BRAND } from '@/config/brand';
import { PATHS } from '@/routes/paths';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildMapsLink, buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * El pie de página.
 *
 * Es la banda verde del sitio y el lugar donde están los datos que la gente
 * busca cuando ya se decidió: dónde queda, a qué número escribir. Todos salen de
 * la configuración que la estética edita desde el panel, ninguno está escrito
 * acá.
 *
 * El `pb-36` del final no es decorativo: es el espacio para que lo que flota abajo
 * no tape las últimas líneas cuando se llega al fondo. En un teléfono son dos
 * cosas —la barra de reserva y, por encima, el botón de WhatsApp— y entre las dos
 * ocupan unos 124 px. Desde `sm` la barra no existe y el botón vuelve al borde, así
 * que alcanza con el relleno de siempre.
 */
export function Footer() {
  const { data: settings } = useSiteSettings();

  const address = settings?.location.address ?? null;
  const city = settings?.location.city ?? null;
  const phoneDisplay = settings?.contact.phoneDisplay ?? null;
  const mapsLink = buildMapsLink(settings?.location.mapsQuery ?? null);
  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  // Las redes se muestran solo si hay dirección confirmada. Hay nombre cargado
  // para Instagram y Facebook pero la URL todavía no está: un ícono que no lleva
  // a ningún lado se ve como un error del sitio, no como un dato faltante.
  const socials = [
    { label: 'Instagram', url: settings?.social.instagramUrl ?? null },
    { label: 'Facebook', url: settings?.social.facebookUrl ?? null },
  ].filter((social): social is { label: string; url: string } => social.url !== null);

  return (
    <footer className="bg-forest mt-24 text-cream">
      <div className="container-page pt-14 pb-36 sm:pb-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* ---------------------------------------------------------------- */}
          <div>
            <Logo tone="dark" size="md" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/80">
              Tratamientos faciales y corporales, manos, pies, pestañas y cejas.
              Trabajamos con turno para dedicarle a cada persona el tiempo que
              necesita.
            </p>

            {socials.length > 0 && (
              <ul className="mt-6 flex gap-4">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cream/80 underline underline-offset-4 transition-colors hover:text-cream"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          <nav aria-label="Secciones del sitio">
            <h2 className="text-sm font-semibold tracking-wider text-cream uppercase">
              Secciones
            </h2>
            {/* La lista entera, sin `mobileOnly`: §27 pide las siete secciones
                también acá, incluidas las preguntas frecuentes. Antes había
                además un "Reservar turno" suelto; ahora sobra, porque "Turnos"
                es una de las secciones y lleva al mismo lado. */}
            <ul className="mt-5 flex flex-col gap-3">
              {MAIN_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-cream/80 transition-colors hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---------------------------------------------------------------- */}
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-cream uppercase">
              Contacto
            </h2>

            <ul className="mt-5 flex flex-col gap-3 text-sm text-cream/80">
              {address !== null && (
                <li>
                  {mapsLink === null ? (
                    <span>
                      {address}
                      {city !== null && `, ${city}`}
                    </span>
                  ) : (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-cream"
                    >
                      {address}
                      {city !== null && `, ${city}`}
                    </a>
                  )}
                </li>
              )}

              {phoneDisplay !== null && (
                <li>
                  <a
                    href={`tel:${phoneDisplay.replace(/[^\d+]/g, '')}`}
                    className="transition-colors hover:text-cream"
                  >
                    {phoneDisplay}
                  </a>
                </li>
              )}

              {whatsappLink !== null && (
                <li>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-cream"
                  >
                    Escribir por WhatsApp
                  </a>
                </li>
              )}

              {/* El horario no lo dio ni el prompt ni la lista de precios, y el
                  prompt prohíbe inventarlo (§41). Mientras no esté cargado se
                  dice que falta, en vez de poner un horario que después alguien
                  va a creer. */}
              <li>
                {settings?.pending.hours === true ? (
                  <span className="text-cream/60">Horarios: a confirmar</span>
                ) : (
                  <Link to={PATHS.contact} className="transition-colors hover:text-cream">
                    Ver horarios de atención
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* La frase del prompt (§27), como cierre. Va con la tipografía de
            títulos porque no es un dato más del pie: es lo último que se lee y
            lo que queda. */}
        <p className="mt-14 text-center font-display text-xl text-cream/90 sm:text-2xl">
          Tu bienestar es nuestra prioridad.
        </p>

        <div className="mt-10 flex flex-col gap-3 border-t border-cream/20 pt-6 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name} {BRAND.tagline}
            {city !== null && ` · ${city}`}
          </p>
          <p>Turnos con cita previa.</p>
        </div>
      </div>
    </footer>
  );
}
