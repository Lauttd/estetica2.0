// =============================================================================
// KAYA KALPA — Lo que el asistente va juntando
// =============================================================================
// De todo lo que la persona elige, solo dos cosas viven en la URL: el día y el
// profesional. Esas dos son las que tiene sentido mandarle a alguien ("mirá, este
// jueves con Ana") y las que hacen que recargar la página no pierda el trabajo.
//
// El horario y los datos del cliente viven acá, en memoria y en `sessionStorage`,
// por motivos distintos:
//
//   · El horario, porque es volátil. Un enlace con el horario adentro invita a
//     abrirlo media hora después y encontrarse con que ya no está, y el mensaje
//     que recibiría quien lo abriera sería "ese horario se ocupó", que suena a
//     error cuando en realidad es que el enlace llegó tarde.
//
//   · Los datos del cliente, porque son personales. Nombre, teléfono y correo en
//     una URL terminan en el historial del navegador, en los registros del
//     servidor y en cualquier `Referer` que se mande a un tercero. No hay ninguna
//     comodidad que justifique eso.
// =============================================================================

/** El horario elegido, tal como lo devolvió el servidor. */
export interface ChosenSlot {
  /** Minutos desde la medianoche. Es lo que viaja de vuelta al reservar. */
  startMin: number;
  /** `'HH:MM'`, el texto que se muestra. Viene del servidor, no se arma acá. */
  startTime: string;
  /**
   * Quiénes pueden atender ese horario.
   *
   * Se guarda porque el resumen tiene que poder decir con quién es el turno
   * incluso antes de que llegue la respuesta de disponibilidad, y porque si la
   * persona no eligió profesional, el servidor decide entre estos al confirmar.
   */
  professionalIds: string[];
  /**
   * Para qué día vale este horario.
   *
   * Las 16:00 del martes y las 16:00 del jueves no son el mismo horario. Sin este
   * dato, volver al paso de fecha, elegir otro día y seguir con el asistente
   * llevaría a reservar el día nuevo a la hora que se había elegido para el
   * viejo: el servidor lo rechazaría con `SLOT_TAKEN` —que suena a "se ocupó" y
   * es mentira— o, peor, lo aceptaría y el turno quedaría en un horario que nadie
   * eligió.
   */
  forDate: string;
  /**
   * Para qué selección de servicios vale este horario, ordenada.
   *
   * Un horario no es "las 16:00": es "las 16:00 para estos servicios, que juntos
   * duran tanto". Agregar un servicio a mitad del asistente cambia la duración, y
   * el horario elegido antes deja de existir como tal —el turno ya no entraría en
   * ese hueco—.
   */
  forServiceIds: string[];
}

/** La selección del asistente contra la que se comprueba un horario. */
export interface SlotContext {
  date: string | null;
  professionalId: string | null;
  serviceIds: string[];
}

/**
 * ¿Este horario sigue valiendo para la selección actual?
 *
 * LAS TRES COSAS QUE LO INVALIDAN, Y POR QUÉ SE COMPRUEBAN LAS TRES
 *
 *   · **El día.** Un horario pertenece a un día. Cambiar la fecha sin descartar la
 *     hora dejaría el turno del jueves a la hora que se eligió para el martes.
 *   · **Los servicios.** Cambian la duración, así que cambian el hueco que el
 *     turno necesita. Un horario de 45 minutos no sirve para un turno de dos horas.
 *   · **El profesional.** Si se eligió uno concreto y no está entre los que pueden
 *     atender ese horario, el turno no se puede dar. Se compara contra la lista que
 *     devolvió el servidor por el mismo motivo que todo lo demás: la disponibilidad
 *     la decide el servidor, no una deducción de acá (§20).
 *
 * Se comprueba **al usar** el horario y no se borra al cambiar la selección. Es a
 * propósito: un efecto que ande limpiando estado por atrás es invisible desde cada
 * pantalla, y el día que una se olvide de dispararlo nadie se entera hasta que un
 * turno sale mal. Así, en cambio, hay una sola pregunta y una sola respuesta.
 */
export function isSlotValidFor(slot: ChosenSlot | null, context: SlotContext): boolean {
  if (slot === null) return false;
  if (slot.forDate !== context.date) return false;

  if (
    context.professionalId !== null &&
    !slot.professionalIds.includes(context.professionalId)
  ) {
    return false;
  }

  // Las dos listas ordenadas: el orden en que se agregaron los servicios al
  // carrito no cambia nada, y dos selecciones con los mismos servicios son la
  // misma selección.
  const current = [...context.serviceIds].sort();
  return (
    slot.forServiceIds.length === current.length &&
    slot.forServiceIds.every((id, index) => id === current[index])
  );
}

/** Los datos de quien reserva, tal como se escriben en el formulario. */
export interface CustomerDraft {
  firstName: string;
  lastName: string;
  phone: string;
  /**
   * Cadena vacía y no `null` cuando no se dejó: es lo que tiene el `<input>`, y
   * convertir en el camino de ida y de vuelta solo agrega lugares donde
   * equivocarse. La conversión a "sin dato" pasa una sola vez, al enviar.
   */
  email: string;
  notes: string;
}

/** Todo lo que el asistente guarda fuera de la URL. */
export interface BookingDraft {
  slot: ChosenSlot | null;
  customer: CustomerDraft | null;
}

export const EMPTY_BOOKING_DRAFT: BookingDraft = { slot: null, customer: null };

/** Los datos del formulario, vacíos. */
export const EMPTY_CUSTOMER: CustomerDraft = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
};
