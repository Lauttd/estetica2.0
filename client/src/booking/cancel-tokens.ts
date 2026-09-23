// =============================================================================
// KAYA KALPA — Los tokens de cancelación, guardados en el navegador
// =============================================================================
// Al reservar, el servidor devuelve un token que es lo único que permite cancelar
// ese turno. **No hay envío de correo** —decidido en §31: sin casilla de correo
// configurada, mandar un correo sería inventar una infraestructura que no
// existe—, así que si el navegador no lo guarda, ese token se pierde en cuanto se
// cierra la pestaña y el turno queda imposible de dar de baja desde el sitio.
//
// POR QUÉ `localStorage` Y NO `sessionStorage`
//
// Es exactamente al revés que el borrador del asistente, y por el mismo criterio:
// el borrador es una intención del momento y el token es una consecuencia que
// sobrevive a la visita. Quien reserva un turno y cierra el navegador tiene que
// poder volver la semana siguiente, entrar a "Consultar turno" y cancelarlo.
//
// NO ES UN SECRETO FUERTE Y NO HACE FALTA QUE LO SEA
//
// El token vive en el navegador de quien reservó. No protege contra alguien con
// acceso a esa máquina —para eso está el bloqueo de pantalla del sistema
// operativo—, protege contra algo distinto: que el **código**, que es corto y se
// dicta en voz alta, alcance por sí solo para cancelar el turno de otra persona.
// =============================================================================

import { z } from 'zod';

const STORAGE_KEY = 'kk.cancel-tokens.v1';

/**
 * Cuántos tokens se recuerdan.
 *
 * Un objeto de tantas entradas como turnos haya reservado esa persona en ese
 * navegador. Se acota porque `localStorage` no se limpia solo: sin tope, un
 * navegador compartido en el mostrador acumularía tokens para siempre. Veinte
 * cubre de sobra el uso real —una clienta reserva uno o dos turnos por vez— y el
 * que se cae es siempre el más viejo.
 */
const MAX_REMEMBERED = 20;

/** Un mapa `código → token`. Se valida al leer: puede haber cualquier cosa. */
const storeSchema = z.record(z.string(), z.string().uuid());

type Store = Record<string, string>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    const result = storeSchema.safeParse(parsed);

    // Un almacenamiento con basura se descarta entero y se empieza de cero, igual
    // que el carrito: es preferible perder unos tokens viejos a que un dato con la
    // forma equivocada rompa la pantalla de consulta.
    return result.success ? result.data : {};
  } catch {
    // Sin almacenamiento disponible. Todo lo de abajo sigue funcionando en
    // memoria durante esta visita.
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Sin almacenamiento. El token queda solo en memoria y se pierde al cerrar,
    // que es el comportamiento de antes de que esto existiera.
  }
}

/**
 * Guarda el token de un turno recién reservado.
 *
 * Se vuelve a escribir el mapa entero porque JSON no tiene forma de agregar una
 * clave sin reescribir: no hay una operación de "insertar" en `localStorage`.
 */
export function rememberCancelToken(code: string, token: string): void {
  const store = readStore();
  store[code] = token;

  // Los objetos de JavaScript conservan el orden de inserción, así que las
  // primeras claves son las más viejas y se pueden descartar por adelante.
  const codes = Object.keys(store);
  const excess = codes.length - MAX_REMEMBERED;

  if (excess > 0) {
    const next: Store = {};
    for (const key of codes.slice(excess)) {
      const value = store[key];
      if (value !== undefined) next[key] = value;
    }
    writeStore(next);
    return;
  }

  writeStore(store);
}

/**
 * El token de un turno, si este navegador lo reservó.
 *
 * `null` significa "no lo tenemos", y eso no es un error: alguien puede consultar
 * un turno reservado desde otro teléfono. En ese caso la pantalla muestra cuándo
 * es el turno y no ofrece cancelar, que es lo que el servidor permite sin token.
 */
export function getCancelToken(code: string): string | null {
  return readStore()[code] ?? null;
}

/** Los códigos de los turnos reservados desde este navegador, del más reciente al más antiguo. */
export function getRememberedBookingCodes(): string[] {
  return Object.keys(readStore()).reverse();
}

/** Olvida el token de un turno. Se llama al cancelarlo: ya no sirve para nada. */
export function forgetCancelToken(code: string): void {
  const store = readStore();
  if (!(code in store)) return;

  delete store[code];
  writeStore(store);
}
