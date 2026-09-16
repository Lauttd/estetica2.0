import { cn } from '@/utils/cn';

/**
 * La ilustración botánica del inicio.
 *
 * POR QUÉ ES UN DIBUJO Y NO UNA FOTO
 *
 * §6 pide una imagen "relacionada con skincare, belleza, bienestar, naturaleza,
 * spa" y aclara dos cosas: que no se usen imágenes genéricas de mala calidad y
 * que el diseño lleve elementos botánicos similares al material de la estética.
 * Una foto de stock de una mujer con una toalla en la cabeza incumple las dos.
 * Las fotos del salón todavía no existen (§41: no se inventan, y una foto de
 * otro salón no es una foto de este), así que lo honesto es un dibujo propio: no
 * afirma nada sobre el lugar y es 100 % de la marca.
 *
 * ES UN ARCO, Y ESO TAMBIÉN VIENE DEL MATERIAL
 *
 * El arco de medio punto es la forma que más se repite en el local —los espejos,
 * el vano de la entrada— y es un motivo clásico de spa. Enmarca la rama en vez
 * de dejarla flotando, que es lo que hace que un dibujo suelto se lea como un
 * hueco sin llenar.
 *
 * Va en línea y no como archivo, igual que la rama del sitio: se colorea con
 * `currentColor`, pesa menos que una petición y no hay un SVG suelto en `public/`
 * que alguien tenga que acordarse de reemplazar cuando lleguen las fotos.
 *
 * No lleva `role="img"` ni texto alternativo porque no es contenido: es el fondo
 * de un hero cuyo texto ya dice todo. Un lector de pantalla que lo anunciara
 * estaría leyendo una decoración.
 */

/** La forma de la hoja: dos arcos que se encuentran en la punta. */
const LEAF = 'M0 0C9-8 22-6 30 0 22 6 9 8 0 0Z';

/**
 * Las hojas, puestas a mano una por una.
 *
 * No se generan en un bucle: una rama que se ve natural no tiene las hojas
 * equidistantes ni con el mismo ángulo ni del mismo tamaño, y eso es justo lo que
 * distingue un dibujo de un patrón. Se leen de un vistazo; el día que haya que
 * mover una, se mueve su número.
 *
 * `deg` es la rotación alrededor de la base de la hoja. Las de la izquierda van
 * entre 196° y 212° —que es "hacia la izquierda y para arriba"— y por eso el
 * número se ve raro: es el ángulo real, no una simetría prolija.
 *
 * La rama llega hasta bien arriba dentro del arco a propósito. Con las hojas
 * amontonadas en la mitad de abajo, el arco quedaba con una cúpula vacía enorme
 * encima y el dibujo se leía como una planta chica en un marco grande.
 */
const LEAVES: ReadonlyArray<{ x: number; y: number; deg: number; scale: number }> = [
  { x: 163, y: 352, deg: -24, scale: 1.25 },
  { x: 157, y: 328, deg: 206, scale: 1.15 },
  { x: 161, y: 304, deg: -32, scale: 1.35 },
  { x: 159, y: 280, deg: 198, scale: 1.1 },
  { x: 160, y: 256, deg: -20, scale: 1.3 },
  { x: 159, y: 232, deg: 212, scale: 1.2 },
  { x: 161, y: 208, deg: -36, scale: 1.35 },
  { x: 160, y: 184, deg: 196, scale: 1.15 },
  { x: 160, y: 160, deg: -26, scale: 1.2 },
  { x: 160, y: 138, deg: 204, scale: 1.05 },
  { x: 160, y: 118, deg: -18, scale: 0.95 },
];

/** Los frutos: tres puntos en la punta de la rama. */
const BERRIES: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: 160, y: 92, r: 3.6 },
  { x: 149, y: 104, r: 2.6 },
  { x: 171, y: 102, r: 3 },
];

interface BotanicalProps {
  className?: string;
}

/** La rama dentro del arco. Es el dibujo completo, sin el marco. */
function Branch() {
  return (
    <>
      {/* El tallo. Ondulado y no recto: la rama del material también se dobla, y
          una vertical perfecta divide el arco en dos mitades simétricas que se
          ven de regla. Las dos curvas van en espejo —los controles primero a un
          lado y después al otro— para que la ondulación sea una sola y no dos
          bombeos seguidos. */}
      <path
        d="M160 382C144 330 176 296 160 244 146 196 174 158 160 96"
        className="text-forest/55"
      />

      {LEAVES.map((leaf) => (
        <path
          key={`${leaf.x}-${leaf.y}`}
          d={LEAF}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.deg}) scale(${leaf.scale})`}
          className="text-sage/70"
        />
      ))}

      {BERRIES.map((berry) => (
        <circle
          key={`${berry.x}-${berry.y}`}
          cx={berry.x}
          cy={berry.y}
          r={berry.r}
          className="text-olive/60"
          stroke="none"
          fill="currentColor"
        />
      ))}

      {/* Dos ramitas chicas en la base, para que la rama no salga de la nada. */}
      <path d="M160 382c-16-4-27-14-31-28 15 2 26 12 31 28Z" className="text-sage/60" />
      <path d="M160 382c16-4 27-14 31-28-15 2-26 12-31 28Z" className="text-sage/60" />
    </>
  );
}

export function BotanicalArch({ className }: BotanicalProps) {
  return (
    <svg
      viewBox="0 0 320 420"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-auto w-full', className)}
      aria-hidden="true"
    >
      {/* El arco de medio punto: dos verticales y un semicírculo de radio 140
          que cierra arriba. El trazo va casi transparente —es un marco, no un
          contorno— y por eso el dibujo se lee como algo puesto detrás. */}
      <path d="M20 420V160a140 140 0 0 1 280 0v260" className="text-forest/20" />

      {/* La línea de piso, más corta que el arco. Da apoyo sin cerrar la caja. */}
      <path d="M96 384h128" className="text-forest/15" />

      <Branch />
    </svg>
  );
}
