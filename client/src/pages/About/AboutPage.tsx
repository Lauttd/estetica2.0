import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { SprigDivider } from '@/components/ui/Sprig';
import { ValuesSection } from '@/components/ui/ValuesSection';
import { buttonStyles } from '@/components/ui/button';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { PATHS } from '@/routes/paths';
import { buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * Nosotros (§23).
 *
 * QUÉ SE PUEDE DECIR Y QUÉ NO
 *
 * §41 prohíbe inventar datos, y una página institucional es donde más fácil se
 * incumple: "más de diez años de experiencia", "un equipo de profesionales
 * certificadas", "productos de primeras marcas". Nada de eso lo dijo la estética.
 * Los profesionales que hay cargados en la base se llaman literalmente
 * "Profesional 1" y "Profesional 2": son lugares del sistema de turnos, no
 * personas.
 *
 * Así que el texto se apoya en lo que sí es cierto y verificable: qué se hace
 * —los tratamientos que están en el catálogo—, cómo se atiende —con turno, que es
 * lo que hace el sistema de reservas— y dónde queda. Nada más. El resto del peso
 * lo llevan los cinco valores, que están escritos como compromisos y no como
 * currículum.
 *
 * LAS IMÁGENES DEL SALÓN TODAVÍA NO ESTÁN
 *
 * §23 las pide. No existen, y una foto de otro salón no es una foto de este: sería
 * la misma mentira que un horario inventado. Van dos ilustraciones de la marca con
 * el aviso de que son de referencia, que es como se resolvió también en la galería.
 */
export function AboutPage() {
  const { data: settings } = useSiteSettings();

  const city = settings?.location.city ?? 'Formosa';
  const address = settings?.location.address ?? null;

  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  return (
    <>
      <PageMeta
        title="Nosotros"
        description={`Conocé KAYA KALPA, la estética profesional en ${city}: cómo trabajamos y qué podés esperar de cada visita.`}
      />

      <div className="container-page">
        <PageHeader
          title="Nosotros"
          subtitle="Un espacio pensado para que cada visita sea un rato para vos."
        />

        {/* ------------------------------------------------------------------ */}
        <section className="grid items-center gap-12 pb-4 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5 text-base text-ink-soft">
            <p>
              Somos una estética profesional en {city}. Hacemos tratamientos
              faciales y corporales, y también trabajamos manos, pies, pestañas y
              cejas.
            </p>

            <p>
              Atendemos con turno previo, y el turno se reserva desde acá: elegís el
              tratamiento, el día y la hora, y te queda confirmado con un código
              para consultarlo o cancelarlo cuando quieras.
            </p>

            {address !== null && (
              <p>
                Estamos en {address}, {city}.{' '}
                <Link
                  to={PATHS.contact}
                  className="font-medium text-forest underline underline-offset-4"
                >
                  Ver cómo llegar
                </Link>
                .
              </p>
            )}

            {whatsappLink !== null && (
              <p>
                Si tenés una duda antes de reservar,{' '}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest underline underline-offset-4"
                >
                  escribinos por WhatsApp
                </a>{' '}
                y te respondemos.
              </p>
            )}
          </div>

          {/* Las dos ilustraciones en un par y no en una sola: una imagen suelta
              ocupa el ancho entero de su columna y se lee como un cartel. */}
          <figure className="grid grid-cols-2 gap-4">
            <img
              src="/images/gallery/placeholder-2.svg"
              alt="Ilustración botánica de referencia"
              width={800}
              height={1000}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-card border border-beige object-cover"
            />

            <img
              src="/images/gallery/placeholder-3.svg"
              alt="Ilustración botánica de referencia"
              width={800}
              height={1000}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-card border border-beige object-cover"
            />

            <figcaption className="col-span-2 text-xs text-ink-soft">
              Ilustraciones de referencia. Las fotos del salón y de los trabajos se
              publican cuando la estética las entregue; mientras tanto podés ver la{' '}
              <Link to={PATHS.gallery} className="underline underline-offset-4">
                galería
              </Link>
              .
            </figcaption>
          </figure>
        </section>
      </div>

      <ValuesSection />

      {/* -------------------------------------------------------------------- */}
      <section className="container-page pb-20 text-center" aria-labelledby="cierre">
        <SprigDivider />

        <h2 id="cierre" className="mt-8 text-3xl sm:text-4xl">
          Tu bienestar es nuestra prioridad
        </h2>

        <p className="mx-auto mt-5 max-w-2xl font-display text-xl text-ink-soft sm:text-2xl">
          Cuidamos de ti, por dentro y por fuera.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={PATHS.booking}
            className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}
          >
            Reservar turno
          </Link>

          <Link
            to={PATHS.services}
            className={buttonStyles({
              variant: 'outline',
              size: 'lg',
              className: 'w-full sm:w-auto',
            })}
          >
            Ver servicios
          </Link>
        </div>
      </section>
    </>
  );
}
