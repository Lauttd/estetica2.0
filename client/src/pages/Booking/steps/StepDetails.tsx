import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { InputField, TextareaField } from '@/components/forms/Field';
import { buttonStyles } from '@/components/ui/button';
import { useBooking } from '@/booking/useBooking';
import { bookingPathWith } from '@/booking/booking.params';
import { EMPTY_CUSTOMER } from '@/booking/booking.types';
import { customerSchema, type CustomerFormValues } from '@/validation/booking.schema';
import { ErrorCode } from '@/types/api';
import { PATHS } from '@/routes/paths';

/**
 * Paso 5 del asistente: quién reserva (paso 8 de §19).
 *
 * LOS DATOS NO VAN EN LA URL, Y NO ES UNA PREFERENCIA
 *
 * Nombre, teléfono y correo de una persona no tienen por qué terminar en el
 * historial del navegador, en los registros del servidor ni en el `Referer` que se
 * manda a un tercero al cargar una imagen. Van al estado del asistente y de ahí a
 * `sessionStorage`, que muere al cerrar la pestaña.
 *
 * SE VALIDA ACÁ Y TAMBIÉN EN EL SERVIDOR
 *
 * El esquema es una copia literal del que usa el servidor —con los mismos
 * mensajes—, así que lo que se rechaza acá se habría rechazado allá. No es una
 * duplicación por comodidad: es para que el error aparezca al lado del campo
 * mientras la persona lo corrige, en vez de después de apretar "confirmar", cuando
 * ya está pensando en otra cosa. El servidor sigue siendo el que decide.
 *
 * EL ERROR DEL SERVIDOR VUELVE A ESTE FORMULARIO
 *
 * Si aun así el servidor rechaza por validación, el aviso viaja con los `details`
 * —qué campo y qué dice— y acá se pintan sobre los campos. El error se produce en
 * el paso de resumen y el campo que hay que arreglar está en este, así que sin
 * esto la persona vería "revisá los datos" y no sabría cuál.
 */
export function StepDetails() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const booking = useBooking();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    // Lo que ya se había escrito, si se volvió desde el resumen. Volver a
    // encontrarse el formulario vacío es la forma más rápida de que alguien
    // abandone: parece que el sitio perdió lo que hizo.
    defaultValues: booking.customer ?? EMPTY_CUSTOMER,
  });

  const banner = booking.banner;

  /**
   * Pinta sobre los campos el error que devolvió el servidor.
   *
   * `fieldErrors` distingue este caso: solo `VALIDATION_ERROR` manda los `details`
   * con la forma `{ field, message }`. Con cualquier otro código —un horario
   * ocupado, por ejemplo— pintarlos acá escribiría un mensaje al lado de un campo
   * que no tiene nada que ver con lo que falló.
   */
  const appliesToFields = banner !== null && banner.code === ErrorCode.VALIDATION_ERROR;

  useEffect(() => {
    if (!appliesToFields || banner === null) return;

    for (const detail of banner.details) {
      const field = formFieldFrom(detail.field);
      if (field !== null) {
        setError(field, { type: 'server', message: detail.message });
      }
    }
  }, [appliesToFields, banner, setError]);

  function onSubmit(values: CustomerFormValues) {
    booking.setCustomer({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      // El formulario trabaja con cadenas vacías —es lo que tiene un `<input>`— y
      // así se guardan. La conversión a "sin dato" pasa una sola vez, al armar la
      // petición.
      email: values.email ?? '',
      notes: values.notes ?? '',
    });

    navigate(bookingPathWith(PATHS.bookingStepPath('summary'), searchParams));
  }

  return (
    <>
      <PageMeta
        title="Tus datos para el turno"
        description="Completá tus datos para confirmar el turno en KAYA KALPA. Los usamos solo para avisarte si algo cambia."
      />

      <PageHeader
        title="Tus datos"
        subtitle="Los usamos para confirmarte el turno y avisarte si algo cambia."
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mx-auto max-w-lg space-y-5"
      >
        <InputField
          id="nombre"
          label="Nombre"
          autoComplete="given-name"
          required
          error={errors.firstName?.message}
          {...register('firstName')}
        />

        <InputField
          id="apellido"
          label="Apellido"
          autoComplete="family-name"
          required
          error={errors.lastName?.message}
          {...register('lastName')}
        />

        <InputField
          id="telefono"
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          hint="Con código de área. Es el número por el que te vamos a escribir."
          error={errors.phone?.message}
          {...register('phone')}
        />

        <InputField
          id="correo"
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          hint="Opcional."
          error={errors.email?.message}
          {...register('email')}
        />

        <TextareaField
          id="notas"
          label="Algo que quieras contarnos"
          rows={4}
          hint="Opcional. Alergias, embarazo, alguna preferencia de horario."
          error={errors.notes?.message}
          {...register('notes')}
        />

        <button type="submit" className={buttonStyles({ fullWidth: true })}>
          Continuar
        </button>
      </form>
    </>
  );
}

/**
 * De `body.customer.phone` al nombre del campo del formulario.
 *
 * El servidor prefija cada detalle con la parte de la petición donde está el
 * problema —`body`, `query`, `params`— porque hay errores que pueden venir de
 * cualquiera de las tres y el campo `phone` a secas sería ambiguo. Acá solo
 * interesan los del cuerpo del cliente: cualquier otra cosa se descarta y el
 * mensaje general del aviso queda como explicación.
 *
 * La lista de campos es explícita y no un `slice` sobre el prefijo: un detalle con
 * un nombre que este formulario no tiene —un campo que se agregó en el servidor y
 * todavía no acá— haría que `setError` registrara un error sobre un campo
 * inexistente, que react-hook-form acepta sin chistar y que nadie vería nunca.
 */
const FORM_FIELDS = ['firstName', 'lastName', 'phone', 'email', 'notes'] as const;
type FormField = (typeof FORM_FIELDS)[number];

function formFieldFrom(detailField: string): FormField | null {
  const PREFIX = 'body.customer.';
  if (!detailField.startsWith(PREFIX)) return null;

  const name = detailField.slice(PREFIX.length);
  return (FORM_FIELDS as readonly string[]).includes(name) ? (name as FormField) : null;
}
