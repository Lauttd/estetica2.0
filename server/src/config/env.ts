// =============================================================================
// KAYA KALPA — Configuración validada del entorno
// =============================================================================
// Se valida al arrancar y el proceso muere si algo falta o está mal escrito.
// Es preferible no levantar a arrancar con una configuración a medias: sin esto
// el servidor podría firmar tokens con `undefined` y no fallar nunca.
//
// Los mensajes de error nombran la VARIABLE, nunca su valor. Este archivo puede
// terminar en los logs de arranque de un hosting.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
// Instala los mensajes de Zod en castellano. Tiene que importarse ANTES de
// parsear: este archivo se carga primero que el resto de la app, así que sin
// este import los errores de configuración saldrían en inglés.
import '../utils/zod-locale';

/**
 * Hay un solo `.env`, en la raíz del monorepo, compartido con docker-compose.
 *
 * Se prueban rutas fijas en vez de buscar hacia arriba a propósito: una búsqueda
 * hacia arriba podría enganchar un `.env` ajeno que esté en el escritorio del
 * usuario y arrancar con credenciales que no son las de este proyecto.
 *
 * La primera candidata funciona igual en desarrollo y compilado, porque
 * `tsconfig.build.json` fija `rootDir: "src"` y por eso la profundidad no cambia:
 *
 *   dev        server/src/config/    -> ../../../.env
 *   compilado  server/dist/config/   -> ../../../.env
 *
 * La segunda queda por si alguna vez se compila con otra disposición de salida,
 * y la tercera permite aislar el backend con su propio `server/.env`.
 */
const ENV_CANDIDATES = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../.env'), // server/.env, para aislar el backend
];

function loadEnvFile(): void {
  for (const candidate of ENV_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
  // Sin archivo .env las variables pueden venir del entorno real del proceso
  // (Docker, systemd, panel del hosting). No es un error en sí; lo decide la
  // validación de abajo.
}

loadEnvFile();

// -----------------------------------------------------------------------------
// Helpers de parseo
// -----------------------------------------------------------------------------

/**
 * Un booleano escrito como texto. Se usa `enum` y no una comparación laxa para
 * que un `TRUST_PROXY=yes` falle ruidosamente en vez de interpretarse como
 * `false` y dejar el rate limiting mirando la IP del proxy.
 */
const booleanish = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .default(String(defaultValue) as 'true' | 'false')
    .transform((value) => value === 'true');

const minutes = (defaultValue: number, max = 24 * 60) =>
  z.coerce.number().int().min(0).max(max).default(defaultValue);

const days = (defaultValue: number) =>
  z.coerce.number().int().min(1).max(365).default(defaultValue);

// -----------------------------------------------------------------------------
// Esquema
// -----------------------------------------------------------------------------

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),

    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    /**
     * Uno o varios orígenes separados por coma. Con credenciales (la cookie de
     * refresh del panel) CORS no admite `*`, así que hay que listarlos.
     */
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    TRUST_PROXY: booleanish(false),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z.string().url().startsWith('postgres'),

    // 32 caracteres es el mínimo que tiene sentido para HMAC-SHA256.
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),

    // -------------------------------------------------------------------------
    // Reglas del sistema de turnos
    // -------------------------------------------------------------------------
    TZ: z.string().min(1).default('America/Argentina/Cordoba'),
    SALON_TIMEZONE: z.string().min(1).default('America/Argentina/Cordoba'),

    /** Cada cuántos minutos se ofrece un horario de inicio. */
    SLOT_GRANULARITY_MINUTES: minutes(15, 120),
    /** Anticipación mínima para reservar online. */
    MIN_LEAD_TIME_HOURS: z.coerce.number().int().min(0).max(168).default(2),
    /** Anticipación máxima, en días. */
    MAX_ADVANCE_DAYS: days(60),
    /** Limpieza entre un turno y el siguiente. */
    BUFFER_MINUTES: minutes(10, 120),

    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.JWT_ACCESS_SECRET === values.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'no puede ser igual a JWT_ACCESS_SECRET: si se filtra uno, se filtran los dos',
      });
    }

    // Evita publicar el .env.example tal cual, que es el error más común al
    // poner algo en producción por primera vez.
    const PLACEHOLDER = /^(cambiar_|generar_)/i;
    if (values.NODE_ENV === 'production') {
      for (const key of [
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'DATABASE_URL',
      ] as const) {
        if (PLACEHOLDER.test(values[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'sigue teniendo el valor de ejemplo de .env.example',
          });
        }
      }
    }

    const smtpValues = [values.SMTP_HOST, values.SMTP_USER, values.SMTP_PASS, values.EMAIL_FROM];
    if (smtpValues.some((value) => value !== undefined) && smtpValues.some((value) => value === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST, SMTP_USER, SMTP_PASS y EMAIL_FROM deben configurarse juntos',
      });
    }
  });

// -----------------------------------------------------------------------------
// Validación y salida
// -----------------------------------------------------------------------------

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => {
      const name = issue.path.join('.') || '(raíz)';
      return `  · ${name}: ${issue.message}`;
    })
    .join('\n');

  // A stderr y sin stack: es un error de configuración, no un bug.
  process.stderr.write(
    '\n  ❌  Configuración inválida. Revisá el archivo .env\n' +
      '      (hay una plantilla con todos los valores en .env.example).\n\n' +
      `${issues}\n\n`,
  );
  process.exit(1);
}

const values = parsed.data;

export const env = Object.freeze({
  ...values,

  isProduction: values.NODE_ENV === 'production',
  isDevelopment: values.NODE_ENV === 'development',

  /** Orígenes permitidos por CORS, ya normalizados y sin vacíos. */
  corsOrigins: values.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** La zona horaria que manda: la de la estética, no la del proceso. */
  timezone: values.SALON_TIMEZONE,

  /** Anticipación mínima, en minutos (la unidad que usa el motor de turnos). */
  minLeadMinutes: values.MIN_LEAD_TIME_HOURS * 60,
});

export type Env = typeof env;
