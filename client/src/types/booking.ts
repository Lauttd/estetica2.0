// =============================================================================
// KAYA KALPA — Tipos del asistente de turnos, del lado del cliente
// =============================================================================
// Espejo de `server/src/modules/availability/availability.types.ts`,
// `bookings.types.ts` y `professionals.types.ts`. Está duplicado a propósito: el
// cliente no puede importar del servidor, porque arrastraría Prisma al bundle del
// navegador. Lo que sí se evita es que las dos copias se separen en silencio —si
// el servidor cambia la forma de una respuesta, esto deja de compilar al usarla—.
// =============================================================================

/**
 * Un horario ofrecido por el servidor.
 *
 * **Nada de esto se calcula en el cliente** (§20). El asistente pide
 * `/api/availability` y dibuja exactamente lo que recibe: ni filtra, ni ordena, ni
 * deduce horarios a partir de la grilla del salón. Un cálculo local no puede saber
 * que alguien acaba de reservar ese mismo horario desde otro teléfono.
 */
export interface AvailabilitySlot {
  startMin: number;
  /** `'HH:MM'`. Se muestra tal como llega; el cliente no lo formatea. */
  startTime: string;
  professionalIds: string[];
}

export interface AvailabilityResult {
  /** `'YYYY-MM-DD'`. */
  date: string;
  /** La suma que hizo el servidor. Es la duración del turno, no la de un servicio. */
  totalDurationMin: number;
  /**
   * `true` si ese día la estética no atiende.
   *
   * Es distinto de "no hay horarios": un día abierto pero completo llega con
   * `closed: false` y la lista vacía, y los dos casos se explican distinto. Juntar
   * los dos mensajes haría que alguien creyera que la estética no abre los sábados
   * cuando en realidad el sábado estaba lleno.
   */
  closed: boolean;
  slots: AvailabilitySlot[];
}

/** Un profesional, como lo ve el público. */
export interface Professional {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar: string | null;
  color: string;
  services: Array<{ id: string; slug: string; name: string }>;
}

/** Una línea del turno: un servicio con lo que costaba y lo que dura al reservar. */
export interface BookingServiceLine {
  serviceId: string;
  name: string;
  /** `null` = a consultar. Nunca se convierte en cero. */
  priceCents: number | null;
  durationMin: number;
}

/** Los estados por los que pasa un turno. */
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/**
 * Un turno, tal como se le muestra al cliente.
 *
 * Sin `cancelToken` es lo que se ve **solo con el código**: cuándo es el turno y
 * nada más. Ni nombre, ni teléfono, ni la posibilidad de cancelar. El código es
 * corto y se dice en voz alta, así que no alcanza como secreto: si por sí solo
 * permitiera cancelar, cualquiera que lo escuchara podría dar de baja el turno de
 * otra persona.
 */
export interface BookingDetail {
  code: string;
  status: BookingStatus;
  date: string;
  /** `'HH:MM'` en hora del salón. */
  startTime: string;
  endTime: string;
  totalDurationMin: number;
  /** Suma de los precios cargados. Con `hasPriceOnRequest`, el total es parcial. */
  totalPriceCents: number;
  hasPriceOnRequest: boolean;
  professional: { id: string; name: string };
  services: BookingServiceLine[];
  /** `true` mientras el turno se pueda cancelar. */
  canCancel: boolean;
  /** Solo llega al reservar o al consultar con el token correcto. */
  cancelToken?: string;
}

/** Lo que se manda para reservar. */
export interface CreateBookingInput {
  serviceIds: string[];
  /** Sin esto, el servidor elige al primer profesional disponible. */
  professionalId?: string;
  date: string;
  startMin: number;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    notes?: string;
  };
}
