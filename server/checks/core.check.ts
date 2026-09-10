// =============================================================================
// KAYA KALPA — Verificación del núcleo del backend
// =============================================================================
// Comprueba las dos garantías que sostienen todo lo demás:
//
//   1. §38 — que un error interno NUNCA llegue al cliente. Se lanza a propósito
//      un error que contiene una credencial y se verifica que la respuesta
//      traiga solo el mensaje genérico, sin stack ni rastro del original.
//
//   2. Apagado ordenado — que al cerrar el proceso se terminen las peticiones en
//      curso y se cierre la conexión a la base, en vez de cortar a la mitad.
//
//   npm run check:core
// =============================================================================

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { errorHandler } from '../src/middlewares/errorHandler';
import { notFound } from '../src/middlewares/notFound';
import { requestContext } from '../src/middlewares/requestContext';
import { NotFoundError } from '../src/utils/errors';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    pass += 1;
    console.log(`  ✓  ${label}`);
  } else {
    fail += 1;
    console.log(`  ✗  ${label}${detail ? `\n       ${detail}` : ''}`);
  }
}

const SECRETO = 'postgres://kaya:hunter2@localhost/kaya_kalpa';

// -----------------------------------------------------------------------------
// 1. Fuga de información en errores (§38)
// -----------------------------------------------------------------------------

const app = express();
app.use(requestContext);

// Un bug: lanza un error que contiene una credencial en el mensaje.
app.get('/romper', () => {
  throw new Error(`No se pudo conectar: ${SECRETO}`);
});

// Un error esperado, con mensaje escrito para el usuario.
app.get('/conocido', () => {
  throw new NotFoundError('Ese servicio no existe.');
});

app.get('/async-romper', async () => {
  throw new Error(`Falla asíncrona con ${SECRETO}`);
});

app.use(notFound);
app.use(errorHandler);

async function probe(port: number, url: string) {
  const response = await fetch(`http://localhost:${port}${url}`);
  const raw = await response.text();
  const body = JSON.parse(raw) as {
    error?: { code?: string; message?: string; requestId?: string };
  };
  return { status: response.status, raw, body };
}

async function checkErrorLeakage(): Promise<void> {
  console.log('\n── §38: los errores internos no llegan al cliente ──');

  const server = app.listen(4100);
  await new Promise((resolve) => server.once('listening', resolve));

  const roto = await probe(4100, '/romper');
  check('un bug devuelve 500', roto.status === 500, `fue ${roto.status}`);
  check('el código es INTERNAL_ERROR', roto.body.error?.code === 'INTERNAL_ERROR');
  check(
    'el mensaje es el genérico',
    roto.body.error?.message ===
      'Ocurrió un error inesperado. Volvé a intentar en unos minutos.',
    `fue: ${roto.body.error?.message}`,
  );
  check('NO aparece la credencial', !roto.raw.includes('hunter2'), roto.raw);
  check('NO aparece el mensaje interno', !roto.raw.includes('No se pudo conectar'));
  check('NO se devuelve el stack', !roto.raw.includes('stack') && !roto.raw.includes('.ts:'));
  check('sí se devuelve un requestId para cruzarlo con el log', Boolean(roto.body.error?.requestId));

  const asincrono = await probe(4100, '/async-romper');
  check('un rechazo asíncrono también da 500 genérico', asincrono.status === 500);
  check('y tampoco filtra la credencial', !asincrono.raw.includes('hunter2'));

  const conocido = await probe(4100, '/conocido');
  check('un AppError sí conserva su status', conocido.status === 404);
  check(
    'y su mensaje para el usuario',
    conocido.body.error?.message === 'Ese servicio no existe.',
  );

  const inexistente = await probe(4100, '/no-existe');
  check('una ruta inexistente da 404 con el formato de error', inexistente.status === 404);
  check('y no filtra rutas internas', !inexistente.raw.includes('/src/'));

  await new Promise((resolve) => server.close(resolve));
}

// -----------------------------------------------------------------------------
// 2. Apagado ordenado
// -----------------------------------------------------------------------------
// En Windows no existen las señales POSIX, así que no se puede mandar un SIGTERM
// real. Se emite el evento dentro del proceso: el cuerpo del manejador es
// exactamente el mismo que ejecutaría la señal, que es lo que se quiere probar.

async function checkGracefulShutdown(): Promise<void> {
  console.log('\n── Apagado ordenado ──');

  const wrapper = path.resolve(__dirname, 'verificacion-apagado.ts');
  // La ruta del `require` va ABSOLUTA: dentro del wrapper, una ruta relativa se
  // resolvería contra la carpeta que contiene al wrapper, no contra este archivo.
  const serverEntry = path.resolve(__dirname, '../src/server');
  fs.writeFileSync(
    wrapper,
    [
      "process.env.PORT = '4101';",
      `require(${JSON.stringify(serverEntry)});`,
      "setTimeout(() => process.emit('SIGINT'), 2500);",
    ].join('\n'),
  );

  // El comando va como una sola cadena: pasar argumentos sueltos junto con
  // `shell: true` está deprecado en Node y además no escapa los espacios.
  const child = spawn(`npx tsx "${wrapper}"`, {
    cwd: __dirname,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('exit', (code) => resolve(code));
    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 25_000);
  });

  check('el proceso termina con código 0', exitCode === 0, `fue ${exitCode}`);
  check('registra el inicio del cierre', output.includes('Cerrando el servidor'));
  check('cierra la conexión con la base', output.includes('Servidor cerrado'));
  check(
    'no tuvo que forzar la salida por timeout',
    !output.includes('se fuerza la salida'),
    output.slice(-300),
  );

  fs.unlinkSync(wrapper);
}

async function main(): Promise<void> {
  await checkErrorLeakage();
  await checkGracefulShutdown();

  console.log(`\n  Resultado: ${pass} correctas, ${fail} fallidas\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
