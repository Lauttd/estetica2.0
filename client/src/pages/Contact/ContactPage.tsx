import type { ReactNode } from 'react';
import { ContactForm } from '@/components/forms/ContactForm';
import { ContactMap } from '@/components/contact/ContactMap';
import { OpeningHours } from '@/components/contact/OpeningHours';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { buildMapsLink, buildWhatsAppLink } from '@/utils/whatsapp';

/**
 * Contacto: cómo llegar, cómo escribir y el formulario.
 *
 * TODO LO QUE SE MUESTRA SALE DE LA CONFIGURACIÓN
 *
 * La dirección, el teléfono, el WhatsApp y las redes no están escritos en este
 * archivo: viven en la base y la estética los cambia desde el panel. Si un dato
 * falta, **no se dibuja la fila** en lugar de mostrarse vacía o inventada (§41) —
 * salvo el horario, que sí tiene un aviso propio porque es lo único que la estética
 * todavía no confirmó y hay que decirlo.
 *
 * LA PÁGINA ESTÁ ARMADA EN DOS COLUMNAS
 *
 * A la izquierda los datos y a la derecha el formulario, que es el orden del §24.
 * El mapa va con los datos y no con el formulario: "cómo llegar" es lo mismo que la
 * dirección dicha de otra forma, y separarlos dejaría media pantalla vacía de un
 * lado —el formulario es mucho más alto que cuatro renglones de datos—.
 *
 * En un teléfono quedan uno debajo del otro, y ahí el orden sigue importando por
 * otro motivo: lo primero que aparece es la dirección y el botón de WhatsApp, que
 * resuelven el caso de quien entra con el celular en la mano y quiere escribir
 * ahora. El formulario, que pide tipear, queda después.
 */
export function ContactPage() {
  const { data: settings } = useSiteSettings();
  const city = settings?.location.city ?? 'Formosa';

  const address = settings?.location.address ?? null;
  const phoneDisplay = settings?.contact.phoneDisplay ?? null;
  const mapsLink = buildMapsLink(settings?.location.mapsQuery ?? null);
  const whatsappLink = buildWhatsAppLink(
    settings?.contact.whatsappNumber ?? null,
    settings?.contact.whatsappMessage ?? null,
  );

  /**
   * Las redes sociales, con lo que haya.
   *
   * Se confirmaron los nombres de las cuentas pero no las direcciones, así que hay
   * dos casos y son distintos: con URL es un enlace, y sin URL es el nombre de la
   * cuenta escrito —que sirve para buscarla— en vez de un ícono que no lleva a
   * ningún lado. Una fila sin nombre ni URL no se dibuja.
   */
  const socials = [
    {
      label: 'Instagram',
      name: settings?.social.instagramName ?? null,
      url: settings?.social.instagramUrl ?? null,
    },
    {
      label: 'Facebook',
      name: settings?.social.facebookName ?? null,
      url: settings?.social.facebookUrl ?? null,
    },
  ].filter((social) => social.url !== null || social.name !== null);

  const hasUnlinkedSocial = socials.some((social) => social.url === null);

  return (
    <>
      <PageMeta
        title="Contacto"
        description={`Dirección, teléfono y WhatsApp de KAYA KALPA en ${city}. Escribinos para consultar por un tratamiento o reservar tu turno.`}
      />

      <div className="container-page">
        <PageHeader
          title="Contacto"
          subtitle="Escribinos o acercate. Te respondemos a la brevedad."
        />

        <div className="grid gap-12 pb-20 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-10">
            <section aria-labelledby="datos">
              <h2 id="datos" className="font-display text-xl text-deep">
                Dónde estamos
              </h2>

              <dl className="mt-4 space-y-5">
                {(address !== null || mapsLink !== null) && (
                  <Item label="Dirección">
                    {mapsLink === null ? (
                      <span>
                        {address}, {city}
                      </span>
                    ) : (
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 transition-colors hover:text-forest"
                      >
                        {address ?? city}
                      </a>
                    )}
                  </Item>
                )}

                {phoneDisplay !== null && (
                  <Item label="Teléfono">
                    <a
                      href={`tel:${phoneDisplay.replace(/[^\d+]/g, '')}`}
                      className="underline underline-offset-4 transition-colors hover:text-forest"
                    >
                      {phoneDisplay}
                    </a>
                  </Item>
                )}

                {whatsappLink !== null && (
                  <Item label="WhatsApp">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles()}
                    >
                      Escribir por WhatsApp
                    </a>
                  </Item>
                )}

                {socials.length > 0 && (
                  <Item label="Redes sociales">
                    <ul className="space-y-1">
                      {socials.map((social) => (
                        <li key={social.label}>
                          {social.url === null ? (
                            <span className="text-ink-soft">
                              {social.label}: <span className="text-ink">{social.name}</span>
                            </span>
                          ) : (
                            <a
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline underline-offset-4 transition-colors hover:text-forest"
                            >
                              {social.name ?? social.label}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Sin URL, el nombre igual sirve —se busca por él— pero hay
                        que decir por qué no se puede tocar. Si no, parece que el
                        enlace está roto. */}
                    {hasUnlinkedSocial && (
                      <p className="mt-2 text-xs text-ink-soft">
                        Todavía no tenemos el enlace directo: buscá la cuenta por su
                        nombre.
                      </p>
                    )}
                  </Item>
                )}
              </dl>
            </section>

            <OpeningHours />

            <ContactMap />
          </div>

          <div>
            <section aria-labelledby="escribinos">
              <h2 id="escribinos" className="font-display text-xl text-deep">
                Escribinos
              </h2>

              <p className="mt-2 mb-6 text-sm text-ink-soft">
                Dejanos tu consulta y te respondemos por correo o por WhatsApp, como
                prefieras.
              </p>

              <ContactForm />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

/** Una fila de datos: el rótulo arriba y el dato abajo. */
function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.18em] text-ink-soft uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-base text-ink">{children}</dd>
    </div>
  );
}
