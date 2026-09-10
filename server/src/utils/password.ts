// =============================================================================
// KAYA KALPA — Contraseñas del panel
// =============================================================================
// Vive en `utils` y no dentro del módulo de auth porque lo usan dos procesos
// distintos: la API, para verificar un login, y el seed, para crear el primer
// administrador. Tenerlo en un solo lugar es lo que garantiza que la contraseña
// que siembra el seed sea verificable por el login — si los parámetros de hash
// se separaran, el panel quedaría con un usuario imposible de entrar.
// =============================================================================

import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/**
 * Parámetros de argon2id recomendados por OWASP.
 *
 * `memoryCost` en KiB: 19456 KiB son 19 MiB por verificación. Es lo que hace que
 * un atacante con el hash en la mano necesite esa memoria por cada intento, que
 * es justamente lo que vuelve caro el ataque por fuerza bruta con GPU.
 *
 * `timeCost: 2` y `parallelism: 1` son el par que OWASP recomienda junto con esa
 * memoria. Subirlos alarga cada login; con 19 MiB ya alcanza.
 */
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hashea una contraseña para guardarla. Nunca se guarda el texto plano. */
export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, ARGON_OPTIONS);
}

/**
 * Verifica una contraseña contra su hash.
 *
 * Devuelve `false` ante un hash corrupto o con un formato desconocido en vez de
 * dejar escapar la excepción: para quien llama, "no coincide" y "el hash está mal
 * guardado" se resuelven igual —se rechaza el ingreso— y una excepción acá sería
 * un 500 en la cara de alguien que solo escribió mal su contraseña.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argonVerify(hash, plain, ARGON_OPTIONS);
  } catch {
    return false;
  }
}

/** Largo mínimo de una contraseña nueva. */
export const MIN_PASSWORD_LENGTH = 12;
