// =============================================================================
// KAYA KALPA — El proveedor del borrador de turno
// =============================================================================
// Guarda el horario elegido, los datos del cliente y el aviso del último error.
//
// POR QUÉ ARRANCA VACÍO Y SE LLENA DESPUÉS
//
// Igual que el carrito: la página se prerenderiza, así que el primer render del
// navegador tiene que dar exactamente lo mismo que el HTML —un borrador vacío— y
// lo guardado se lee en un efecto, que solo corre en el navegador. Si el primer
// render leyera `sessionStorage`, React compararía contra el HTML, no coincidiría
// y tiraría el árbol entero para volver a dibujarlo.
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookingContext, type BookingBanner, type BookingContextValue } from './BookingContext';
import { clearStoredDraft, readDraft, writeDraft } from './booking.storage';
import {
  EMPTY_BOOKING_DRAFT,
  type BookingDraft,
  type ChosenSlot,
  type CustomerDraft,
} from './booking.types';

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_BOOKING_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [banner, setBanner] = useState<BookingBanner | null>(null);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  // El guard de `hydrated` es lo que impide que este efecto pise lo guardado en el
  // primer render, cuando el borrador todavía es el vacío inicial. Los dos efectos
  // corren en el mismo commit, así que el orden entre ellos no alcanza.
  useEffect(() => {
    if (!hydrated) return;
    writeDraft(draft);
  }, [hydrated, draft]);

  /**
   * Cambiar el horario descarta el aviso.
   *
   * El aviso dice por qué falló el intento anterior —"ese horario se acaba de
   * ocupar"— y una vez que la persona elige otro horario esa frase deja de ser
   * cierta y pasa a ser ruido que asusta. Lo mismo vale para los datos del
   * cliente: si el error era de validación, corregir el campo tiene que borrar el
   * mensaje.
   */
  const setSlot = useCallback((slot: ChosenSlot | null) => {
    setDraft((current) => ({ ...current, slot }));
    setBanner(null);
  }, []);

  const setCustomer = useCallback((customer: CustomerDraft | null) => {
    setDraft((current) => ({ ...current, customer }));
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_BOOKING_DRAFT);
    setBanner(null);
    clearStoredDraft();
  }, []);

  const value = useMemo<BookingContextValue>(
    () => ({
      slot: draft.slot,
      customer: draft.customer,
      hydrated,
      banner,
      setSlot,
      setCustomer,
      setBanner,
      reset,
    }),
    [draft, hydrated, banner, setSlot, setCustomer, reset],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
