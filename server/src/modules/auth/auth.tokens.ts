// =============================================================================
// KAYA KALPA — Emisión y verificación de credenciales
// =============================================================================
// Dos tokens con propósitos distintos, y por eso dos mecanismos distintos:
//
//   · ACCESO — un JWT firmado, 15 minutos, que viaja en la cabecera
//     Authorization. Es autocontenido: el servidor lo verifica sin consultar
//     nada, y por eso mismo no se puede revocar antes de que expire. Vida corta
//     para que eso no importe.
//
//   · REFRESCO — 32 bytes aleatorios, 7 días, en una cookie httpOnly. NO es un
//     JWT: es opaco y vive en la base, así que se puede revocar de verdad. Es el
//     que permite cerrar sesión de verdad, y el que se rota en cada uso.
//
// POR QUÉ EL REFRESCO VA EN COOKIE Y NO EN EL CUERPO
//
// Porque httpOnly no lo puede leer JavaScript. Un token guardado en
// `localStorage` lo puede robar cualquier XSS y usarlo desde otra máquina; una
// cookie httpOnly no. SameSite=Lax alcanza porque el panel es del mismo origen
// que la API (proxy de Vite en desarrollo, mismo dominio en producción).
// =============================================================================

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import type { AdminRole } from '@prisma/client';
import { env } from '../../config/env';

/** Lo que lleva adentro el token de acceso. Nada sensible: el JWT es legible. */
export interface AccessTokenClaims {
  /** Id del administrador. */
  sub: string;
  role: AdminRole;
  /**
   * Copia de `AdminUser.tokenVersion` al momento de emitir.
   *
   * Es lo que permite invalidar todos los tokens de un usuario antes de que
   * expiren: al cambiar la contraseña se incrementa el contador, y los tokens
   * viejos —que traen el número anterior— dejan de coincidir con la base.
   */
  ver: number;
}

/** Nombre de la cookie del refresh. Lleva el prefijo del proyecto para no chocar. */
export const REFRESH_COOKIE = 'kk_refresh';

/**
 * La cookie solo se manda a `/api/auth`.
 *
 * Por defecto una cookie se manda a todo el sitio, así que viajaría en cada
 * pedido del catálogo público sin que nadie la mire. Acotarla al prefijo donde
 * se usa la mantiene fuera de todo lo demás.
 */
const REFRESH_COOKIE_PATH = '/api/auth';

// -----------------------------------------------------------------------------
// Token de acceso
// -----------------------------------------------------------------------------

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    // El algoritmo se fija explícitamente. Sin esto, un token con `alg: none` o
    // firmado con otro algoritmo podría ser aceptado según cómo esté configurada
    // la librería: es la vulnerabilidad clásica de los JWT.
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

/**
 * Verifica un token de acceso. Devuelve `null` si no sirve.
 *
 * No distingue entre vencido, mal firmado o con el formato roto: los tres se
 * resuelven igual —401 y el cliente pide un refresh— y detallar la causa solo le
 * serviría a quien está probando qué romper. Un token vencido no es un error, es
 * el funcionamiento normal: para eso tiene 15 minutos de vida.
 */
export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });

    if (typeof payload === 'string') return null;
    const { sub, role, ver } = payload as Partial<AccessTokenClaims>;
    if (typeof sub !== 'string' || typeof role !== 'string' || typeof ver !== 'number') {
      return null;
    }

    return { sub, role: role as AdminRole, ver };
  } catch {
    return null;
  }
}

/** Lee el token de una cabecera `Authorization: Bearer <token>`. */
export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

// -----------------------------------------------------------------------------
// Token de refresco
// -----------------------------------------------------------------------------

/**
 * Un token de refresco nuevo, con su hash para guardar.
 *
 * 32 bytes de `randomBytes` son 256 bits de entropía: no se adivina. Se devuelve
 * el token en claro —que es lo único que verá el cliente, dentro de su cookie— y
 * el hash, que es lo único que se guarda.
 */
export function createRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashRefreshToken(token) };
}

/**
 * El hash con el que se guarda y se busca un token de refresco.
 *
 * SHA-256 y NO argon2, a diferencia de las contraseñas. La diferencia no es un
 * descuido: argon2 existe para encarecer la fuerza bruta sobre valores que una
 * persona puede adivinar. Acá el valor son 256 bits aleatorios, así que no hay
 * nada que adivinar y el costo de argon2 solo haría lento cada refresco. Además
 * el hash tiene que ser determinista para poder buscar por él en la base, cosa
 * que argon2 —que incluye una sal aleatoria en cada hash— no permite.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Cuánto dura un token de refresco, en milisegundos. */
export function refreshTokenTtlMs(): number {
  return parseDuration(env.JWT_REFRESH_EXPIRES_IN);
}

// -----------------------------------------------------------------------------
// Cookie
// -----------------------------------------------------------------------------

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // `secure` en producción, donde hay HTTPS. En desarrollo el servidor es
    // http://localhost y una cookie `secure` sería descartada por el navegador:
    // el login parecería funcionar y el refresh nunca llegaría.
    secure: env.isProduction,
    // Lax y no Strict: con Strict, volver al panel desde un enlace externo
    // —por ejemplo el que se manda por WhatsApp— no manda la cookie y el panel
    // parecería haberse deslogueado. Lax la manda en la navegación normal y la
    // omite en los pedidos cruzados, que es la protección que importa.
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}

export function refreshCookieOptions(expiresAt: Date): CookieOptions {
  return { ...baseCookieOptions(), expires: expiresAt };
}

/**
 * Las opciones para borrar la cookie.
 *
 * Tienen que coincidir en nombre, `path` y atributos con las de escritura, si no
 * el navegador no encuentra cuál borrar y la cookie sobrevive al logout. Por eso
 * se arma sobre las mismas opciones base en vez de repetirlas.
 */
export function clearRefreshCookieOptions(): CookieOptions {
  return baseCookieOptions();
}

// -----------------------------------------------------------------------------
// Interno
// -----------------------------------------------------------------------------

/**
 * Convierte '15m', '7d', '12h' o '30s' a milisegundos.
 *
 * `jsonwebtoken` acepta estos formatos, pero no los expone: los interpreta para
 * firmar y nada más. Como acá hace falta saber cuándo vence el refresh para
 * guardarlo en la base, se traduce a mano. Se admiten las cuatro unidades y nada
 * más: un valor raro tiene que fallar fuerte, no interpretarse por aproximación.
 */
function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Duración inválida: "${value}". Se espera un número seguido de s, m, h o d (por ejemplo 7d).`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];

  return amount * factor;
}
