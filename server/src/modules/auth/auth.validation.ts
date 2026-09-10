// =============================================================================
// KAYA KALPA — Validación del módulo de autenticación
// =============================================================================

import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../../utils/password';

/**
 * El correo se normaliza a minúsculas al validarlo.
 *
 * Los correos no distinguen mayúsculas en la práctica, pero la columna sí: sin
 * esto, quien se registró como "Admin@..." no podría entrar escribiendo
 * "admin@...". Se recorta y se pasa a minúsculas una sola vez, acá, para que el
 * resto del módulo reciba siempre la misma forma.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Ingresá tu correo.')
  .max(200)
  .email('El correo no parece válido.');

/**
 * La contraseña de ingreso NO se valida más allá del largo.
 *
 * Y menos mal: la contraseña podría no cumplir las reglas actuales —una cuenta
 * vieja, o una que cambió el criterio— y rechazarla en el login dejaría a esa
 * persona afuera sin explicación. Las reglas se aplican al CREAR una contraseña,
 * que es donde tienen sentido; acá solo se comprueba que sea un texto de un
 * largo razonable para no gastar argon2 en un pedido vacío.
 */
const loginPassword = z.string().min(1, 'Ingresá tu contraseña.').max(200);

export const loginSchema = z.object({
  email,
  password: loginPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: loginPassword,
  newPassword: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    )
    // 200 y no 72: este tope está para que nadie mande un texto enorme y haga
    // trabajar de más a argon2, no porque la contraseña se trunque.
    .max(200, 'La contraseña no puede superar los 200 caracteres.'),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
