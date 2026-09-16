# Verificaciones del cliente

Comprobaciones que se corren **contra la aplicación andando**, no contra funciones
sueltas. Son el equivalente de `server/checks/` de este lado: verifican garantías
que solo se pueden ver con la app viva.

## `ui-flow.mjs` — el asistente de turnos, de punta a punta

```bash
# hacen falta las dos cosas levantadas
npm run dev

# en otra terminal
node client/checks/ui-flow.mjs
```

Maneja un Edge sin ventana por el protocolo de DevTools (`cdp.mjs`, sin
dependencias: Node trae `WebSocket` global). Recorre el asistente como lo haría una
persona —agregar un servicio, elegir profesional, día y horario, cargar los datos,
confirmar— y comprueba:

- que cada paso lleve al siguiente;
- **§20**: que los botones de horario dibujados sean exactamente los que devolvió
  el servidor —mismo conjunto, mismo orden, mismo texto—. Se compara contra la
  respuesta de red que recibió la propia aplicación, no contra una petición nueva:
  una petición aparte podría devolver otra cosa y entonces no probaría nada sobre
  lo que se dibujó;
- que el turno se cree y que el token de cancelación quede guardado;
- que al llegar a la confirmación el asistente se dé por terminado —carrito vacío
  y borrador descartado—. Se comprueba ahí y no antes a propósito: vaciarlos del
  lado del envío es exactamente lo que rompía la reserva (ver `CLAUDE.md`), así que
  el carrito todavía lleno en el momento de confirmar es la prueba de que la
  limpieza ocurre del lado de la confirmación;
- que se pueda cancelar desde la interfaz, y que el token se olvide después.

`KK_BROWSER` y `KK_CDP_PORT` cambian el navegador y el puerto de depuración.

### Deja resaca en la base, y está bien

Cada corrida crea una clienta y un turno de verdad, y **no los borra**: el
recorrido que verifica es el real, y el real deja registros. El turno queda
cancelado —la sección 4 lo cancela—, así que no ocupa ningún horario.

No los borra a propósito. Hacerlo exigiría darle acceso a la base a una
verificación que hoy solo maneja un navegador, y el día que esa limpieza fallara
—o borrara de más— el problema sería mucho peor que unos registros de prueba de
más. La clienta se llama `Prueba Interfaz` y el teléfono es siempre el mismo, así
que se reconocen a simple vista.

Esa resaca ya causó un problema una vez: `check:concurrency` limpiaba por nombre
(`firstName: 'Prueba'`) y se llevaba puestas estas clientas, cuyos turnos no
conocía. Ahora limpia por id, así que las dos verificaciones pueden convivir.

### Estado conocido

Las cuatro secciones pasan.
