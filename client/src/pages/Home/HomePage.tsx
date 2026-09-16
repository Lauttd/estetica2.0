import { Link } from 'react-router-dom';
import { FeaturedServices } from './FeaturedServices';
import { PageMeta } from '@/components/seo/PageMeta';
import { BotanicalArch } from '@/components/ui/Botanical';
import { Logo } from '@/components/ui/Logo';
import { ValuesSection } from '@/components/ui/ValuesSection';
import { buttonStyles } from '@/components/ui/button';
import { PATHS } from '@/routes/paths';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * La página de inicio.
 *
 * EL HERO DICE LO QUE PIDE §6, PALABRA POR PALABRA
 *
 * El título, el texto y los dos botones son los del prompt y no una versión
 * propia: "Tu bienestar es nuestra prioridad", "Cuidados para vos, por dentro y
 * por fuera.", "Reservar turno" y "Ver servicios". El nombre de la estética va
 * arriba con `<Logo />`, que es como §6 lo pide —`KAYA KALPA` sobre `ESTÉTICA
 * PROFESIONAL`— y que además es lo que hace que el día que llegue el archivo del
 * logo el hero lo muestre sin tocar nada.
 *
 * DOS COLUMNAS EN ESCRITORIO, UNA EN EL TELÉFONO
 *
 * En un monitor grande el texto queda a la izquierda y la ilustración a la
 * derecha; en el teléfono el texto va primero y la ilustración después. Ese orden
 * no es casual: el título es lo que hay que leer y lo que indexa el buscador, así
 * que no puede quedar debajo de un dibujo. En escritorio sí se puede poner al
 * costado sin correrlo de su lugar en el orden del documento.
 *
 * El título de la pestaña dice "en Formosa" y no solo el nombre de la estética:
 * es como busca la gente que todavía no la conoce, que es justamente para quien
 * sirve esta página.
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

      <section className="container-page py-16 sm:py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            {/* `lg:items-start` porque el logo se dibuja centrado —así está en la
                barra y en el pie— y en la columna de la izquierda tiene que
                arrancar contra el borde, alineado con el título de abajo. */}
            <Logo size="lg" className="lg:items-start" />

            <h1 className="mt-8 text-4xl sm:text-5xl lg:text-6xl">
              Tu bienestar es nuestra prioridad
            </h1>

            <p className="mt-6 text-lg text-ink-soft sm:text-xl">
              Cuidados para vos, por dentro y por fuera.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
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

            {/* §6 pide dos botones y ninguno más: este es un renglón de texto, no
                un tercero. Va porque la estética ya recibe consultas por
                WhatsApp y hay quien prefiere preguntar antes de reservar. */}
            {whatsappLink !== null && (
              <p className="mt-8 text-sm text-ink-soft">
                ¿Preferís consultar primero?{' '}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest underline underline-offset-4"
                >
                  Escribinos por WhatsApp
                </a>
              </p>
            )}
          </div>

          <div className="mx-auto w-full max-w-xs sm:max-w-sm lg:max-w-none">
            <BotanicalArch />
          </div>
        </div>
      </section>

      <ValuesSection />

      <FeaturedServices />
    </>
  );
}
