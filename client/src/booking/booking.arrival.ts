// =============================================================================
// KAYA KALPA — La marca de "acabo de reservar"
// =============================================================================
// Viaja en el estado de la navegación a la confirmación, no en la dirección: no
// describe la pantalla —`/turnos/confirmado/KK-XXXXXX` es la misma para quien
// acaba de reservar y para quien abre el enlace de un turno viejo—, describe **de
// dónde viene** quien llega. Esa diferencia es la que decide si hay que descartar
// el carrito y el borrador.
//
// POR QUÉ HACE FALTA UNA MARCA, Y NO LIMPIAR SIEMPRE AL LLEGAR
//
// La confirmación se puede abrir sin haber reservado en esta visita: alcanza con
// recargar la pantalla, o con volver a una entrada del historial. Limpiar siempre
// borraría la selección de alguien que está armando otro turno en la misma
// pestaña. La marca acota la limpieza al único caso en que corresponde.
//
// POR QUÉ NO SE LIMPIA ANTES DE NAVEGAR
//
// Porque `navigate` de React Router 7 corre dentro de un `startTransition`
// (`RouterProvider`, `chunk-BV7QT456.mjs`), o sea que es de **baja prioridad**: si
// en el mismo instante se vacían el carrito y el borrador —que son actualizaciones
// urgentes—, React dibuja primero esas y deja la navegación para después. En ese
// render intermedio la dirección todavía es `/turnos/resumen` y el carrito ya está
// vacío, así que el guard de `BookingLayout` ve un resumen sin datos, manda al
// primer paso y la navegación pendiente muere ahí. El turno se creaba igual —el
// servidor ya había respondido 201— pero la persona terminaba en
// `/turnos/servicios`, sin código y sin forma de cancelar.
//
// La regla que deja esto resuelto, y que conviene no romper: **el estado del que
// depende el guard no se toca hasta que el guard se desmontó**.
// =============================================================================

/**
 * Lo que se le pasa a `navigate` al ir a la confirmación.
 *
 * Es un valor y no un booleano suelto para que la marca tenga un solo origen: el
 * que navega y el que la lee no pueden discrepar sobre cómo se llama.
 */
export interface JustBookedState {
  justBooked: true;
}

/** El estado de navegación de "acabo de reservar". */
export function justBookedState(): JustBookedState {
  return { justBooked: true };
}

/**
 * Si una navegación viene de reservar.
 *
 * Comprueba la forma en vez de confiar en el tipo: `location.state` lo llena el
 * historial del navegador, y lo que hay ahí sobrevive a una recarga y puede
 * haberlo escrito cualquier cosa. Un `state` con otra forma se trata como "no
 * viene de reservar", que es la respuesta segura —no limpia nada—.
 */
export function isJustBooked(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as Partial<JustBookedState>).justBooked === true
  );
}
