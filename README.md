# KAYA KALPA — Estética Profesional

Aplicación web full-stack para una estética en Formosa: sitio público con catálogo
de servicios y reserva de turnos online, más un panel administrativo para
gestionar la agenda, los precios y el contenido.

---

## Índice

- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [PostgreSQL](#postgresql)
- [Prisma y migraciones](#prisma-y-migraciones)
- [Ejecución local](#ejecución-local)
- [Frontend](#frontend)
- [Backend](#backend)
- [API](#api)
- [Build](#build)
- [Producción](#producción)
- [Datos a confirmar](#datos-a-confirmar)

---

## Arquitectura

Monorepo con **npm workspaces**. Dos paquetes y un solo `package.json` en la raíz
que orquesta a los dos:

```
estetica/
├── package.json          # workspaces + scripts de orquestación
├── docker-compose.yml    # PostgreSQL 16
├── .env                  # ÚNICO archivo de entorno, compartido con Docker
├── server/               # API REST (Express 5 + TypeScript)
│   ├── prisma/           # schema, migraciones y seed
│   ├── checks/           # verificaciones ejecutables (sin framework de tests)
│   └── src/
│       ├── config/       # entorno validado, Prisma, logger
│       ├── middlewares/  # guardas, validación, límites, errores
│       ├── modules/      # un directorio por dominio
│       ├── routes/       # montaje de todos los routers
│       └── utils/        # errores, fechas, teléfono, slug…
└── client/               # SPA (React 19 + Vite 6)
    └── src/
        ├── api/          # el único lugar que llama a fetch
        ├── components/   # ui, layout, seo y los componentes por dominio
        ├── config/       # marca, navegación, TanStack Query
        ├── pages/        # una carpeta por pantalla
        ├── routes/       # tabla de rutas y direcciones
        └── utils/
```

El backend sigue el patrón **`routes → controller → service → repository`** en
cada módulo. Los controladores nunca ven un dato sin validar: la validación ocurre
en un middleware, antes.

La decisión estructural que más explica el resto: **el cliente nunca calcula
disponibilidad**. La única fuente de horarios es `GET /api/availability`, y el
frontend dibuja lo que esa respuesta traiga, sin filtrar, reordenar ni completar.
El doble turno se evita en tres capas independientes (el motor de disponibilidad,
una reverificación dentro de la transacción de reserva con un lock por profesional
y día, y un constraint `EXCLUDE` de PostgreSQL), así que ninguna de las tres tiene
que ser perfecta por sí sola.

---

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 19, TypeScript estricto, Vite 6, React Router 7, TanStack Query 5, Tailwind CSS 4, Headless UI, react-hook-form + Zod |
| Backend | Node 20+, Express 5, TypeScript (CommonJS), Zod 3, pino, Helmet, JWT |
| Base de datos | PostgreSQL 16 (Docker), Prisma 6 |
| Autenticación | JWT de acceso (HS256, 15 min) + refresh opaco en cookie httpOnly, con rotación y revocación por familia |
| Contraseñas | `@node-rs/argon2` |

Tailwind se configura **desde CSS** (`@theme` en `client/src/styles/index.css`); no
hay `tailwind.config.js` y no hace falta.

---

## Instalación

Requisitos: **Node 20 o superior** y **Docker** (para la base).

```bash
git clone <repo> estetica
cd estetica

npm install                 # instala los dos workspaces

cp .env.example .env        # y completar los valores (ver abajo)
```

### Puesta en marcha en un paso

```bash
npm run setup
```

Equivale a `npm install && npm run db:up && npm run db:migrate && npm run db:seed`.
Al terminar quedan la base levantada, las migraciones aplicadas y el catálogo
cargado, con un usuario administrador listo para entrar al panel.

---

## Variables de entorno

Hay **un solo `.env`**, en la raíz, y lo leen tanto `docker-compose.yml` como el
servidor. Está en `.gitignore` y **nunca se commitea**: contiene las credenciales
de la base y los secretos con los que se firman las sesiones.

La plantilla completa y comentada es [`.env.example`](.env.example). Los grupos:

| Grupo | Variables | Notas |
|---|---|---|
| PostgreSQL | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Las consume `docker-compose.yml` |
| Servidor | `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `TRUST_PROXY`, `LOG_LEVEL` | |
| Base | `DATABASE_URL` | Tiene que coincidir con las `POSTGRES_*` |
| Sesiones | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_*_EXPIRES_IN` | Secretos **distintos** entre sí; la app se niega a arrancar si son iguales |
| Primer admin | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Solo los usa el seed, una vez |
| Turnos | `TZ`, `SALON_TIMEZONE`, `SLOT_GRANULARITY_MINUTES`, `MIN_LEAD_TIME_HOURS`, `MAX_ADVANCE_DAYS`, `BUFFER_MINUTES` | |

Los secretos se generan con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**La configuración se valida al arrancar** (`server/src/config/env.ts`) y el
proceso muere si algo falta o está mal escrito, con un mensaje que nombra la
variable pero nunca su valor —ese archivo puede terminar en los logs de
arranque de un hosting—.

> **Los datos de contacto no van en el `.env`.** El nombre, la dirección, el
> teléfono, el WhatsApp y las redes viven en la tabla `site_settings` y se editan
> desde el panel. Tenerlos también en el entorno crearía una segunda fuente de
> verdad: cambiar el número en el `.env` no cambiaría nada en el sitio y nadie
> entendería por qué.
>
> Por el mismo motivo, las reglas que la estética puede querer ajustar sola
> —`booking_pending_ttl_minutes`, por ejemplo— también son claves de
> `site_settings` y no variables de entorno.

> **`TRUST_PROXY`**: ponerlo en `true` **solo** si hay un proxy inverso adelante
> (Nginx, Traefik, Cloudflare, un PaaS). Sin esto, todos los pedidos parecen venir
> de la misma IP y el limitador de tasa bloquea a todos los visitantes juntos en
> cuanto uno se pasa.

---

## PostgreSQL

La base corre en Docker (`postgres:16-alpine`) con un volumen nombrado. Se eligió
volumen nombrado y no un bind mount a una carpeta de Windows porque el bind mount
degrada mucho el rendimiento de Postgres y rompe permisos.

```bash
npm run db:up      # levanta el contenedor
npm run db:down    # lo baja (conserva los datos)
npm run db:logs    # sigue los logs
```

El contenedor tiene `healthcheck` con `pg_isready`, así que `docker compose ps`
dice si está realmente listo y no solo si el proceso arrancó.

Para empezar de cero: `npm run db:reset` (borra todo y vuelve a migrar y sembrar).

---

## Prisma y migraciones

```bash
npm run db:generate         # regenera el cliente de Prisma
npm run db:migrate          # crea y aplica una migración (desarrollo)
npm run db:migrate:create   # crea la migración SIN aplicarla, para revisarla
npm run db:migrate:deploy   # aplica las pendientes (producción)
npm run db:seed             # carga el catálogo y el usuario inicial
npm run db:studio           # abre Prisma Studio
```

### ⚠️ Nunca correr `prisma db push`

`db push` hace que la base coincida con `schema.prisma`. El problema es que
**buena parte de la protección contra el doble turno no está en `schema.prisma`**:
son objetos escritos a mano en SQL dentro de una migración.

| Objeto | Dónde vive | Qué protege |
|---|---|---|
| `bookings_no_overlap` | migración `20260910171928_booking_overlap_guard` | Constraint `EXCLUDE` (GiST, parcial sobre `PENDING`/`CONFIRMED`, sobre `tstzrange(startAt, occupiedUntil, '[)')`): dos turnos del mismo profesional no pueden solaparse |
| Índices parciales | la misma migración | Turnos activos por profesional y fecha |

`db push` compara el schema contra la base, no conoce esos objetos y **los
borraría**. El resultado sería un sistema sin la última de las tres capas que
impiden el doble turno, y sin ningún error visible hasta que dos clientas reserven
el mismo horario.

El flujo correcto cuando hay que cambiar el schema:

```bash
npm run db:migrate:create   # genera el SQL sin aplicar
# revisar el archivo generado en server/prisma/migrations/<timestamp>_<nombre>/
npm run db:migrate          # aplicarlo
```

Y en producción, siempre `npm run db:migrate:deploy`, que sólo aplica lo pendiente
y nunca intenta reconciliar diferencias.

Las migraciones son **aditivas**: se corrige con una migración nueva, nunca
editando una ya aplicada.

---

## Ejecución local

```bash
npm run dev
```

Levanta las dos mitades a la vez con nombres y colores distintos en la consola:

| Proceso | Puerto | Qué hace |
|---|---|---|
| `server` | 4000 | API con recarga en caliente (`tsx watch`) |
| `client` | 5173 | Vite con HMR |

También se pueden correr por separado con `npm run dev:server` y
`npm run dev:client`.

**El cliente habla con `/api` en rutas relativas y Vite tiene un proxy hacia el
puerto 4000.** Eso no es una comodidad de desarrollo: es lo que hace que la cookie
httpOnly del panel funcione igual en desarrollo y en producción, sin CORS ni
`sameSite=None`. Una petición directa a `http://localhost:4000` desde el navegador
sería otro origen y la cookie no viajaría.

Panel administrativo: <http://localhost:5173/admin> — se entra con las credenciales
`ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`. **La primera vez obliga a cambiar la
contraseña**: la cuenta se crea con `mustChangePassword` en `true` y todas las
rutas del panel responden 403 hasta que se cambie.

### Verificaciones

No hay framework de tests instalado. En su lugar hay verificaciones ejecutables
que fallan con un código de salida distinto de cero, pensadas para correr en CI:

```bash
npm run check --workspace=server                 # fechas + núcleo + disponibilidad
npm run check:datetime --workspace=server        # convenciones de fecha y hora
npm run check:core --workspace=server            # reglas de negocio del catálogo
npm run check:availability --workspace=server    # motor de disponibilidad
npm run check:concurrency --workspace=server     # doble turno (requiere el server levantado)
```

Y los estáticos de los dos workspaces:

```bash
npm run typecheck    # tsc --noEmit en server y client
npm run lint         # ESLint en server y client
```

---

## Frontend

### Stack y convenciones

React 19 + Vite 6, React Router 7 con `createBrowserRouter`, TanStack Query 5 para
todo el estado de servidor, Tailwind 4 configurado desde CSS.

**Todas las peticiones pasan por `client/src/api/client.ts`.** Es el único archivo
del frontend que llama a `fetch`; el resto usa `apiRequest<T>()` y recibe un dato
tipado o un `ApiError`. Cada recurso tiene su envoltorio en `client/src/api/` y sus
`queryOptions` en `client/src/queries/`, con claves compartidas para que dos
componentes que piden lo mismo hagan una sola petición.

**El cliente no importa código del servidor**: arrastraría Prisma al bundle del
navegador. Los contratos se duplican a propósito (`client/src/types/`), con el
mismo comentario que explica por qué en cada archivo.

### Dinero y fechas

| Dato | Representación | Ojo con |
|---|---|---|
| Precios | Entero en **centavos** | `null` significa **"a consultar"**, distinto de `0`, que es "bonificado" |
| Instantes | UTC, `@db.Timestamptz(3)` | |
| Días de calendario | `@db.Date`, serializados como `'YYYY-MM-DD'` | **Nunca** `toISOString().slice(0,10)`: convierte a UTC y corre el día |
| Horas del día | Entero, minutos desde la medianoche del salón | |
| Día de la semana | Entero, `0` = domingo | |

### Prerenderizado

El sitio público se prerenderiza en el build: el HTML llega con contenido en vez de
un `<div>` vacío. Las rutas dependen de datos en vivo (`/turnos`) y el panel
(`/admin/*`) quedan fuera. El build **no depende de que la base esté levantada**:
si la API no responde, omite las páginas, avisa y termina bien; con
`PRERENDER_STRICT=true` falla, que es lo que conviene en CI.

---

## Backend

### Estructura de un módulo

```
modules/services/
├── services.routes.ts        # declara los endpoints y qué validación llevan
├── services.controller.ts    # lee lo validado y arma la respuesta
├── services.service.ts       # reglas de negocio
├── services.repository.ts    # acceso a datos
├── services.validation.ts    # esquemas Zod
└── services.types.ts         # tipos del dominio
```

### Validación

El middleware `validate()` escribe el resultado en **`req.validated`**, no de vuelta
en `req.body` ni `req.query`. No es capricho: en Express 5 `req.query` es un getter
sin setter, así que reasignarlo falla. Los controladores leen con
`validatedBody<T>(req)`, `validatedQuery<T>(req)` y `validatedParams<T>(req)`.

### Errores

Todo error que el cliente debe ver pasa por `AppError`
(`server/src/utils/errors.ts`). El manejador central sólo expone el mensaje de un
`AppError`; cualquier otra excepción se convierte en un 500 genérico. **Ningún
error interno sale al cliente.**

Los `code` son estables y el frontend los compara; el texto del mensaje puede
cambiar. El asistente de turnos, por ejemplo, reacciona a `SLOT_TAKEN` —no al
texto— volviendo al paso de elección de horario.

### Zona horaria

La zona que manda es la de la estética (`SALON_TIMEZONE`), no la del proceso ni la
del navegador. Todo cálculo de "qué día es" o "qué hora es" pasa por
`server/src/utils/datetime.ts`. El cliente **nunca** decide qué día es hoy para
calcular disponibilidad.

---

## API

Base: `/api`. Todas las respuestas exitosas van envueltas en `{ data, meta? }`, y
los errores en `{ error: { code, message, details?, requestId? } }`.

Límites de uso: `apiLimiter` (300 cada 15 min) en toda la API salvo `/health`;
`authLimiter` (10 intentos fallidos cada 15 min) en login, refresh y cambio de
contraseña; `bookingLimiter` (20 por hora) en las escrituras públicas;
`availabilityLimiter` (120 cada 15 min) en la consulta de disponibilidad.

### Autenticación

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión; devuelve el token de acceso y deja el refresh en una cookie httpOnly |
| POST | `/api/auth/refresh` | Renueva la sesión a partir de la cookie |
| POST | `/api/auth/logout` | Cierra la sesión y limpia la cookie |
| GET | `/api/auth/me` | Quién está detrás del token |
| PATCH | `/api/auth/change-password` | Cambia la contraseña; devuelve una sesión nueva y revoca las demás |

### Público (solo lectura)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Estado del servicio; hace `SELECT 1` contra la base |
| GET | `/api/categories` | Categorías del catálogo |
| GET | `/api/services` | Servicios, con filtros |
| GET | `/api/services/:slug` | Detalle de un servicio por slug |
| GET | `/api/professionals` | Profesionales que atienden |
| GET | `/api/availability` | **La única fuente de horarios** |
| GET | `/api/faq` | Preguntas frecuentes |
| GET | `/api/settings` | Configuración pública del sitio |
| GET | `/api/gallery` | Fotos de la galería |
| GET | `/api/schedule` | Horario de atención semanal |

### Turnos y contacto (públicos, escriben)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/bookings` | Crea un turno, sin cuenta |
| GET | `/api/bookings/:code` | Consulta un turno por su código |
| PATCH | `/api/bookings/:code/cancel` | Cancela un turno con el token que devolvió la reserva |
| POST | `/api/contact` | Mensaje del formulario de contacto |

### Panel — `/api/admin`

Todo lo de acá exige `authGuard` (401 sin token) y `requirePasswordChanged` (403
con la contraseña provisoria). Salvo el grupo **Usuarios**, todo lo puede usar un
`STAFF`.

| Área | Rutas |
|---|---|
| Turnos | `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/status` |
| Categorías | `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id` |
| Servicios | `GET/POST /services`, `GET/PATCH/DELETE /services/:id`, `PATCH /services/:id/price` |
| Profesionales | `GET/POST /professionals`, `GET/PATCH/DELETE /professionals/:id`, `PUT /professionals/:id/services` |
| Horarios | `GET/POST /business-hours`, `GET/PATCH/DELETE /business-hours/:id` |
| Bloqueos | `GET/POST /blocked-dates`, `DELETE /blocked-dates/:id`, `GET/POST /blocked-times`, `DELETE /blocked-times/:id` |
| FAQ | `GET/POST /faq`, `PATCH/DELETE /faq/:id` |
| Mensajes | `GET /contact-messages`, `GET /contact-messages/unread-count`, `PATCH /contact-messages/:id` |
| Configuración | `GET/PATCH /settings` |
| Usuarios | `GET/POST /users`, `PATCH /users/:id`, `POST /users/:id/password` — **solo ADMIN** |

Las bajas son lógicas: `DELETE` desactiva la fila, no la borra. Los turnos no se
borran nunca —pasan a `CANCELLED`— porque son el historial de la estética.

`PUT /professionals/:id/services` es `PUT` y no `PATCH` por una razón concreta:
reemplaza el conjunto completo, y así destildar un servicio tiene forma de
expresarse. Un `PATCH` no podría distinguir "no mandé ese servicio" de "lo quiero
sacar".

---

## Build

```bash
npm run build
```

Compila el servidor (`tsc`) y después el cliente (typecheck + `vite build` +
prerenderizado del sitio público).

```bash
npm run build:spa --workspace=client   # solo el cliente, sin prerenderizar
```

## Producción

```bash
npm run build
NODE_ENV=production npm start
```

El servidor compilado sirve dos cosas desde el mismo proceso: la API bajo `/api` y
el sitio compilado, que es lo que hace que no haga falta un segundo servidor web ni
resolver CORS entre el sitio y su propia API.

Antes de desplegar, revisar:

1. **`NODE_ENV=production`.** Activa `secure` en la cookie de sesión, entre otras
   cosas.
2. **`TRUST_PROXY=true`** si hay un proxy inverso adelante.
3. **`CORS_ORIGIN`** con el dominio real y no `localhost`.
4. **Secretos nuevos**, generados para producción y distintos entre sí. La
   validación rechaza los valores de ejemplo de `.env.example`.
5. **`npm run db:migrate:deploy`** contra la base de producción. Nunca
   `db push`, nunca `migrate reset`.

---

## Datos a confirmar

Buena parte del contenido todavía no lo confirmó la estética, y el proyecto tiene
una regla explícita: **no inventar datos**. Lo que falta se carga como placeholder
explícito, la interfaz lo muestra como "a confirmar" y se completa desde el panel
sin tocar código ni volver a desplegar.

El detalle completo, con el estado de cada punto, está en
[`CONFLICTOS.md`](CONFLICTOS.md): precios sin confirmar, días y horarios de
atención, fotos de la galería, logo, tipografías y las URL de las redes sociales.
#   e s t e t i c a 2 . 0  
 