// Recorrido completo del asistente por la interfaz real, con un Edge sin ventana.
//
// Lo que comprueba §20 no es que la lista "se vea bien": es que los botones
// dibujados sean exactamente los horarios que devolvió el servidor —mismo
// conjunto, mismo orden, mismo texto—. Por eso se compara contra la respuesta de
// red que recibió la propia aplicación y no contra una petición nueva: una
// petición aparte podría devolver otra cosa y entonces la comparación no probaría
// nada sobre lo que se dibujó.
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:5173';

const { client, close } = await launch();
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'}  ${label}${detail ? `\n        ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

async function evaluate(expression) {
  const r = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) {
    throw new Error(`error en el navegador: ${r.exceptionDetails.exception?.description}`);
  }
  return r.result.value;
}

async function waitFor(expression, { timeout = 15_000, label = expression } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`se agotó el tiempo esperando: ${label}`);
}

const visible = "b.offsetParent !== null";

/** Clic en el primer elemento visible cuyo texto cumpla la condición dada. */
async function click(predicate, { label = predicate } = {}) {
  const clicked = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button, a')]
      .filter((b) => ${visible})
      .find((b) => ${predicate});
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`no se encontró ningún elemento: ${label}`);
  await new Promise((r) => setTimeout(r, 700));
}

const goto = async (path) => {
  await client.send('Page.navigate', { url: `${BASE}${path}` });
  await waitFor(`document.readyState === 'complete'`, { label: `cargar ${path}` });
  await new Promise((r) => setTimeout(r, 700));
};

const path = () => evaluate('location.pathname');
const heading = () => evaluate(`document.querySelector('h1')?.textContent ?? ''`);

await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('Network.enable');

// Se guardan las respuestas de /api/availability que ve la aplicación.
const availability = new Map();
client.on((msg) => {
  if (msg.method === 'Network.responseReceived') {
    const { requestId, response } = msg.params;
    if (response.url.includes('/api/availability')) availability.set(requestId, response.url);
    if (response.url.includes('/api/bookings') && !response.url.includes('.ts')) {
      console.log(`  → ${response.requestMethod ?? 'POST'} ${response.status} ${response.url}`);
    }
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    console.log(`  consola: ${msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400)}`);
  }
});

async function lastAvailability() {
  const entries = [...availability.entries()];
  if (entries.length === 0) return null;
  const [requestId, url] = entries[entries.length - 1];
  const body = await client.send('Network.getResponseBody', { requestId });
  return { url, json: JSON.parse(body.body) };
}

// ---------------------------------------------------------------------------
console.log('\n── 1. El asistente, paso por paso ──\n');

await goto('/turnos/servicios');
check('Abre en el paso de servicios', (await heading()) === '¿Qué te vas a hacer?', await heading());

await click(`b.textContent.trim().startsWith('Agregar al turno')`, { label: 'Agregar al turno' });
const cart = await evaluate(`JSON.parse(sessionStorage.getItem('kk.cart.v1') ?? '[]')`);
check('El servicio entró al carrito', cart.length === 1, `${cart.length} ítem(s): ${cart[0]?.name ?? ''}`);

await click(`b.textContent.trim() === 'Continuar'`, { label: 'Continuar' });
check('Paso del profesional', (await path()).endsWith('/profesional'), await path());

await click(`b.textContent.includes('Cualquiera disponible')`, { label: 'Cualquiera disponible' });
check('Paso de la fecha', (await path()).endsWith('/fecha'), await path());

const dias = await evaluate(`[...document.querySelectorAll('button')]
  .filter((b) => ${visible} && b.getAttribute('aria-label'))
  .map((b) => b.getAttribute('aria-label'))
  .filter((l) => /^\\w+, \\d{1,2} de \\w+$/.test(l))`);
check('El paso de fecha ofrece días', dias.length > 0, `${dias.length} días, primero: ${dias[0]}`);

// ---------------------------------------------------------------------------
console.log('\n── 2. §20 — mismo conjunto, mismo orden, mismo texto ──\n');

let drawn = null;
let served = null;
let chosenDay = null;

for (const dia of dias.slice(0, 6)) {
  availability.clear();
  await click(`b.getAttribute('aria-label') === ${JSON.stringify(dia)}`, { label: dia });
  await new Promise((r) => setTimeout(r, 1200));

  const body = await lastAvailability();
  if (body === null || body.json.data?.closed !== false) continue;

  const texts = await evaluate(`[...document.querySelectorAll('button')]
    .filter((b) => ${visible} && /^\\d{1,2}:\\d{2}$/.test(b.textContent.trim()))
    .map((b) => b.textContent.trim())`);

  if (texts.length > 0) {
    drawn = texts;
    served = body.json.data.slots.map((s) => s.startTime);
    chosenDay = dia;
    break;
  }
}

if (served === null) {
  check('Algún día ofreció horarios', false, 'ninguno de los primeros 6 días tuvo horarios libres');
} else {
  console.log(`  día: ${chosenDay} — ${served.length} horarios del servidor\n`);
  check(
    'Mismo conjunto',
    JSON.stringify([...served].sort()) === JSON.stringify([...drawn].sort()),
    `api: ${served.join(' ')}\n        dom: ${drawn.join(' ')}`,
  );
  check(
    'Mismo orden',
    JSON.stringify(served) === JSON.stringify(drawn),
    `api: ${served.join(' ')}\n        dom: ${drawn.join(' ')}`,
  );
  check('Mismo texto, sin reformatear', served.every((t) => drawn.includes(t)));
  check('El servidor no ofreció ningún horario vacío', served.length === drawn.length);
}

// ---------------------------------------------------------------------------
console.log('\n── 3. Reservar de punta a punta ──\n');

await click(`b.textContent.trim() === ${JSON.stringify(drawn[0])}`, { label: drawn[0] });
check('Elige el horario y avanza', (await path()).endsWith('/datos'), await path());

await evaluate(`(() => {
  const set = (id, value) => {
    const el = document.getElementById(id);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('nombre', 'Prueba');
  set('apellido', 'Interfaz');
  set('telefono', '3704123456');
  return true;
})()`);

await click(`b.textContent.trim() === 'Continuar'`, { label: 'Continuar' });
check('Llega al resumen', (await path()).endsWith('/resumen'), await path());

const resumen = await evaluate('document.body.innerText');
check('El resumen muestra el horario elegido', resumen.includes(drawn[0]));

await click(`b.textContent.trim() === 'Confirmar turno'`, { label: 'Confirmar turno' });
try {
  await waitFor(`location.pathname.includes('/confirmado/')`, { timeout: 12_000, label: 'la confirmación' });
} catch (error) {
  console.log(`  ·  sigue en ${await path()}`);
  console.log(`  ·  texto: ${(await evaluate('document.body.innerText')).split('\n').filter(Boolean).slice(0, 12).join(' / ')}`);
  throw error;
}
await new Promise((r) => setTimeout(r, 700));

const codigo = (await path()).split('/').pop();
const confirmado = await evaluate('document.body.innerText');
check('Se creó el turno y hay código', /^KK-[A-Z0-9]{6,}$/.test(codigo), `código: ${codigo}`);
check('La confirmación muestra el turno', confirmado.includes(drawn[0]));

const tokens = await evaluate(`JSON.parse(localStorage.getItem('kk.cancel-tokens.v1') ?? '{}')`);
check('El token de cancelación quedó guardado', Object.keys(tokens).length > 0);

/**
 * El asistente se da por terminado al llegar.
 *
 * Se comprueba acá y no en el resumen porque es acá donde tiene que pasar: si el
 * carrito se vaciara antes de navegar —como se hacía—, el guard del asistente vería
 * un resumen sin servicios y devolvería al primer paso, que es exactamente el bug
 * que esta sección existe para no volver a tener. Con el carrito todavía lleno en
 * este punto, cualquiera puede ver que la limpieza ocurre del lado de la
 * confirmación y no del lado del envío.
 */
const carritoTrasReservar = await evaluate(
  `JSON.parse(sessionStorage.getItem('kk.cart.v1') ?? '[]')`,
);
check(
  'El carrito quedó vacío al llegar a la confirmación',
  carritoTrasReservar.length === 0,
  `quedan ${carritoTrasReservar.length} ítem(s)`,
);
/**
 * Del borrador se comprueba que **lea vacío**, no que la clave no esté: el efecto
 * que guarda el borrador lo reescribe apenas `reset()` lo deja vacío, así que la
 * clave sigue ahí con `slot` y `customer` en `null`. `readDraft()` interpreta eso
 * igual que si no estuviera —es el mismo borrador vacío— y es lo que el asistente
 * usa para arrancar, así que es eso lo que hay que exigir.
 */
const borradorTrasReservar = await evaluate(
  `JSON.parse(sessionStorage.getItem('kk.booking.v1') ?? '{"slot":null,"customer":null}')`,
);
check(
  'El borrador del turno quedó descartado',
  borradorTrasReservar.slot === null && borradorTrasReservar.customer === null,
  JSON.stringify(borradorTrasReservar).slice(0, 120),
);

console.log('\n── 4. Cancelar desde la interfaz ──\n');

/**
 * El botón dice "Cancelar el turno" y cancela en el acto: no hay un diálogo de
 * confirmación que apretar después.
 *
 * La verificación buscaba "Cancelar turno" —un texto que la aplicación nunca
 * dibujó— y además, cuando no encontraba un diálogo, se saltaba la comprobación de
 * que el turno hubiera quedado cancelado. Las dos cosas juntas hacían que esta
 * sección no pudiera pasar nunca y que, si hubiera pasado, no hubiera comprobado
 * nada. Ahora se aprieta el botón que existe y se exige el resultado.
 */
const CANCELAR = 'Cancelar el turno';
await click(`b.textContent.trim() === ${JSON.stringify(CANCELAR)}`, { label: CANCELAR });

await waitFor(`document.body.innerText.includes('Cancelado')`, {
  timeout: 10_000,
  label: 'que el turno figure como cancelado',
});

const trasCancelar = await evaluate('document.body.innerText');
check('Se canceló desde la interfaz', trasCancelar.includes('Cancelado'));

// El token se olvida recién cuando el servidor confirmó la cancelación: si
// quedara guardado, ofrecería cancelar un turno que ya no existe.
const tokensTrasCancelar = await evaluate(
  `JSON.parse(localStorage.getItem('kk.cancel-tokens.v1') ?? '{}')`,
);
check(
  'El token se olvidó después de cancelar',
  Object.keys(tokensTrasCancelar).length === 0,
  `quedan ${Object.keys(tokensTrasCancelar).length} token(s)`,
);

console.log(
  problems.length === 0 ? '\n  Todo correcto.\n' : `\n  ${problems.length} en rojo: ${problems.join(' · ')}\n`,
);

await close();
process.exit(problems.length === 0 ? 0 : 1);
