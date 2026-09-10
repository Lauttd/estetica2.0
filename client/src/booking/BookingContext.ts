// =============================================================================
// KAYA KALPA — El estado del asistente que no vive en la URL
// =============================================================================
// Mismo motivo que en el carrito para tener el contexto en un archivo aparte: el
// recargado en caliente descarta el módulo entero cuando un archivo exporta un
// componente y algo que no lo es, y entonces el hook y el proveedor dejarían de
// compartir el contexto cada vez que se guarda un cambio.
// =============================================================================

import { createContext } from 'react';
import type { ErrorCodeValue, ErrorDetail } from '@/types/api';
import type { BookingDraft, ChosenSlot, CustomerDraft } from './booking.types';

/**
 * El aviso que dejó un intento de reserva fallido.
 *
 * Guarda el código además del mensaje porque el código es lo único en lo que se
 * puede confiar para decidir algo: el mensaje lo escribe el servidor y cambia
 * cuando alguien lo mejora. El texto se muestra tal cual llega —quien lo escribió
 * conoce el caso mejor que nadie— y el código se usa para saber a qué paso volver.
 *
 * Los `details` viajan con el aviso porque un error de validación no se explica
 * solo con una frase: hay que decir **qué campo** está mal. Se guardan acá y no en
 * el formulario porque el error ocurre en el último paso y el campo que hay que
 * corregir está en el anterior —el estado del asistente es lo único que cruza esa
 * navegación—.
 */
export interface BookingBanner {
  code: ErrorCodeValue;
  message: string;
  details: ErrorDetail[];
}

export interface BookingContextValue extends BookingDraft {
  /** Si ya se leyó lo guardado en `sessionStorage`. */
  hydrated: boolean;
  /** El aviso del último intento fallido, o `null`. */
  banner: BookingBanner | null;
  setSlot: (slot: ChosenSlot | null) => void;
  setCustomer: (customer: CustomerDraft | null) => void;
  setBanner: (banner: BookingBanner | null) => void;
  /** Borra el borrador entero —horario y datos— y el aviso. */
  reset: () => void;
}

export const BookingContext = createContext<BookingContextValue | null>(null);
