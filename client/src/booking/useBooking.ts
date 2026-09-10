import { useContext } from 'react';
import { BookingContext, type BookingContextValue } from './BookingContext';

/**
 * El borrador del turno, desde cualquier pantalla del asistente.
 *
 * Lanza si no hay proveedor en vez de devolver un borrador vacío: una pantalla
 * montada fuera del proveedor se vería perfectamente bien y perdería el horario
 * elegido sin que nada lo delate, que es un error que se descubre cuando alguien
 * confirma un turno para una hora que no eligió.
 */
export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);

  if (context === null) {
    throw new Error('useBooking tiene que usarse dentro de <BookingProvider>.');
  }

  return context;
}
