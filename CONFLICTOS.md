# KAYA KALPA — Datos a confirmar y decisiones que quedaron abiertas

Este archivo existe porque `prompt.md` §41 prohíbe inventar datos: **si un dato no
está en el prompt ni en la lista de precios, no se inventa**. Se carga un
placeholder explícito, la interfaz lo muestra como "a confirmar" y el dato real se
completa desde `/admin`.

Todo lo de acá es una pregunta para la estética, no una tarea técnica pendiente.
Se van cerrando a medida que se confirman.

---

## 1. Precios: manda la lista oficial

`prompt.md` y la lista de precios de la imagen **se contradicen**. Se resolvió que
**la imagen manda en precios** y el prompt manda en nombres y descripciones; el
catálogo cargado es la unión de las dos fuentes.

Cuatro servicios tenían precio en la imagen y no en el prompt, y se cargaron con
el de la imagen:

| Servicio | Precio cargado |
|---|---|
| Dermaplaning | $38.000 |
| Peeling + Dermaplaning "Combo Glow" | $45.000 |
| Radiofrecuencia Facial y Corporal | $43.000 |
| Pedicura | $25.000 |

**A confirmar:** que estos cuatro precios sigan vigentes.

---

## 2. Servicios sin precio en ninguna de las dos fuentes

Quedaron con `priceCents = null`, que el sistema interpreta como **"a consultar"**
—distinto de `0`, que significa bonificado—:

- Tratamiento para Acné (90')
- Peeling Despigmentante (90')

Aparecen en el catálogo con "Precio a consultar" y el turno se puede reservar
igual. **A confirmar:** el precio de cada uno, o si hay que dejar de ofrecerlos.

---

## 3. La sección PIES es ambigua

Es el único grupo donde las dos fuentes no mapean 1 a 1. El prompt lista cuatro
servicios y la imagen tres, con nombres distintos:

| `prompt.md` | Imagen | Qué se cargó |
|---|---|---|
| Spa de pies (limpieza) | Pedicura | Pedicura 45' $25.000 |
| Pies con semipermanente | Pedicura + Semipermanente | Pedicura + Semipermanente 90' $30.000 |
| Spa de pies completo | Spa de Pies | Spa de Pies 90' $25.000 |
| Pedicura + esmaltado tradicional | — | Pedicura + Esmaltado Tradicional 90' $20.000 |

**A confirmar antes de publicar:** si son cuatro servicios distintos o si
"Pedicura" y "Spa de Pies" son el mismo con dos nombres. Hoy están los cuatro
cargados, y eso puede estar mostrando dos veces lo mismo.

---

## 4. Horarios de atención — placeholder

`prompt.md` no da horarios y §41 prohíbe inventarlos. El seed carga una franja
genérica **marcada como placeholder** (`hours_are_placeholder = 'true'`), y el
sitio muestra el aviso "horarios a confirmar" en lugar de afirmarlos como reales.

**A confirmar:** los horarios reales de cada día. Se cargan desde `/admin` →
Horarios, sin tocar código ni volver a desplegar.

---

## 5. Fotos — la galería arranca con placeholders

La galería tiene 8 filas cargadas apuntando a cuatro SVG botánicos en la paleta de
la marca, en `client/public/images/gallery/placeholder-{1..4}.svg`. Los cuatro
dibujos ya están hechos: son ilustraciones a línea, no fotos, y se distinguen a
simple vista de un trabajo real.

`gallery_is_placeholder = 'true'`, así que la galería se muestra con el aviso de que
las fotos están a confirmar, y **la página no afirma que esos dibujos sean
trabajos de la estética**. `prompt.md` §6 pide explícitamente no usar fotos
genéricas de calidad baja, así que no se buscaron imágenes de stock.

El reemplazo es por base de datos: se cambia el `src` de cada fila por la foto real
y se apaga la bandera. La galería no se administra desde el panel (ver el punto 9).

**A confirmar:** las fotos reales de trabajos, con la autorización de las clientas
que aparezcan.

---

## 6. Logo

El logo original todavía no está en el proyecto. El componente `<Logo />` dibuja
el wordmark tipográfico `KAYA KALPA / ESTÉTICA PROFESIONAL`, que es correcto pero
no es el logo.

Cuando el archivo esté, se deposita en `client/src/assets/logo/` y se cambia
**una sola ruta** en `client/src/config/brand.ts`. No hay que tocar componentes.

---

## 7. Redes sociales — nombre sí, URL no

Se confirmaron los nombres de las cuentas (`KAYA KALPA ESTÉTICA PROFESIONAL`) pero
**no las direcciones**. Las URL están vacías en la base y el frontend no muestra
los íconos mientras lo estén, en vez de enlazar a una página que no es.

**A confirmar:** la URL exacta del Instagram y del Facebook.

---

## 8. `booking_pending_ttl_minutes` está cargado pero no se aplica

La clave existe en la base con valor `1440` (24 h) y es editable desde el panel,
pero **ningún código la lee todavía**. En la práctica: un turno `PENDING` retiene
su horario hasta que alguien lo confirme o lo cancele, sin vencimiento automático.

Para una estética que confirma a mano es un comportamiento aceptable —el horario
no se le da a nadie más mientras tanto—, pero conviene decidirlo:

- **A)** Implementar el vencimiento: un turno sin confirmar pasado el plazo libera
  el horario solo.
- **B)** Quitar la clave y dejar el comportamiento actual, documentado.

Mientras tanto la clave queda oculta para el frontend público y anotada acá.

---

## 9. Alcance del panel: la galería no se administra

El panel cubre servicios, categorías, precios, profesionales, horarios, bloqueos,
turnos, FAQ, mensajes y configuración. **La galería es de solo lectura por API**:
no tiene CRUD.

No se construyó porque no estaba en la tabla de endpoints acordada, y porque cargar
fotos requiere decidir antes dónde se guardan los archivos (disco del servidor,
S3, Cloudinary). Mientras tanto las imágenes se cargan por base de datos.

**A confirmar:** si la estética quiere subir fotos desde el panel. Si la respuesta
es sí, hay que resolver primero el almacenamiento y después construir la pantalla.

---

## 10. Hosting sin definir

No está decidido dónde se despliega. El `README.md` documenta el build y un deploy
genérico.

Un punto que depende de esto: si va detrás de un proxy (Nginx, un PaaS, Cloudflare),
hay que activar `trust proxy` en Express. Si no, todos los pedidos parecen venir de
la misma IP y el limitador de tasa bloquea a todos los visitantes juntos en cuanto
uno se pase.

---

## 11. Tipografías: no se entregaron los archivos

El sistema visual define dos tipografías —una serif de caja alta para los títulos,
como la del material, y una sans limpia para el cuerpo— pero **los archivos no
están**. El plan pedía cargarlas self-hosted y no desde un CDN, así que no se
descargó ninguna: no corresponde elegir y bajar fuentes por cuenta propia sin que
la estética las apruebe.

Hoy el sitio se ve así, y no se ve roto:

| Rol | Fuente elegida | Lo que se usa mientras tanto |
|---|---|---|
| Títulos | Cormorant Garamond o Cinzel | Georgia |
| Cuerpo | Inter | La sans del sistema (Segoe UI en Windows, San Francisco en Apple) |

Georgia no es un relleno incómodo: es una serif con autoridad y funciona bien en
títulos. El sitio es presentable desde ahora.

**Para reemplazarlas** alcanza con dejar los archivos en
`client/src/assets/fonts/` y declarar los `@font-face` al principio de
`client/src/styles/index.css`. Las pilas de fuentes ya nombran a esas familias
como primera opción, así que empiezan a usarse solas: no hay que tocar ningún
componente.

**A confirmar:** qué tipografías usar. Si la estética no tiene preferencia,
conviene aprobar las dos propuestas (Cormorant Garamond + Inter son gratuitas y de
uso libre) antes de bajarlas.

---

## 12. La moneda: el cliente la asume, el servidor no la manda

`BookingServiceLine` —lo que devuelve `POST /api/bookings` y la consulta por
código— lleva `serviceId`, `name`, `priceCents` y `durationMin`, pero **no la
moneda**. Las pantallas que muestran el total de un turno ya reservado no tienen
de dónde sacarla.

Hoy usan `DEFAULT_CURRENCY = 'ARS'` (`client/src/utils/money.ts`). No es un dato
inventado: `Service.currency` tiene `@default("ARS")` en el schema y ninguna
pantalla del panel lo cambia, así que **hoy** el valor es correcto por
construcción. Pero es una suposición del cliente sobre un dato del servidor, y
eso es deuda.

**Cuándo deja de ser cierto:** si alguna vez se carga un servicio en otra moneda.
`BookingService` guarda copia de nombre, precio y duración para que los turnos ya
tomados conserven lo que decían; la moneda no se guarda, así que un turno viejo se
mostraría con la moneda nueva.

**Arreglo:** agregar `currencySnapshot` a `BookingService` (o devolver la moneda
en `BookingServiceLine`) y que el cliente la lea de ahí. Requiere migración.
Mientras tanto, si se carga un servicio en otra moneda, arreglar esto **antes**.

---

## 13. El dominio del sitio no está definido

§37 pide Open Graph, y dos de esas etiquetas —el `canonical` y el `og:image`— tienen
que ser **direcciones absolutas**: quien las lee es el servidor de WhatsApp o de
Facebook, que no tiene forma de saber desde qué página se compartió el enlace.

El dominio todavía no está. Lo único que se sabe es que **no** es
`localhost:5173`, y un dominio inventado en un `canonical` es peor que no tener
`canonical`: le dice al buscador que la página buena vive en otro lado.

Mientras tanto el sitio no emite ninguna de las dos, y eso está bien: la vista
previa de un enlace compartido sale con el título y la descripción, que es lo que
WhatsApp —el canal por el que más se va a compartir esto— muestra igual.

**Para activarlas** alcanza con cargar una línea en el `.env` de la raíz:

```
VITE_SITE_URL=https://kayakalpa.com.ar
```

Con protocolo y sin barra final (la barra se saca sola si está). A partir de ahí,
cada página emite su `canonical` y, cuando el servicio tenga foto cargada, su
`og:image`. El `og:image` de la ficha de un servicio sale de `Service.image`, que
hoy está en `null` para todo el catálogo: se completa desde `/admin`.

**A confirmar:** el dominio definitivo. Depende de dónde se despliegue (ver el
punto 10).

---

## 14. El mapa de Google y la política de seguridad del contenido

La página de contacto muestra un mapa con el iframe `output=embed` de Google Maps.
Es la variante que **no pide clave de API**, que es lo que §39 exige: ninguna
credencial en el frontend.

El costo es una dependencia de terceros que hay que declarar cuando se escriba la
política de seguridad del contenido (Fase 9):

```
frame-src https://www.google.com;
```

Sin esa línea el navegador bloquea el iframe y el mapa queda en blanco, sin ningún
error visible más que un mensaje en la consola del navegador. Si el día de mañana
la estética prefiere no depender de Google, la alternativa es una imagen estática
del mapa con un enlace para abrirlo, que no necesita ninguna regla.
