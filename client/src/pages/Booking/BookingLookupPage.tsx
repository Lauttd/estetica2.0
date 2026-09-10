import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/PageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonStyles } from '@/components/ui/button';
import { InputField } from '@/components/forms/Field';
import {
  BookingDetailSkeleton,
  BookingDetailView,
} from '@/components/booking/BookingDetailView';
import { getCancelToken } from '@/booking/cancel-tokens';
import { useBookingCancel } from '@/booking/useBookingCancel';
import { ApiError } from '@/api/client';
import { useBookingByCode } from '@/queries/bookings.queries';
import { BOOKING_PARAMS } from '@/routes/search-params';
import { PATHS } from '@/routes/paths';

/**
 * Consultar un turno con el código.
 *
 * POR QUÉ EXISTE
 *
 * Es la única salida que queda si se cierra la pestaña. Al reservar no se manda
 * ningún correo (§31), así que el código que se mostró en la confirmación es todo
 * lo que la persona tiene. Sin esta pantalla, un turno reservado desde un teléfono
 * no se podría consultar ni cancelar nunca más.
 *
 * EL CÓDIGO VA EN LA DIRECCIÓN
 *
 * `?codigo=KK-7F3K9M` en la URL y no en el estado local, por el mismo motivo por el
 * que la fecha del asistente va ahí: así el botón "atrás" devuelve a la consulta
 * anterior, y recargar no borra lo que se estaba mirando. No es un dato personal
 * —es lo que la persona ya tiene escrito en un papel—, así que no hay nada que
 * proteger de la barra de direcciones.
 *
 * EL TOKEN NO SE PIDE: SE BUSCA
 *
 * Si este navegador reservó ese turno, el token está guardado y la pantalla ofrece
 * cancelar. Si no —se reservó desde otro teléfono, o se limpiaron los datos del
 * navegador— se muestra cuándo es el turno y nada más, que es exactamente lo que el
 * servidor permite con el código solo.
 */
export function BookingLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const code = (searchParams.get(BOOKING_PARAMS.code) ?? '').trim();

  /**
   * El texto del campo, que no es lo mismo que el código consultado.
   *
   * Mientras alguien escribe "KK-7F" no hay nada que consultar: el código tiene
   * ocho caracteres. Se consulta al enviar, y el campo se sincroniza con la
   * dirección por si esta cambia por otro motivo —el botón "atrás", un enlace
   * pegado—.
   */
  const [value, setValue] = useState(code);

  useEffect(() => {
    setValue(code);
  }, [code]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();

    if (trimmed.length === 0) next.delete(BOOKING_PARAMS.code);
    else next.set(BOOKING_PARAMS.code, trimmed);

    // `replace: true` para que la búsqueda anterior no quede en el historial: si
    // alguien prueba cinco códigos seguidos, el botón "atrás" tendría que sacarlo
    // de la pantalla, no hacerle recorrer los cinco códigos al revés.
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <PageMeta
        title="Consultar o cancelar un turno"
        description="Ingresá el código de tu turno para ver cuándo es, con quién y cancelarlo si no podés ir."
      />

      <PageHeader
        title="Tu turno"
        subtitle="Ingresá el código que te dimos al reservar."
      />

      <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
        <InputField
          id="codigo-turno"
          label="Código del turno"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="KK-XXXXXX"
          autoComplete="off"
          // Puede estar en mayúsculas, en minúsculas o con espacios de más si se
          // copió de un mensaje: el servidor normaliza y acá solo se sacan los
          // espacios de los extremos.
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono tracking-widest uppercase"
        />

        <button type="submit" className={buttonStyles({ fullWidth: true })}>
          Buscar turno
        </button>
      </form>

      {code.length > 0 && <Result code={code} />}

      <p className="mt-10 text-center text-sm text-ink-soft">
        ¿No tenés el código?{' '}
        <Link
          to={PATHS.contact}
          className="text-forest underline decoration-forest/30 underline-offset-4 transition-colors duration-150 hover:decoration-forest"
        >
          Escribinos
        </Link>{' '}
        y lo buscamos.
      </p>
    </>
  );
}

/**
 * La consulta, una vez que hay un código.
 *
 * Está separado del formulario para que el hook de la consulta no corra con el
 * campo vacío: sin código no hay nada que pedir, y el estado de TanStack pasaría
 * por "cargando" y por "error" para algo que la persona todavía no pidió.
 *
 * El `key` del componente en la pantalla de arriba no hace falta porque el código
 * entra en la clave de la consulta: cambiar de código cambia la entrada de caché, y
 * TanStack muestra el estado correcto sin desmontar nada.
 */
function Result({ code }: { code: string }) {
  const token = getCancelToken(code);
  const booking = useBookingByCode(code, token);
  const { cancel, isCancelling, error } = useBookingCancel(code);

  if (booking.isPending) return <BookingDetailSkeleton />;

  if (booking.isError) {
    return (
      <div
        className="mx-auto mt-8 max-w-md rounded-card border border-beige bg-ivory p-8 text-center"
        role="alert"
      >
        <p className="text-base text-ink">
          {booking.error instanceof ApiError
            ? booking.error.message
            : 'No pudimos buscar el turno. Volvé a intentar en unos minutos.'}
        </p>

        <p className="mt-3 text-sm text-ink-soft">
          Fijate que el código esté completo, con las letras y los números.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <BookingDetailView
        booking={booking.data}
        /* Solo se ofrece cancelar si este navegador guardó el token de ese turno.
           Sin él el servidor rechaza la cancelación, y un botón que lleva a un
           error seguro es peor que no tener el botón: quien reservó desde otro
           teléfono ve el turno y el teléfono de la estética, que es lo que
           corresponde. */
        onCancel={
          token === null
            ? undefined
            : () => {
                void cancel();
              }
        }
        isCancelling={isCancelling}
      />

      {error !== null && (
        <p
          role="alert"
          className="mt-4 rounded-soft border border-red-700/40 bg-red-700/5 px-4 py-3 text-center text-sm text-ink"
        >
          {error}
        </p>
      )}
    </div>
  );
}
