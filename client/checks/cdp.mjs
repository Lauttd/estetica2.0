// Un cliente mínimo de DevTools Protocol para manejar Edge sin interfaz.
// Node 26 trae `WebSocket` global, así que no hace falta ninguna dependencia.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * El navegador con el que se corre. Por defecto, el Edge que ya está en Windows;
 * `KK_BROWSER` permite apuntar a otro (Chrome, o Edge en otra ruta) sin tocar el
 * archivo. Se usa un navegador instalado y no uno descargado por una dependencia
 * porque el proyecto no tiene ninguna y no vale la pena incorporar una para esto.
 */
const EDGE =
  process.env.KK_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = Number(process.env.KK_CDP_PORT ?? 9333);

export async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'kk-cdp-'));
  const proc = spawn(
    EDGE,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  // Se espera a que el puerto conteste en vez de dormir un tiempo fijo.
  const deadline = Date.now() + 30_000;
  let version = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      /* todavía no levantó */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (version === null) throw new Error('Edge no respondió en el puerto de depuración');

  const target = await (
    await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
  ).json();

  const client = await connect(target.webSocketDebuggerUrl);

  return {
    client,
    async close() {
      try {
        client.ws.close();
      } catch {
        /* ya estaba cerrado */
      }
      proc.kill();
      await new Promise((r) => setTimeout(r, 300));
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        /* el perfil queda; no es grave */
      }
    },
  };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const listeners = new Set();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== undefined) {
        const entry = pending.get(msg.id);
        if (entry === undefined) return;
        pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(`${entry.method}: ${msg.error.message}`));
        else entry.resolve(msg.result);
        return;
      }
      for (const listener of listeners) listener(msg);
    });

    ws.addEventListener('error', () => reject(new Error(`no se pudo conectar a ${url}`)));

    ws.addEventListener('open', () => {
      const send = (method, params = {}) =>
        new Promise((res, rej) => {
          const id = nextId++;
          pending.set(id, { resolve: res, reject: rej, method });
          ws.send(JSON.stringify({ id, method, params }));
        });

      resolve({
        ws,
        send,
        on: (listener) => listeners.add(listener),
        off: (listener) => listeners.delete(listener),
      });
    });
  });
}
