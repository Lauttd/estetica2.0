// =============================================================================
// KAYA KALPA — Qué hace el asistente cuando la reserva falla
// =============================================================================
// Confirmar un turno puede fallar por motivos que son responsabilidad de la
// persona —dejó un campo mal— y por motivos que no lo son —alguien tomó ese
// horario mientras completaba el formulario, la estética cambió un precio—. Cada
// uno se resuelve en un lugar distinto del asistente, así que la única forma de
// que la persona no quede mirando un mensaje sin saber qué hacer es mandarla al
// paso donde está el problema y conservar todo lo que ya había cargado.
//
// LA DECISIÓN SE TOMA POR CÓDIGO, NUNCA POR TEXTO
//
// El servidor manda un código estable y un mensaje en castellano. El mensaje se
// muestra —lo escribe quien conoce el caso mejor que nadie— pero no se compara:
// el día que alguien mejore la redacción de "ese horario se acaba de ocupar", un
// asistente que buscara esa frase dejaría de volver al paso de horario y nadie se
// enteraría hasta que una clienta lo reportara.
//
// El mensaje se guarda en el estado del asistente y no en la dirección: uno en la
// URL sobrevive a un F5 y sigue ahí mintiendo sobre algo que ya se resolvió.
// =============================================================================

import { ErrorCode, type ErrorCodeValue } from '@/types/api';
import type { BookingStepKey } from '@/routes/paths';

/** Qué datos del servidor quedaron viejos y hay que volver a pedir. */
export type StaleData = 'availability' | 'professionals';

export interface ErrorHandling {
  /**
   * A qué paso volver.
   *
   * `null` es quedarse donde está: hay errores —el límite de intentos, una caída
   * del servidor— que no se arreglan cambiando de pantalla, y hacer retroceder a
   * alguien que ya completó todo sería devolverle trabajo por un problema ajeno.
   */
  step: BookingStepKey | null;
  /**
   * Si hay que descartar del carrito los servicios que ya no se pueden reservar
   * online. Solo `SERVICE_NOT_BOOKABLE`: es el único caso en que dejar el carrito
   * como está condena el siguiente intento al mismo error.
   */
  dropUnbookable: boolean;
  /**
   * Si los `details` del error son campos del formulario.
   *
   * Solo `VALIDATION_ERROR` los trae con la forma `{ field, message }`; en
   * cualquier otro caso, pintar `details` sobre los campos del formulario
   * escribiría un mensaje al lado de un campo que no tiene nada que ver.
   */
  fieldErrors: boolean;
  /** Qué volver a pedir antes de reintentar. */
  refresh: StaleData | null;
}

/**
 * La política, en un solo lugar.
 *
 * Está escrita como una tabla y no como una cadena de `if` para que se pueda leer
 * de un vistazo qué pasa con cada error. El `??` del final cubre todo lo demás
 * —`INTERNAL_ERROR`, un código nuevo que el servidor agregue mañana, un error de
 * red— con el comportamiento más conservador: no mover a nadie de donde está y
 * mostrarle lo que dijo el servidor.
 */
const HANDLING: Partial<Record<ErrorCodeValue, ErrorHandling>> = {
  /**
   * El horario se ocupó entre que se mostró y que se confirmó.
   *
   * Es el caso de dos personas reservando a la vez, y el motivo por el que existe
   * la verificación dentro de la transacción. Se vuelve al paso de horario y se
   * descarta lo que había en caché: si se volviera mostrando la misma lista, el
   * horario que acaba de fallar seguiría apareciendo como disponible y la persona
   * lo elegiría otra vez.
   */
  [ErrorCode.SLOT_TAKEN]: {
    step: 'slot',
    dropUnbookable: false,
    fieldErrors: false,
    refresh: 'availability',
  },

  /**
   * La fecha quedó fuera de la ventana de reserva.
   *
   * Pasa cuando alguien deja el asistente abierto y confirma al día siguiente: la
   * fecha que eligió ya es ayer. Se vuelve al paso de fecha; no hay nada que
   * refrescar porque lo que cambió fue el calendario, no los datos.
   */
  [ErrorCode.OUTSIDE_BOOKING_WINDOW]: {
    step: 'date',
    dropUnbookable: false,
    fieldErrors: false,
    refresh: null,
  },

  /**
   * El profesional elegido no puede hacer esos servicios.
   *
   * Se vuelve a elegir profesional y se vuelve a pedir la lista: la que se mostró
   * salió del servidor con los servicios que había en ese momento, y si la estética
   * cambió las asignaciones, la lista vieja ofrecería de nuevo a quien no puede.
   */
  [ErrorCode.PROFESSIONAL_UNAVAILABLE]: {
    step: 'professional',
    dropUnbookable: false,
    fieldErrors: false,
    refresh: 'professionals',
  },

  /**
   * Alguno de los servicios elegidos dejó de poder reservarse online.
   *
   * Se vuelve al paso de servicios y se saca del carrito el que corresponde. Cuál
   * es lo decide el servidor en el momento, no lo que el carrito recuerda: el
   * carrito es una copia de cuando se agregó, y este error significa justamente
   * que esa copia quedó vieja.
   */
  [ErrorCode.SERVICE_NOT_BOOKABLE]: {
    step: 'services',
    dropUnbookable: true,
    fieldErrors: false,
    refresh: null,
  },

  /**
   * Demasiados intentos seguidos.
   *
   * `bookingLimiter` cuenta las reservas por dirección IP, y una estética con
   * varias computadoras saliendo por la misma conexión puede agotarlo sin que
   * nadie haya hecho nada raro. No se mueve a nadie: lo cargado sigue siendo
   * válido y lo único que hace falta es esperar, así que se muestra el mensaje y
   * se deja el botón para reintentar.
   */
  [ErrorCode.RATE_LIMITED]: {
    step: null,
    dropUnbookable: false,
    fieldErrors: false,
    refresh: null,
  },

  /**
   * El formulario tiene algo mal.
   *
   * No debería llegar nunca: el mismo esquema que valida el servidor valida en el
   * navegador antes de mandar. Llega igual cuando las dos copias se separan por un
   * cambio de un solo lado, y entonces lo importante es que la persona no vea un
   * error genérico sino el campo exacto que hay que corregir.
   */
  [ErrorCode.VALIDATION_ERROR]: {
    step: 'details',
    dropUnbookable: false,
    fieldErrors: true,
    refresh: null,
  },
};

/** Lo que hay que hacer ante un código de error. */
export function handlingFor(code: ErrorCodeValue): ErrorHandling {
  return (
    HANDLING[code] ?? {
      step: null,
      dropUnbookable: false,
      fieldErrors: false,
      refresh: null,
    }
  );
}
