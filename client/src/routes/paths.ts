// =============================================================================
// KAYA KALPA — Las direcciones del sitio
// =============================================================================
// Acá viven las URLs que usan los enlaces. `router.tsx` las toma de este archivo
// para declarar sus rutas, así que escribir una dirección suelta en un `<Link>`
// es la forma más fácil de que un día quede distinta del resto y el enlace lleve
// a un 404 que nadie prueba hasta que lo reporta un cliente.
//
// Las URLs son en castellano y descriptivas (§37) porque son parte del SEO: la
// página de un servicio se llama `/servicios/maderoterapia` y no `/service/12`.
// =============================================================================

/**
 * Los pasos del asistente de turnos.
 *
 * El nombre de cada uno es a la vez la clave con la que se lo nombra en el código
 * y el segmento que va en la URL: `services` → `/turnos/servicios`. Tener las dos
 * cosas en el mismo lugar es lo que evita que un día el paso se llame `date` en el
 * código y `fecha` en la dirección, que es el tipo de desajuste que solo se
 * descubre cuando alguien comparte un enlace que no lleva a ninguna parte.
 *
 * El orden de este objeto es el orden del asistente, y de ahí sale la lista de
 * pasos que dibuja el indicador de progreso.
 */
const BOOKING_STEP = {
  services: 'servicios',
  professional: 'profesional',
  date: 'fecha',
  slot: 'horario',
  details: 'datos',
  summary: 'resumen',
} as const;

export type BookingStepKey = keyof typeof BOOKING_STEP;

/** La raíz del asistente. Los pasos cuelgan de acá. */
const BOOKING = '/turnos';

/**
 * Las pantallas del turno que **no** son pasos: la confirmación y la consulta.
 *
 * Están separadas de `BOOKING_STEP` porque no son parte del recorrido —la primera
 * se ve después de reservar y la segunda se visita días más tarde, sin haber pasado
 * por el asistente— y porque el indicador de progreso se arma recorriendo los pasos,
 * así que mezclarlas ahí agregaría dos pantallas que nadie recorre en orden.
 *
 * Se declaran como segmentos, igual que los pasos, para que el router pueda
 * anidarlas sin volver a escribir la palabra acá y en `routes.tsx`.
 */
const BOOKING_PAGE = {
  confirmed: 'confirmado',
  lookup: 'consulta',
} as const;

export const PATHS = {
  home: '/',

  services: '/servicios',
  /**
   * El detalle de un servicio usa el **slug**, no el id.
   *
   * Un id en la URL no le dice nada a nadie —ni a quien la lee ni a un buscador—
   * y el slug sí: `/servicios/drenaje-linfatico-manual`. Además queda estable:
   * si el servicio se renombra, el slug se regenera y la URL vieja se rompe, así
   * que conviene que el slug sea un dato curado del servicio y no algo que se
   * recalcule solo.
   *
   * El `:slug` del router no se declara acá porque un parámetro de ruta no es una
   * dirección, y `router.tsx` lo agrega al armar el patrón.
   */
  serviceDetail: (slug: string) => `/servicios/${slug}`,

  /**
   * El asistente de turnos.
   *
   * `bookingStep` son los segmentos, para declarar las rutas hijas en el router;
   * `bookingStepPath` es la dirección completa, para los enlaces. Se usan los dos
   * porque el router necesita el segmento relativo —`servicios`, no
   * `/turnos/servicios`, que anidado quedaría como `/turnos/turnos/servicios`— y
   * un `<Link>` necesita la dirección entera.
   */
  booking: BOOKING,
  bookingStep: BOOKING_STEP,
  bookingStepPath: (step: BookingStepKey) => `${BOOKING}/${BOOKING_STEP[step]}`,
  bookingPage: BOOKING_PAGE,

  /**
   * La confirmación, con el código del turno adentro.
   *
   * Fuera del asistente a propósito: quien llega acá ya reservó, y volver a
   * mostrarle el indicador de pasos le haría pensar que todavía le falta algo.
   */
  bookingConfirmed: (code: string) => `${BOOKING}/${BOOKING_PAGE.confirmed}/${code}`,

  /**
   * Consultar o cancelar un turno con el código.
   *
   * Existe porque el código es lo único que queda si se cierra la pestaña: sin
   * esta pantalla, un turno reservado desde un teléfono sin correo no se podría
   * dar de baja nunca más.
   */
  bookingLookup: `${BOOKING}/${BOOKING_PAGE.lookup}`,

  about: '/nosotros',
  contact: '/contacto',
  gallery: '/galeria',
  faq: '/faq',

  admin: '/admin',
} as const;
