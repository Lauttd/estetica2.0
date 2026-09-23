import type { ReactNode } from 'react';
import type { ServiceDetail } from '@/types/service';

interface ServiceDetailBodyProps {
  service: ServiceDetail;
  /** Los botones de acción. Van al final del cuerpo en las dos presentaciones. */
  actions?: ReactNode;
}

/**
 * El cuerpo de la ficha de un servicio.
 *
 * Lo comparten el modal del catálogo y la página `/servicios/:slug`, que muestran
 * exactamente lo mismo: descripción, beneficios, recomendaciones, duración y
 * profesionales. Si cada uno armara su propia versión, el día que la estética
 * agregue un campo habría que acordarse de los dos lugares, y el que se olvide va
 * a ser el que nadie mira hasta que alguien lo note desde el teléfono.
 *
 * Lo que **no** entra acá es el encabezado —imagen, categoría, nombre, precio—:
 * el modal lo dibuja más compacto y la página más grande, y esa diferencia sí es
 * real.
 */
export function ServiceDetailBody({ service, actions }: ServiceDetailBodyProps) {
  /**
   * Si la ficha quedó sin nada que contar.
   *
   * Es el caso de los servicios que la estética cargó solo con el nombre y el
   * precio: existen y se pueden reservar, pero la ficha no tiene más que eso.
   */
  const isEmpty =
    service.description === null &&
    service.benefits.length === 0 &&
    service.recommendations === null &&
    service.extraInfo === null;

  return (
    <div className="space-y-8">
      {service.description !== null && (
        <p className="text-base leading-relaxed text-ink">{service.description}</p>
      )}

      {service.benefits.length > 0 && (
        <Section title="Beneficios">
          <ul className="space-y-2">
            {service.benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-sm text-ink">
                <Bullet />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {service.recommendations !== null && (
        <Section title="Recomendaciones">
          <p className="text-sm leading-relaxed text-ink">
            {service.recommendations}
          </p>
        </Section>
      )}

      {service.extraInfo !== null && (
        <Section title="Información adicional">
          <p className="text-sm leading-relaxed text-ink">{service.extraInfo}</p>
        </Section>
      )}

      {service.professionals.length > 0 && (
        <Section title="Lo realiza">
          <p className="text-sm text-ink">
            {service.professionals.map((person) => person.name).join(' · ')}
          </p>
        </Section>
      )}

      {/*
        Cuando la estética todavía no cargó la descripción larga, los beneficios ni
        las recomendaciones, no se deja el hueco: se dice que falta. Un espacio en
        blanco se lee como un error del sitio, y §41 prohíbe rellenarlo con texto
        inventado.
      */}
      {isEmpty && (
        <p className="rounded-soft bg-beige/50 px-4 py-3 text-sm text-ink-soft">
          La descripción completa de este tratamiento todavía no está cargada.
          Escribinos y te contamos todo.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-4 border-t border-beige pt-6">
        {service.subgroup !== null && (
          <div>
            <dt className="text-xs tracking-wider text-olive uppercase">Grupo</dt>
            <dd className="mt-1 text-sm text-ink">{service.subgroup}</dd>
          </div>
        )}
      </dl>

      {actions !== undefined && <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-lg">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** La hoja de la rama, como viñeta. Es el mismo motivo del resto del sitio. */
function Bullet() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      className="mt-0.5 h-4 w-4 shrink-0 text-sage"
      aria-hidden="true"
    >
      <path d="M5 19C5 11 11 5 19 5 19 13 13 19 5 19Z" />
    </svg>
  );
}
