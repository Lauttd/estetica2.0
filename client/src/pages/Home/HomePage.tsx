import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { buttonStyles } from '@/components/ui/button';
import { SprigDivider } from '@/components/ui/Sprig';
import { PATHS } from '@/routes/paths';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * La página de inicio.
 *
 * Por ahora tiene el hero y los dos llamados principales. La grilla de servicios
 * destacados, los cinco valores y el resto de las secciones se arman en la fase
 * del catálogo, cuando los servicios ya se puedan pedir a la API.
 *
 * El título dice "en Formosa" y no solo el nombre de la estética: es como busca
 * la gente que no la conoce todavía, que es justamente para quien sirve esta
 * página.
 */
export function HomePage() {
  const { data: settings } = useSiteSettings();

  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  const city = settings?.location.city ?? 'Formosa';

  return (
    <>
      <PageMeta
        title={`Estética profesional en ${city}`}
        description={`Tratamientos faciales y corporales, manos, pies, pestañas y cejas en ${city}. Reservá tu turno online en KAYA KALPA Estética Profesional.`}
      />

      <section className="container-page py-20 text-center sm:py-28">
        <p className="text-xs font-medium tracking-[0.3em] text-olive uppercase">
          {settings?.salon.tagline ?? 'Estética profesional'}
        </p>

        <h1 className="mt-6 text-4xl font-semibold sm:text-5xl lg:text-6xl">
          Tu momento de cuidado
        </h1>

        <SprigDivider className="mt-8" />

        <p className="mx-auto mt-8 max-w-xl text-base text-ink-soft sm:text-lg">
          Trabajamos con turno para dedicarle a cada persona el tiempo que
          necesita. Elegí tus servicios y reservá el horario que te quede mejor.
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
            Ver servicios y precios
          </Link>
        </div>

        {whatsappLink !== null && (
          <p className="mt-8 text-sm text-ink-soft">
            ¿Preferís consultar primero?{' '}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest font-medium underline underline-offset-4"
            >
              Escribinos por WhatsApp
            </a>
          </p>
        )}
      </section>
    </>
  );
}
