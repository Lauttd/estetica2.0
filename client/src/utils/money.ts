// =============================================================================
// KAYA KALPA — Dinero
// =============================================================================
// La API transporta los precios en **centavos**, como enteros, y el formateo es
// del cliente. Es al revés de lo que uno esperaría, y es a propósito: un precio
// en pesos con decimales es un número de punto flotante, y los flotantes no
// representan exactamente cosas como 0,10. Multiplicar y sumar esos errores
// termina en un total que no cierra por un centavo, y explicarle eso a alguien
// que está mirando la cuenta es imposible.
//
// Acá están las dos traducciones: lo que la persona escribe en un campo de texto
// hacia centavos, y los centavos hacia lo que se muestra en pantalla.
// =============================================================================

/**
 * Arma el formateador una vez por combinación y lo reutiliza.
 *
 * `Intl.NumberFormat` es caro de construir —carga datos de locale— y el catálogo
 * dibuja treinta precios de una sola vez. Sin esto, cada tarjeta pagaría esa
 * construcción y se nota al filtrar.
 */
const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, withCents: boolean): Intl.NumberFormat | null {
  const key = `${currency}|${withCents}`;

  const cached = formatters.get(key);
  if (cached !== undefined) return cached;

  try {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: withCents ? 2 : 0,
      maximumFractionDigits: withCents ? 2 : 0,
    });
    formatters.set(key, formatter);
    return formatter;
  } catch {
    // `Intl` lanza si el código de moneda no es un ISO 4217 válido, y el valor
    // viene de la base. No se cachea el fallo: si alguien corrige la moneda
    // desde el panel, la próxima llamada tiene que volver a intentar.
    return null;
  }
}

/**
 * La moneda del sitio, para cuando la respuesta no la trae.
 *
 * Existe por un hueco real del contrato: el catálogo manda la moneda de cada
 * servicio, pero la respuesta de un turno guarda el precio sin ella —el turno
 * copia nombre, precio y duración, y la moneda quedó afuera de esa copia—. La
 * pantalla que se abre con un código, sin pasar por el catálogo, no tiene de dónde
 * sacarla.
 *
 * Es un valor **del esquema**, no inventado acá: `Service.currency` tiene
 * `@default("ARS")` en la base y ninguna pantalla del panel permite cambiarlo, así
 * que hoy hay una sola moneda en todo el sistema. El día que la estética cobre en
 * otra, esto es exactamente lo que hay que sacar: lo correcto es que el turno
 * devuelva su moneda, y está anotado como deuda en `CONFLICTOS.md`.
 */
export const DEFAULT_CURRENCY = 'ARS';

/**
 * Centavos a texto: `2800000` → `"$ 28.000"`.
 *
 * Los centavos se muestran solo cuando existen. Un catálogo de estética tiene
 * precios redondos, y `"$ 28.000,00"` en cada tarjeta es ruido que no aporta
 * nada; si algún precio sí lleva centavos, se muestran.
 */
export function formatCents(cents: number, currency: string): string {
  const withCents = cents % 100 !== 0;
  const formatter = getFormatter(currency, withCents);

  if (formatter === null) {
    // Sin formateador válido se cae a algo que igual se entiende. Es preferible
    // a no mostrar nada: el precio es lo que la persona vino a ver.
    return `${currency} ${(cents / 100).toFixed(withCents ? 2 : 0)}`;
  }

  return formatter.format(cents / 100);
}

/**
 * Un precio tal como se muestra en el catálogo, con el caso "a consultar".
 *
 * El texto vive acá y no en cada componente para que diga lo mismo en la
 * tarjeta, en el modal, en la ficha y en el asistente de turnos. `null` significa
 * que la estética todavía no cargó el precio (§41 prohíbe inventarlo) y **no** es
 * lo mismo que `0`, que sería "bonificado".
 */
export function formatPrice(
  cents: number | null,
  currency: string,
  onRequest = 'Precio a consultar',
): string {
  return cents === null ? onRequest : formatCents(cents, currency);
}

/**
 * La suma de los precios que se conocen, o `null` si no hay ninguno.
 *
 * ESTE `null` NO ES UN DETALLE
 *
 * Un turno con dos servicios "a consultar" y ninguno con precio no cuesta cero
 * pesos: cuesta lo que la estética diga cuando lo vea. Devolver `0` en ese caso
 * haría que la pantalla mostrara "$ 0", y en este sistema el cero **sí** significa
 * algo —un servicio bonificado—, así que se estaría afirmando un precio que nadie
 * puso (§41).
 *
 * Cuando hay aunque sea uno con precio, la suma de esos es la respuesta honesta; el
 * "a consultar" que falta lo agrega quien muestra el número, que es el único que
 * sabe si corresponde aclararlo.
 */
export function sumKnownPrices(prices: Array<number | null>): number | null {
  const known = prices.filter((price): price is number => price !== null);
  if (known.length === 0) return null;

  return known.reduce((total, price) => total + price, 0);
}

/**
 * Lo que alguien escribe en un campo de precio, a centavos.
 *
 * Acepta las dos formas en que la gente escribe un precio acá: `28000` y
 * `28.000`. El separador decimal es la **última** coma o punto, y solo si le
 * siguen una o dos cifras; si le siguen tres, es un separador de miles. Es la
 * regla que hace que `28.000` sean veintiocho mil pesos y no veintiocho con cero
 * centavos, que es el error que arruinaría todos los precios del catálogo de una
 * sola pasada por el panel.
 *
 * Devuelve `null` cuando el campo está vacío o no se entiende, y ese `null` es el
 * que el panel manda como "a consultar": es la representación que la API ya usa
 * para lo que falta.
 */
export function parsePesosToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (cleaned.length === 0) return null;

  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const decimals = lastSeparator === -1 ? '' : cleaned.slice(lastSeparator + 1);

  // Un separador seguido de una o dos cifras es decimal; de tres, es de miles.
  // `cleaned` sin el separador decimal es entonces solo dígitos y separadores de
  // miles, que se sacan todos juntos.
  const isDecimal = lastSeparator !== -1 && /^\d{1,2}$/.test(decimals);
  const digits =
    lastSeparator === -1 || !isDecimal
      ? cleaned.replace(/[.,]/g, '')
      : `${cleaned.slice(0, lastSeparator).replace(/[.,]/g, '')}.${decimals}`;

  const pesos = Number(digits);
  if (!Number.isFinite(pesos)) return null;

  // Se redondea en vez de truncar: `28,999` tiene que dar 2900 centavos, no 2899.
  return Math.round(pesos * 100);
}

/**
 * Centavos a lo que se escribe en un campo de edición: `2800000` → `"28000"`.
 *
 * Sin separador de miles y sin símbolo: es el valor de un `<input>`, y meterle
 * `"$ 28.000"` haría que al primer tecleo el campo se pelee con lo que la persona
 * está escribiendo.
 */
export function centsToPesosInput(cents: number | null): string {
  if (cents === null) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
