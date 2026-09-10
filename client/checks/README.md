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
- que se pueda cancelar desde la interfaz.

`KK_BROWSER` y `KK_CDP_PORT` cambian el navegador y el puerto de depuración.

### Estado conocido

La última sección —confirmar y llegar a `/turnos/confirmado/:code`— **falla hoy**.
El servidor crea el turno (responde 201) pero la aplicación termina en
`/turnos/servicios`. Está descrito en `CLAUDE.md`; es un bug abierto, no un
problema de esta verificación.

Las secciones 1 y 2 (el recorrido y §20) pasan.
