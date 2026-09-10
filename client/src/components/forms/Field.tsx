import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/utils/cn';

/**
 * Los campos de formulario del sitio.
 *
 * UN SOLO LUGAR DONDE SE DECIDE CÓMO SE VE UN CAMPO CON ERROR
 *
 * Cada formulario del sitio —los datos del turno, el contacto, y los del panel—
 * necesita lo mismo: una etiqueta arriba, el campo, y un mensaje abajo cuando algo
 * está mal. Escribirlo suelto en cada uno tiene dos consecuencias: los campos se
 * ven distintos entre pantallas, y —peor— el mensaje de error termina sin estar
 * atado al campo que describe, así que quien usa un lector de pantalla escucha
 * "ingresá tu teléfono" sin saber a qué campo se refiere.
 *
 * Acá eso no se puede olvidar: el `aria-describedby` y el `aria-invalid` los pone
 * el componente, no quien lo usa.
 *
 * NO HACEN FALTA `forwardRef`
 *
 * `register()` de react-hook-form devuelve un `ref` entre sus props, y estos
 * componentes lo dejan pasar con el `...rest` hasta el `<input>` real. En React 19
 * `ref` es una prop común —dejó de ser especial—, así que un componente de función
 * puede recibirla y pasarla sin envolverlo en `forwardRef`.
 */

interface FieldShellProps {
  id: string;
  label: string;
  /** El mensaje de error, o `undefined` si el campo está bien. */
  error?: string | undefined;
  /** Un texto de ayuda que se ve siempre, no solo cuando algo falla. */
  hint?: string | undefined;
  /** Marca la etiqueta. El asterisco no reemplaza al texto: va acompañado. */
  required?: boolean | undefined;
  children: ReactNode;
}

/**
 * El armazón: etiqueta, campo y mensaje.
 *
 * El `id` del mensaje se deriva del `id` del campo —`telefono` → `telefono-error`—
 * en vez de recibirlo por separado. Así no hay forma de apuntar el
 * `aria-describedby` a un mensaje que no existe, que es el error que deja a un
 * campo sin descripción sin que nada falle.
 */
function FieldShell({
  id,
  label,
  error,
  hint,
  required = false,
  children,
}: FieldShellProps) {
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = error === undefined ? undefined : `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-deep">
        {label}
        {required && (
          <span className="ml-1 text-ink-soft" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint !== undefined && (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}

      {error !== undefined && (
        /* `role="alert"` para que el mensaje se anuncie apenas aparece: el error
           se calcula al enviar, así que quien no ve la pantalla no tiene forma de
           enterarse de que apareció texto nuevo abajo del campo. */
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** El `aria-describedby` del campo, juntando la ayuda y el error si están. */
function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [
    ...(hint === undefined ? [] : [`${id}-hint`]),
    ...(error === undefined ? [] : [`${id}-error`]),
  ];

  return ids.length === 0 ? undefined : ids.join(' ');
}

interface InputFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function InputField({
  id,
  label,
  error,
  hint,
  required = false,
  className,
  ...rest
}: InputFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(
          'w-full rounded-soft border bg-ivory px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/70',
          error === undefined ? 'border-beige' : 'border-red-700',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
}

interface TextareaFieldProps extends Omit<ComponentPropsWithRef<'textarea'>, 'id'> {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function TextareaField({
  id,
  label,
  error,
  hint,
  required = false,
  className,
  ...rest
}: TextareaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(
          'w-full rounded-soft border bg-ivory px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/70',
          error === undefined ? 'border-beige' : 'border-red-700',
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
}
