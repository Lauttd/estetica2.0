import type { ReactNode } from 'react';
import { SprigDivider } from '@/components/ui/Sprig';

/**
 * Los cinco valores de §7, que son los mismos que §23 le pide transmitir a la
 * página institucional.
 *
 * Está acá y no dentro de `pages/` porque lo usan dos páginas: el inicio y
 * "Nosotros". Son el mismo bloque con el mismo texto, y tener dos copias sería
 * garantizar que un día digan cosas distintas.
 *
 * POR QUÉ CADA UNO LLEVA UNA LÍNEA Y NO SOLO LA PALABRA
 *
 * "BIENESTAR" y "CALIDAD" solos no dicen nada: cualquier estética puede
 * escribirlos. Lo que los vuelve legibles es la frase de abajo, y esas frases
 * están escritas como **compromisos** ("le damos a cada turno el tiempo que
 * necesita") y no como datos ("+10 años de experiencia", "más de 500 clientas").
 * §41 prohíbe inventar datos, y una trayectoria inventada es un dato inventado
 * aunque no sea un precio ni un horario.
 *
 * LOS ICONOS SON CÍRCULOS, COMO PIDE §7
 *
 * El círculo es un `<span>` con un borde redondeado y no parte del dibujo. La
 * razón es práctica: así el mismo icono se puede poner en un círculo más grande o
 * más chico sin tocar un solo `path`, y el trazo del aro queda con el mismo
 * grosor que el borde de las tarjetas en vez de con el grosor de un dibujo
 * escalado. Los motivos de adentro están dibujados a línea, con la misma caja de
 * 24 y el mismo `strokeWidth` que los iconos de las categorías, que es lo que
 * hace que las dos cosas se lean como del mismo sitio.
 */

interface Value {
  /** El nombre, tal como lo escribe §7. Va en mayúsculas por CSS, no acá. */
  name: string;
  /** Qué significa en esta estética. Un compromiso, nunca una cifra. */
  description: string;
  icon: ReactNode;
}

const VALUES: readonly Value[] = [
  {
    name: 'Profesionalismo',
    description: 'Cada tratamiento se hace con criterio y con protocolo, no con apuro.',
    icon: (
      <>
        {/* El sello: la marca de lo que está hecho como corresponde. */}
        <circle cx="12" cy="9.2" r="5.2" />
        <path d="M8.9 13.4 7.6 21l4.4-2.3 4.4 2.3-1.3-7.6" />
      </>
    ),
  },
  {
    name: 'Calidad',
    description: 'Elegimos productos y técnicas que estén a la altura de tu piel.',
    icon: (
      <>
        {/* La gema: lo que se elige por encima del resto. */}
        <path d="M12 3.6 20.4 9.6 12 20.4 3.6 9.6Z" />
        <path d="M3.6 9.6h16.8" />
        <path d="M12 3.6 8.6 9.6l3.4 10.8M12 3.6l3.4 6-3.4 10.8" />
      </>
    ),
  },
  {
    name: 'Bienestar',
    description: 'Un rato para vos: el turno es tuyo y lo cuidamos de principio a fin.',
    icon: (
      <>
        {/* La flor vista desde arriba. Acá sí van en un bucle y no a mano: una
            flor de cinco pétalos es simétrica por definición, y poner los
            ángulos uno por uno sería escribir a mano la tabla del 72. */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M12 11.4Q14.1 8.4 12 5.4 9.9 8.4 12 11.4Z"
            transform={`rotate(${angle} 12 12)`}
          />
        ))}
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    name: 'Resultados',
    description: 'Buscamos que se note, y te decimos cómo sostenerlo en casa.',
    icon: (
      <>
        {/* La línea que sube: el resultado medido en el tiempo. */}
        <path d="M4 18.6 9.4 12.2l3.9 3.4L20 6.6" />
        <path d="M14.8 6.6H20v5.2" />
      </>
    ),
  },
  {
    name: 'Dedicación',
    description: 'Le damos a cada turno el tiempo que el tratamiento necesita.',
    icon: (
      <>
        {/* El reloj de arena: el tiempo puesto en el trabajo. */}
        <path d="M7 3.6h10M7 20.4h10" />
        <path d="M8.2 3.6c0 3.6 3.8 5.6 3.8 8.4s-3.8 4.8-3.8 8.4" />
        <path d="M15.8 3.6c0 3.6-3.8 5.6-3.8 8.4s3.8 4.8 3.8 8.4" />
      </>
    ),
  },
];

export function ValuesSection() {
  return (
    <section className="container-page py-16 sm:py-20" aria-labelledby="valores">
      <h2 id="valores" className="text-center text-3xl sm:text-4xl">
        Nuestros valores
      </h2>

      <SprigDivider className="mt-6" />

      <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
        {/* Son cinco, así que en dos columnas la última fila queda con uno solo:
            ese se estira a lo ancho para quedar centrado bajo los otros dos. Sin
            esto, el quinto valor aparece corrido a la izquierda y se lee como si
            faltara el sexto. */}
        {VALUES.map((value) => (
          <li
            key={value.name}
            className="flex flex-col items-center text-center last:col-span-2 sm:last:col-span-1"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-forest/20 bg-forest/5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-9 w-9 text-forest"
                /* Decorativo: el valor está escrito justo abajo. */
                aria-hidden="true"
              >
                {value.icon}
              </svg>
            </span>

            <h3 className="mt-5 font-sans text-sm font-semibold tracking-[0.18em] uppercase">
              {value.name}
            </h3>

            <p className="mt-3 max-w-[26ch] text-sm text-ink-soft">{value.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
