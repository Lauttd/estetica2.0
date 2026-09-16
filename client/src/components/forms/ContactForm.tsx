import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputField, TextareaField } from '@/components/forms/Field';
import { buttonStyles } from '@/components/ui/button';
import { ApiError } from '@/api/client';
import { sendContactMessage } from '@/api/contact.api';
import { ErrorCode } from '@/types/api';
import { contactSchema, type ContactFormValues } from '@/validation/contact.schema';

/**
 * El estado del envío.
 *
 * Es una unión y no tres banderas sueltas (`isSending`, `isSent`, `error`) porque
 * esas tres se pueden contradecir: con dos banderas en `true` la pantalla tendría
 * que elegir cuál creer. Así, "enviando" y "enviado" no pueden ser ciertos a la
 * vez, y el compilador obliga a contemplar cada caso al dibujar.
 */
type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; message: string }
  | { status: 'failed'; error: unknown };

/**
 * El formulario de contacto.
 *
 * ESCRIBE EN LA BASE, NO MANDA UN CORREO
 *
 * El mensaje queda guardado y quien lo lee es la estética desde el panel. No hay
 * servidor de correo en el proyecto y prometer un envío por correo sería prometer
 * algo que no pasa: por eso la confirmación dice que el mensaje llegó, no que se
 * envió un correo.
 *
 * SE VALIDA ACÁ Y TAMBIÉN EN EL SERVIDOR
 *
 * El esquema es una copia literal del que usa el servidor —con los mismos
 * mensajes—, así que lo que se rechaza acá se habría rechazado allá. No es
 * duplicación por comodidad: es para que el error aparezca al lado del campo
 * mientras la persona lo corrige. El servidor sigue siendo el que decide, y si
 * igual rechaza, sus `details` vuelven a pintarse sobre los campos.
 */
export function ContactForm() {
  const [send, setSend] = useState<SendState>({ status: 'idle' });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(values: ContactFormValues) {
    setSend({ status: 'sending' });

    try {
      // Lo que llega acá ya pasó por el esquema —el `resolver` de
      // react-hook-form devuelve el resultado del `parse`, no lo que se escribió—,
      // así que los campos que quedaron en blanco llegan como "sin dato" y no como
      // cadenas vacías. No hace falta volver a parsear.
      const confirmation = await sendContactMessage(values);
      setSend({ status: 'sent', message: confirmation.message });
    } catch (error) {
      // Un error de validación del servidor dice qué campo está mal, y ese campo
      // está en esta pantalla: se pinta donde corresponde en vez de dejar un
      // "revisá los datos" sin decir cuál.
      if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) {
        for (const detail of error.details) {
          const field = formFieldFrom(detail.field);
          if (field !== null) setError(field, { type: 'server', message: detail.message });
        }
      }

      setSend({ status: 'failed', error });
    }
  }

  function writeAgain() {
    reset();
    setSend({ status: 'idle' });
  }

  if (send.status === 'sent') {
    return (
      <div
        className="rounded-card border border-beige bg-ivory p-8 text-center"
        /* El foco no se mueve solo: el mensaje aparece en el lugar del formulario
           que se acaba de enviar, así que quien lo mandó ya está mirando acá. */
        role="status"
      >
        <p className="text-lg text-deep">Tu mensaje llegó</p>

        <p className="mt-3 text-sm text-ink-soft">{send.message}</p>

        <button
          type="button"
          onClick={writeAgain}
          className={buttonStyles({ variant: 'outline', className: 'mt-6' })}
        >
          Escribir otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {send.status === 'failed' && <SendError error={send.error} />}

      <InputField
        id="nombre"
        label="Nombre"
        autoComplete="name"
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="correo"
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          /* La ayuda se esconde cuando hay error: las dos frases dicen lo mismo
             —que hace falta un contacto— y juntas se leen como un tartamudeo. */
          hint={
            errors.email === undefined
              ? 'Correo o teléfono: necesitamos uno de los dos.'
              : undefined
          }
          error={errors.email?.message}
          {...register('email')}
        />

        <InputField
          id="telefono"
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <InputField
        id="asunto"
        label="Asunto"
        hint="Opcional."
        error={errors.subject?.message}
        {...register('subject')}
      />

      <TextareaField
        id="mensaje"
        label="Mensaje"
        rows={6}
        required
        hint="Contanos qué necesitás y, si es por un turno, qué días te quedan mejor."
        error={errors.message?.message}
        {...register('message')}
      />

      <button
        type="submit"
        /* `isSubmitting` y no el estado propio: react-hook-form ya sabe que hay un
           envío en curso y deshabilitarlo con las dos cosas sería desincronizarlos
           el día que una de las dos cambie. */
        disabled={isSubmitting}
        className={buttonStyles({ fullWidth: true, size: 'lg' })}
      >
        {send.status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}

/**
 * El aviso de que el mensaje no salió.
 *
 * Se muestra el mensaje del servidor cuando lo hay: si la API explica qué pasó,
 * esa explicación es mejor que una genérica escrita acá. El `requestId` va abajo y
 * en chico porque no es para quien escribe —es para poder rastrear el caso si
 * reclama— pero es lo único que permite encontrarlo.
 */
function SendError({ error }: { error: unknown }) {
  // Los errores de validación ya están pintados campo por campo: repetir acá un
  // "revisá los datos" arriba del botón sería decir dos veces lo mismo, y peor,
  // mandaría a buscar el problema sin decir dónde.
  if (error instanceof ApiError && error.code === ErrorCode.VALIDATION_ERROR) return null;

  const message =
    error instanceof ApiError
      ? error.message
      : 'No pudimos enviar el mensaje. Volvé a intentar en unos minutos.';

  return (
    <div className="rounded-card border border-red-700/30 bg-red-50 px-5 py-4" role="alert">
      <p className="text-sm text-ink">{message}</p>

      {error instanceof ApiError && error.requestId !== null && (
        <p className="mt-2 text-xs text-ink-soft">
          Si el problema sigue, mencioná este código: {error.requestId}
        </p>
      )}
    </div>
  );
}

/**
 * De `body.email` al nombre del campo del formulario.
 *
 * El servidor prefija cada detalle con la parte de la petición donde está el
 * problema —`body`, `query`, `params`— porque el mismo nombre de campo puede
 * existir en dos lugares a la vez. Acá solo interesan los del cuerpo.
 *
 * La lista es explícita y no un `slice` sobre el prefijo: un detalle con un nombre
 * que este formulario no tiene —un campo que se agregó en el servidor y todavía no
 * acá— haría que `setError` registrara un error sobre un campo inexistente, que
 * react-hook-form acepta sin chistar y que nadie vería nunca.
 */
const FORM_FIELDS = ['name', 'email', 'phone', 'subject', 'message'] as const;
type FormField = (typeof FORM_FIELDS)[number];

function formFieldFrom(detailField: string): FormField | null {
  const PREFIX = 'body.';
  if (!detailField.startsWith(PREFIX)) return null;

  const name = detailField.slice(PREFIX.length);
  return (FORM_FIELDS as readonly string[]).includes(name) ? (name as FormField) : null;
}
