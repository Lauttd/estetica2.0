// =============================================================================
// KAYA KALPA — Identidad de marca
// =============================================================================
// Lo que NO va acá: el teléfono, la dirección, el WhatsApp y las redes. Esos son
// datos que la estética cambia y viven en la base, editables desde el panel. Si
// estuvieran también en el código habría dos fuentes de verdad y la del código
// ganaría sin que nadie entienda por qué.
//
// Acá va solo lo que es identidad visual y no cambia nunca.
// =============================================================================

export const BRAND = {
  /** El prompt prohíbe cambiarlo (§41). */
  name: 'KAYA KALPA',
  tagline: 'ESTÉTICA PROFESIONAL',

  /**
   * El logo real todavía no está.
   *
   * Mientras valga `null`, el componente `<Logo />` dibuja el nombre con la
   * tipografía del sitio. Cuando el usuario entregue el archivo, se deja en
   * `src/assets/logo/`, se importa acá y se asigna:
   *
   *   import logoUrl from '@/assets/logo/logo.svg';
   *   logoUrl: logoUrl as string | null,
   *
   * Es el único cambio: no hay que tocar ningún componente. El `as` está porque
   * mientras el archivo no exista, el import no compila.
   */
  logoUrl: null as string | null,

  /**
   * Texto alternativo del logo.
   *
   * No es "logo": quien usa un lector de pantalla necesita saber qué dice la
   * imagen, y si la imagen es el nombre del negocio, el texto es el nombre.
   */
  logoAlt: 'KAYA KALPA, estética profesional',
} as const;
