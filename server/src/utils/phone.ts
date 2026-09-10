// =============================================================================
// KAYA KALPA — Teléfonos
// =============================================================================
// El mismo cliente puede escribir su número de varias formas: "3705-194299",
// "+54 9 3705 194299", "03705 15 194299". Si se guardan tal cual, la columna
// `phone` —que es única— termina con tres fichas de la misma persona y el
// historial de turnos repartido entre ellas.
//
// Por eso todo teléfono se normaliza ANTES de buscar o guardar, a una sola forma:
//
//     54 9 <código de área> <número>     ->     '5493705194299'
//
// Sin "+" ni separadores, igual que el WhatsApp de la estética en la
// configuración. Que el sistema use una sola forma es lo que hace que el "ya sos
// cliente" funcione.
// =============================================================================

/** Un teléfono ya normalizado: `549` + 10 dígitos. */
export type NormalizedPhone = string;

const AR_PREFIX = '54';
const MOBILE_PREFIX = '9';
/** Código de país + 9 + área + número. */
const NORMALIZED_LENGTH = 13;
/** Área + número, sin código de país. */
const NATIONAL_LENGTH = 10;

/**
 * Normaliza un teléfono argentino. Devuelve `null` si no se puede interpretar.
 *
 * Devolver `null` en vez de un texto cualquiera es deliberado: quien llama tiene
 * que decidir qué hacer (rechazar el turno con un mensaje claro), y no queda la
 * duda de si el valor guardado sirve para llamar al cliente.
 *
 * ALCANCE: se contempla el caso de código de área de 4 dígitos, que es el de
 * Formosa (3705) y el de casi todo el interior del país. En Buenos Aires el área
 * tiene 2 o 3 dígitos y el "15" va en otra posición; esos números hay que
 * cargarlos ya en formato internacional, y si no se reconoce el número el mensaje
 * de error lo dice con un ejemplo.
 */
export function normalizePhone(raw: string): NormalizedPhone | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;

  // Ya viene con código de país.
  if (digits.startsWith(AR_PREFIX)) {
    const national = digits.slice(AR_PREFIX.length);
    // El 9 de celular es parte de la forma normalizada, así que si ya está se
    // conserva; el `?? ` de abajo lo repone igual, por eso se saca primero.
    const withoutMobile = national.startsWith(MOBILE_PREFIX)
      ? national.slice(MOBILE_PREFIX.length)
      : national;

    return withoutMobile.length === NATIONAL_LENGTH
      ? `${AR_PREFIX}${MOBILE_PREFIX}${withoutMobile}`
      : null;
  }

  // Formato local: puede traer el 0 de larga distancia.
  const national = digits.startsWith('0') ? digits.slice(1) : digits;

  // El "15" que se intercala entre el área y el número en los celulares.
  // "3705 15 194299" -> "3705 194299"
  const withoutFifteen =
    national.length === NATIONAL_LENGTH + 2 && national.slice(4, 6) === '15'
      ? national.slice(0, 4) + national.slice(6)
      : national;

  return withoutFifteen.length === NATIONAL_LENGTH
    ? `${AR_PREFIX}${MOBILE_PREFIX}${withoutFifteen}`
    : null;
}

/** ¿Tiene la forma exacta de un teléfono normalizado? Lo usa la validación. */
export function isNormalizedPhone(value: string): boolean {
  return new RegExp(`^${AR_PREFIX}${MOBILE_PREFIX}\\d{${NATIONAL_LENGTH}}$`).test(value);
}

/** Largo máximo del texto que se acepta como entrada, ya sin separadores. */
export const MAX_PHONE_DIGITS = NORMALIZED_LENGTH;
