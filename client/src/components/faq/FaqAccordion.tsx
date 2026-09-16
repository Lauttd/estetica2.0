import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { cn } from '@/utils/cn';
import type { FaqItem } from '@/types/faq';

interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

/**
 * Un grupo de preguntas, con acordeones.
 *
 * ARRANCA TODO CERRADO
 *
 * §9 pide que la información extensa esté reducida al principio y que no haya
 * bloques enormes de texto. Siete respuestas abiertas son dos pantallas y media
 * de teléfono que hay que atravesar para llegar al pie; cerradas, la lista entera
 * entra de un vistazo y se lee como un índice, que es lo que alguien busca cuando
 * entra a esta página.
 *
 * QUE SE ABRA SOLO NO ES UN DETALLE
 *
 * El botón vive dentro de un `<h3>` y no suelto: así un lector de pantalla puede
 * recorrer la lista por encabezados —que es como se hojea un documento— en vez de
 * tener que escuchar las siete preguntas y sus siete botones. El acordeón y el
 * encabezado son la misma pieza y se separan cuando se separan.
 */
export function FaqAccordion({ items, className }: FaqAccordionProps) {
  return (
    <div
      className={cn(
        'divide-y divide-beige overflow-hidden rounded-card border border-beige bg-ivory',
        className,
      )}
    >
      {items.map((item) => (
        <Disclosure key={item.id} as="div" className="px-5 sm:px-6">
          {({ open }) => (
            <>
              <h3 className="m-0">
                <DisclosureButton className="flex w-full items-center justify-between gap-4 py-5 text-left">
                  <span className="font-display text-lg leading-snug text-deep">
                    {item.question}
                  </span>

                  {/* La flecha gira en vez de cambiar de ícono: el movimiento
                      dice qué está pasando mejor que dos dibujos distintos. */}
                  <Chevron
                    className={cn(
                      'h-5 w-5 shrink-0 text-sage transition-transform duration-200',
                      open && 'rotate-180',
                    )}
                  />
                </DisclosureButton>
              </h3>

              <DisclosurePanel
                transition
                className="origin-top pb-5 transition duration-200 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0"
              >
                {/* `whitespace-pre-line` porque las respuestas se cargan desde el
                    panel y alguien puede querer separar en párrafos con un salto
                    de línea. Sin esto, el salto se colapsa y el texto sale todo
                    pegado. */}
                <p className="max-w-prose text-ink-soft whitespace-pre-line">
                  {item.answer}
                </p>
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      /* El estado abierto/cerrado ya lo anuncia el botón, que lleva
         `aria-expanded`: repetirlo acá sería decirlo dos veces. */
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
