// =============================================================================
// KAYA KALPA — Validación de la administración de usuarios
// =============================================================================

import { AdminRole } from '@prisma/client';
import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../../utils/password';
import { optionalText } from '../shared/validation';

/**
 * El rol se valida contra el enum de Prisma: `ADMIN` o `STAFF`. La lista no se
 * escribe a mano para que agregar un rol al schema no deje un valor que la API
 * acepta y la base rechaza.
 */
const roleSchema = z.nativeEnum(AdminRole, {
  errorMap: () => ({ message: 'Ese rol no existe.' }),
});

/**
 * Una contraseña nueva.
 *
 * Se exige el mínimo y nada más: sin reglas de mayúsculas y símbolos. Una regla
 * de composición empuja a la gente a `Kaya2026!`, que es peor que una frase larga
 * y fácil de recordar. El mínimo de 12 caracteres es el que hace la diferencia, y
 * es el mismo que exige el cambio de contraseña propio — dos mínimos distintos
 * para la misma contraseña serían una trampa.
 */
const passwordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  )
  .max(200, 'La contraseña es demasiado larga.');

export const createAdminUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Ingresá un correo válido.')
    .max(200, 'El correo es demasiado largo.'),
  name: z
    .string()
    .trim()
    .min(2, 'Escribí el nombre.')
    .max(120, 'El nombre es demasiado largo.'),
  role: roleSchema,
  password: passwordSchema,
});

/**
 * Los cambios sobre un usuario que ya existe.
 *
 * El correo NO se puede cambiar. Es el dato con el que la persona entra y con el
 * que queda en el registro de la sesión; permitir editarlo haría que dos cuentas
 * puedan intercambiar identidad y volvería imposible saber quién hizo qué. Dar de
 * baja y crear una cuenta nueva es más trabajo pero deja el historial intacto.
 *
 * La contraseña tampoco: tiene su propia ruta, porque restablecerla no es una
 * edición más —cierra todas las sesiones de esa persona— y mezclarla con el
 * cambio de rol haría que un guardado de la pantalla cerrara sesiones sin que
 * nadie lo pidiera.
 */
export const updateAdminUserSchema = z
  .object({
    name: optionalText(120, 'El nombre es demasiado largo.'),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (body) => body.name !== undefined || body.role !== undefined || body.active !== undefined,
    { message: 'No mandaste ningún cambio.' },
  );

export const resetAdminPasswordSchema = z.object({
  password: passwordSchema,
});

export type CreateAdminUserBody = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserBody = z.infer<typeof updateAdminUserSchema>;
export type ResetAdminPasswordBody = z.infer<typeof resetAdminPasswordSchema>;
