# Verificaciones

Comprobaciones de las garantías que sostienen el sistema. Corren en segundos y no
necesitan un framework de tests.

```bash
npm run check                # las tres primeras (desde server/, o --workspace=server)
npm run check:datetime       # fechas e intervalos
npm run check:core           # fugas de error y apagado ordenado
npm run check:availability   # motor de disponibilidad
npm run check:concurrency    # doble turno, con el servidor corriendo
```

| Archivo | Qué comprueba | Necesita |
|---|---|---|
| `datetime.check.ts` | Conversión de instantes al reloj del salón, resta de intervalos y generación de horarios | nada |
| `core.check.ts` | Que un error interno no filtre stack ni credenciales (§38), y que el apagado sea ordenado | nada |
| `availability.check.ts` | Que el motor de disponibilidad respete el recambio, los bloqueos y la anticipación mínima (§20) | nada |
| `booking-concurrency.check.ts` | Que veinte reservas simultáneas al mismo horario dejen una sola (§20), por la API y por SQL | servidor y base levantados |
| `booking-integrity.sql` | Que el constraint `bookings_no_overlap` impida el doble turno | Postgres levantado |

`check:concurrency` no entra en `npm run check` porque necesita el servidor
corriendo y escribe en la base. Se corre aparte, a propósito, cuando se toca algo
del camino de reserva.

### Borra lo que creó, y lo identifica por id

Corre contra la misma base que el resto del desarrollo, así que **nunca** hace un
`deleteMany({})`: se llevaría puestos los turnos que alguien haya estado cargando a
mano para probar. Borra los turnos por código y las clientas **por id** —los ids de
las que inserta ella, más los de las que quedan detrás de los turnos que reservó—,
que es lo único que puede saber con certeza que generó ella.

Por nombre estaba mal, y de las dos maneras a la vez: se llevaba puestas las
clientas de `ui-flow.mjs` —que también se llama "Prueba" su clienta de prueba— y
encima fallaba, porque esas clientas tienen turnos que esta prueba no conoce y el
`DELETE` moría con una violación de clave ajena. La comprobación final cuenta
sobrantes **entre las que borró ella** y exige que haya al menos una: contar sobre
un conjunto vacío da cero sobrantes sin haber comprobado nada.

## La verificación de turnos

Es la más importante y la única que habla directo con Postgres, salteando la API:
comprueba que la protección contra el doble turno esté en el motor y no dependa
del código de aplicación.

```bash
# bash / Git Bash
docker exec -i kaya-kalpa-db psql -U kaya -d kaya_kalpa -q \
  < server/checks/booking-integrity.sql

# PowerShell no tiene el redirector `<`, así que va por caño
Get-Content server/checks/booking-integrity.sql -Raw |
  docker exec -i kaya-kalpa-db psql -U kaya -d kaya_kalpa -q
```

Inserta turnos de prueba dentro de una transacción que termina en `ROLLBACK`: no
deja datos en la base. Si alguna comprobación falla, el script corta con error.

## Las tres mitades de la garantía de §20

La promesa "es imposible ofrecer un horario ya tomado" se sostiene en tres lugares
distintos, y cada uno tiene su verificación:

- **`availability.check.ts`** comprueba el cálculo. Que la oferta no incluya
  horarios ocupados, que el recambio bloquee lo que corresponde y que el día libre
  se calcule bien. Son funciones puras: se prueba la lógica sin base ni servidor.
- **`booking-concurrency.check.ts`** comprueba la carrera. Que veinte pedidos
  simultáneos al mismo horario dejen exactamente un turno, que los otros diecinueve
  reciban un rechazo limpio, y que el rechazo no filtre el stack ni el nombre del
  constraint.
- **`booking-integrity.sql`** comprueba el motor de base de datos. Aunque alguien
  saltee la API y escriba directo con SQL, el constraint rechaza el solapamiento.

Ninguna alcanza sola. La del cálculo no dice nada sobre qué pasa cuando dos
pedidos llegan juntos; la de la carrera no dice nada si el código dejara de
verificar —pasaría de largo, porque el constraint la taparía—; y la de SQL no dice
nada sobre lo que ve el cliente. Las tres juntas son la garantía.

> **Cuando haya un framework de tests instalado** (vitest es la opción natural
> para un proyecto Vite), los tres `.check.ts` se migran a tests sin cambiar las
> comprobaciones. Las de concurrencia y SQL conviene dejarlas como scripts: corren
> contra Postgres de verdad y eso es justamente lo que las hace valiosas.
