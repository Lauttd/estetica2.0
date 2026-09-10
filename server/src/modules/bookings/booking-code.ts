// =============================================================================
// KAYA KALPA — Código de turno
// =============================================================================
// El código es lo que el cliente anota o guarda para consultar y cancelar su
// turno sin tener cuenta. Se dicta por teléfono y se copia a mano, así que la
// forma la decide ese uso, no la estética:
//
//   · Sin caracteres que se confundan al leerlos o escribirlos: nada de 0 con O,
//     ni 1 con I o L. Por eso el alfabeto empieza en 2.
//   · Corto, seis caracteres. Con 31 símbolos son casi 900 millones de
//     combinaciones: con los turnos de una estética, chocar es un accidente y no
//     algo que pase. Igual la columna es única y el alta reintenta.
//   · Se muestra y se acepta en mayúsculas, sin distinguir cómo lo escriba el
//     cliente al consultar.
//   · Va precedido de "KK-" solo al mostrarlo, para que se lea como un código y
//     no como una palabra suelta.
// =============================================================================

import { randomInt } from 'node:crypto';

/**
 * Alfabeto sin caracteres ambiguos.
 *
 * Sin `0`, `O`, `1`, `I` y `L`. Se mantienen `2`–`9` y las letras restantes.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const CODE_LENGTH = 6;

/** Prefijo que se agrega al mostrar el código. No se guarda en la base. */
export const CODE_DISPLAY_PREFIX = 'KK-';

/**
 * Genera un código nuevo.
 *
 * Usa `randomInt` del módulo de criptografía y no `Math.random()`: los códigos
 * son la única credencial que tiene el cliente para ver y cancelar su turno, y un
 * generador predecible permitiría adivinar el turno de otra persona. `randomInt`
 * además reparte de manera uniforme, sin el sesgo que da el `%` sobre un flotante.
 */
export function generateBookingCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Deja un código escrito por el cliente en la forma en que se guarda.
 *
 * Acepta minúsculas, espacios y el prefijo, porque el cliente lo va a tipear como
 * se le ocurra: "kk-7f3k9m", "KK 7F3K9M" y "7f3k9m" son el mismo turno. Devuelve
 * `null` si después de limpiarlo no puede ser un código válido, para que la
 * consulta responda "no encontrado" en vez de ir a buscar cualquier cosa.
 */
export function normalizeBookingCode(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/^KK[\s-]*/, '')
    .replace(/[\s-]/g, '');

  if (cleaned.length !== CODE_LENGTH) return null;
  for (const character of cleaned) {
    if (!ALPHABET.includes(character)) return null;
  }
  return cleaned;
}

/** El código como se le muestra al cliente. */
export function formatBookingCode(code: string): string {
  return `${CODE_DISPLAY_PREFIX}${code}`;
}
