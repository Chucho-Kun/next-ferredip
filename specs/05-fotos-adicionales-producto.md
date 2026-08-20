# SPEC 05 — Fotos adicionales con thumbnails en la página de producto

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03
> **Fecha:** 2026-08-20
> **Objetivo:** Descargar del banco de Truper hasta tres fotos secundarias por producto y mostrarlas como thumbnails bajo la foto principal, de modo que al hacer clic cada una sustituya a la principal conservando su lente de zoom y su lightbox.

## Por qué existe este spec

La página de producto muestra exactamente **una** foto por producto (`ProductCard.tsx:170`), la del
banco de Truper indexada por `clave` que trajo el SPEC 01. Para herramienta y ferretería una sola
toma no alcanza: no se ve el acabado anotado, ni las cotas, ni cómo viene empacado el producto. El
SPEC 03 ya resolvió *acercarse* a esa única foto; este spec resuelve *tener más de una*.

Las fotos ya existen y son públicas. El banco de Truper las nombra con el patrón `{CLAVE}+{SUFIJO}.jpg`,
donde el sufijo identifica el tipo de toma. Se verificó contra el sitio real:

| Sufijo | Qué muestra | Cobertura medida |
|---|---|---|
| `+FC1` | Detalle del producto con anotaciones de material y acabado | 23 de 25 claves |
| `+FC2` | Producto con cotas (largo, calibre) | 12 de 25 claves |
| `+E1` | Empaque de venta con etiqueta y código de barras | ~85 % |
| `+EIND1` | «Empaque individual» con alto, largo y peso | ~70 % |
| `+EI1` / `+EM1` | Empaque inner / master, logística de bulto | parcial |

Este spec toma las tres primeras. Las de logística (`EIND1`, `EI1`, `EM1`) sirven al mayorista, no al
comprador de la página, y agregarían ~500 MB más al repositorio.

## Alcance

**Dentro:**

- Script nuevo `scripts/download-truper-adicionales.mjs`, ejecutable con `npm run fotos:adicionales`.
- Descarga de `+FC1`, `+FC2` y `+E1` para cada `clave` de `productos_`, escritas **directamente** en
  `public/fotos/adicionales/{id}-{n}.jpg` con `n` consecutivo y sin huecos.
- Reporte `fotos-truper/_reporte_adicionales.csv` (carpeta ya ignorada por git).
- `src/utils/fotosAdicionales.ts`: helper de servidor que lista qué archivos existen para un `id`.
- `src/shared/components/ProductCardsServer.tsx`: calcula esa lista y la pasa como prop.
- `src/shared/components/ProductCard.tsx`: estado `fotoActiva` y fila de thumbnails bajo la foto,
  incluyendo la principal como primer thumbnail.
- `src/shared/components/ProductImageZoom.tsx`: la prop `id` se sustituye por `zoomSrc`, para que la
  foto ampliada ya no se derive del `id` del producto sino de la foto que está activa.
- Las fotos adicionales entran al repositorio y se commitean, como las de `public/fotos/`.

**Fuera de alcance (para specs futuros):**

- `image` como arreglo en el JSON-LD de la página de producto y `g:additional_image_link` en
  `app/feed.xml/route.ts` — el feed tendría que revisar el disco para 2171 productos por petición, y
  ese es un problema de rendimiento distinto.
- Las fotos de logística `+EIND1`, `+EI1`, `+EM1`.
- Galería en tarjetas de listado (`GroupCard.tsx`, `RelatedProducts.tsx`, `RecommendedProducts.tsx`,
  `RecentViewProducts.tsx`), en el carrito (`ProductComponent.tsx`) o en el panel de administración.
- Carrusel con flechas, swipe entre fotos, o autoplay: las thumbnails son botones, nada más.
- Conversión de estas fotos a WebP o generación de un tamaño chico aparte.
- Columna `fotos` o cualquier cambio de esquema en `productos_`.
- Mover las imágenes a un CDN (sigue pendiente desde el SPEC 01, y este spec lo hace más urgente).
- Workflow de n8n incremental para fotos de productos nuevos (pendiente desde el SPEC 01).
- Unificar el helper `fotoDe()` + `LOGO_SRC` + `onError` duplicado en 4 componentes (SPEC 01).

## Modelo de datos

Este spec **no introduce estructuras en la base de datos**. Extiende la convención de nombre de
archivo existente:

```
public/fotos/
  {id}.jpg                   <- principal grande, la que amplía el SPEC 03
  webp/{id}.webp             <- principal chica, la que se muestra hoy
  adicionales/{id}-1.jpg     <- 1ª secundaria (1800x1800, JPG tal cual)
  adicionales/{id}-2.jpg     <- 2ª secundaria, si existe
  adicionales/{id}-3.jpg     <- 3ª secundaria, si existe
```

Orden de sondeo en el banco de Truper, y por tanto orden de las thumbnails:

```
1º  https://www.truper.com/media/import/imagenes/{CLAVE}+FC1.jpg
2º  https://www.truper.com/media/import/imagenes/{CLAVE}+FC2.jpg
3º  https://www.truper.com/media/import/imagenes/{CLAVE}+E1.jpg
```

**La numeración es consecutiva, no posicional.** Si una clave tiene `FC1` y `E1` pero no `FC2`, los
archivos son `{id}-1.jpg` (FC1) y `{id}-2.jpg` (E1). Nunca hay huecos, así que el front deja de
buscar en el primer archivo ausente. La correspondencia sufijo → índice queda registrada en el CSV.

Formato de `fotos-truper/_reporte_adicionales.csv`:

```csv
id,clave,sufijo,indice,url,estado,bytes,detalle
100103,ST-724X,FC1,1,https://www.truper.com/media/import/imagenes/ST-724X+FC1.jpg,ok,313442,
100103,ST-724X,FC2,,https://www.truper.com/media/import/imagenes/ST-724X+FC2.jpg,no-encontrado,0,HTTP 404
100103,ST-724X,E1,2,https://www.truper.com/media/import/imagenes/ST-724X+E1.jpg,ok,201118,
```

Valores de `estado`: `ok`, `ok-duplicado`, `no-encontrado`, `sin-clave`, `error`, `omitido`.

Contrato entre servidor y cliente:

```ts
// src/utils/fotosAdicionales.ts  — solo se importa desde Server Components
const MAX_ADICIONALES = 3;
export function fotosAdicionalesDe(id: string): string[];
// -> ['/fotos/adicionales/100103-1.jpg', '/fotos/adicionales/100103-2.jpg']
// -> [] cuando el producto no tiene ninguna
```

Estado y estructura nuevos en `ProductCard.tsx`:

```ts
// 0 = foto principal; 1..n = posición dentro de fotosAdicionales
const [fotoActiva, setFotoActiva] = useState(0);

type FotoGaleria = {
  src: string;      // lo que ve el usuario a 366 px
  zoomSrc: string;  // lo que consume la lente / el lightbox del SPEC 03
};
// índice 0 -> { src: `/fotos/webp/${id}.webp`, zoomSrc: `/fotos/${id}.jpg` }
// índice n -> { src: `/fotos/adicionales/${id}-${n}.jpg`, zoomSrc: <la misma ruta> }
```

En las fotos adicionales `src` y `zoomSrc` son el mismo archivo de 1800×1800: `next/image` lo sirve
reescalado a 366 px para la vista normal, y la lente lo lee crudo desde `backgroundImage`, igual que
hace hoy el SPEC 03 con `/fotos/{id}.jpg`.

Constantes de la fila de thumbnails: lado de 72 px, `gap-3`, borde de 2 px
(`border-[#FF5E00]` la activa, `border-gray-200` el resto).

## Plan de implementación

1. **Arranque del script.** Añadir `"fotos:adicionales": "node --env-file=.env scripts/download-truper-adicionales.mjs"`
   a `package.json` y crear `scripts/download-truper-adicionales.mjs` con solo el reconocimiento:
   parseo de `--dry-run` / `--limit=N` / `--force`, `new Pool({ connectionString: process.env.DATABASE_URL })`,
   `SELECT id, clave FROM productos_ ORDER BY id`, agrupación por clave normalizada
   (`trim().toUpperCase()` y `/` → `-`, la lección de `redownload-truper-faltantes.mjs`), y sondeo de
   los tres sufijos con `HEAD`/`GET` sin escribir nada.
   *Verificación:* `npm run fotos:adicionales -- --dry-run --limit=50` imprime cuántas claves tienen
   0, 1, 2 y 3 fotos adicionales, y cierra el pool sin colgarse.

2. **Descarga y escritura numerada.** Reusar de `download-truper-images.mjs` la validación
   (`status === 200` + `content-type` de imagen + magic bytes `FF D8 FF`), los reintentos (3 intentos,
   esperas de 1 s y 3 s, solo ante red / timeout / `429` / `5xx`), la concurrencia de 5 y
   `AbortSignal.timeout(30000)`. Por cada clave, los sufijos que respondan 200 se escriben como
   `public/fotos/adicionales/{id}-{n}.jpg` con `n` consecutivo, replicando el buffer en cada `id` que
   comparta la clave.
   *Verificación:* `npm run fotos:adicionales -- --limit=20` deja archivos que abren en un visor y
   cuya numeración no tiene huecos.

3. **Reporte, segunda pasada y reanudable.** Escribir `fotos-truper/_reporte_adicionales.csv` con una
   fila por combinación `id`×sufijo. Al terminar la corrida, **reintentar una sola vez** las claves
   cuyos tres sufijos dieron 404, para distinguir un bloqueo transitorio de Truper de una ausencia
   real. Omitir la clave completa si `{id}-1.jpg` ya existe, salvo `--force`.
   *Verificación:* una segunda corrida sin `--force` reporta todo como `omitido` y hace cero
   peticiones HTTP; con `--force` vuelve a descargar.

4. **Detección desde el servidor.** Crear `src/utils/fotosAdicionales.ts` con `fotosAdicionalesDe(id)`
   usando `existsSync` sobre `path.join(process.cwd(), 'public/fotos/adicionales')`, cortando en el
   primer índice ausente y con tope `MAX_ADICIONALES = 3`. En `ProductCardsServer.tsx` llamarla y
   pasar `fotosAdicionales` a `ProductCard`, que de momento solo la recibe en sus `Props`.
   *Verificación:* la página de un producto con fotos y la de uno sin ellas siguen viéndose igual, y
   un `console.log` temporal en el servidor muestra el arreglo correcto en cada caso.

5. **Desacoplar el zoom del `id`.** En `ProductImageZoom.tsx`, sustituir la prop `id: string` por
   `zoomSrc: string` y usarla donde hoy se arma `` `/fotos/${id}.jpg` `` (línea 99). El resto —umbral
   de 1.2×, lente, panel de 366 px, lightbox táctil— no cambia. En `ProductCard.tsx` pasar
   `zoomSrc={`/fotos/${producto.id}.jpg`}`.
   *Verificación:* el zoom de la foto principal se comporta exactamente como antes, en escritorio y
   en el emulador táctil.

6. **Fila de thumbnails.** En `ProductCard.tsx`, construir el arreglo `FotoGaleria`, añadir el estado
   `fotoActiva` y renderizar bajo `<ProductImageZoom>` una fila `flex gap-3 mt-4 flex-wrap` de
   `<button>` de 72×72 px, solo si `fotosAdicionales.length > 0`. Cada botón lleva
   `aria-label={`Ver foto ${i + 1} de ${total}`}` y `aria-current` en la activa. `ProductImageZoom`
   recibe `key={`${producto.id}-${fotoActiva}`}` para reiniciar su estado de zoom al cambiar de foto.
   *Verificación:* hacer clic en una thumbnail cambia la foto grande, marca el borde naranja en la
   seleccionada, y la lente amplía **esa** foto, no la principal.

7. **Bordes.** `onError` de una foto adicional vuelve a `fotoActiva = 0` (el `onError` de la principal
   sigue cayendo a `/logo.webp` como hoy). `fotoActiva` se reinicia a 0 cuando cambia `producto.id`,
   dentro del mismo bloque de ajuste en render que ya existe en `ProductCard.tsx:37-40`. Quitar los
   `console.log` temporales.
   *Verificación:* `npm run lint` y `npm run build` pasan.

8. **Corrida completa.** Ejecutar `npm run fotos:adicionales`, revisar el CSV y commitear
   `public/fotos/adicionales/`.
   *Verificación:* el resumen indica cuántos productos quedaron con 0, 1, 2 y 3 fotos adicionales.

## Criterios de aceptación

- [x] `npm run fotos:adicionales -- --dry-run --limit=50` imprime el histograma de fotos por clave sin
      escribir ningún archivo.
- [x] Tras la corrida, un producto con `FC1`, `FC2` y `E1` tiene exactamente `{id}-1.jpg`,
      `{id}-2.jpg` y `{id}-3.jpg`, en ese orden de sufijos. (`100103`)
- [x] Un producto con `FC1` y `E1` pero sin `FC2` tiene `{id}-1.jpg` y `{id}-2.jpg`, **sin hueco**, y
      el CSV registra `FC2` como `no-encontrado`. (`100124`)
- [x] Cada archivo escrito empieza con los bytes `FF D8 FF` y mide 1800×1800. Verificado en una muestra
      de 200 archivos: magic bytes 100% correctos; dimensión 1800×1800 en 191/200 (95.5%) — el resto
      viene así del banco de Truper (p. ej. algunos en 1801×1801, uno en 7501×7501). No es un bug del
      script (valida magic bytes/content-type, no dimensiones) y redimensionar está fuera de alcance;
      queda anotado como variación real de la fuente.
- [x] Una clave compartida por dos `id` genera **una** petición HTTP por sufijo y **dos** archivos por
      sufijo encontrado. Verificado por revisión de código (mismo patrón que SPEC 01), no con un caso
      real: el catálogo actual no tiene ninguna clave duplicada entre `id`s.
- [x] Una segunda corrida sin `--force` hace cero peticiones HTTP; con `--force` vuelve a descargar.
- [x] `fotos-truper/_reporte_adicionales.csv` existe y `git status` no lista nada dentro de
      `fotos-truper/`.
- [x] En la página de un producto con fotos adicionales aparece bajo la foto una fila de thumbnails
      cuyo primer elemento es la foto principal.
- [x] Hacer clic en una thumbnail sustituye la foto grande por esa foto.
- [x] La thumbnail activa se distingue de las demás por el borde naranja `#FF5E00`.
- [x] Con la foto principal activa se puede volver a ella desde cualquier otra thumbnail.
- [x] En escritorio, pasar el cursor sobre una foto adicional muestra la lente y el panel de 366×366
      con **esa** foto ampliada, no con la principal.
- [x] En pantalla táctil, tocar una foto adicional abre el lightbox con esa misma foto.
- [x] Un producto **sin** fotos adicionales no muestra ninguna fila de thumbnails y se ve exactamente
      como hoy.
- [x] Cambiar de variante en el selector vuelve a la foto principal del producto nuevo y recalcula sus
      thumbnails.
- [x] Si una foto adicional falla al cargar, la vista vuelve a la principal en vez de quedar en blanco.
- [x] `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** `FC1`, `FC2` y `E1`, en ese orden. Con solo `FC1`+`FC2` la cobertura medida deja a ~52 % del
  catálogo con una sola thumbnail extra, por debajo del mínimo de dos que pide el enunciado. `E1`
  (empaque de venta) sube esa cifra a ~90 % y además ayuda a que el cliente reconozca el producto en
  el anaquel.
- **No:** `EIND1`, `EI1`, `EM1`. Son fotos de bulto para logística: interesan al mayorista, no a quien
  compra en la página, y sumarían ~500 MB al repositorio.
- **Sí:** carpeta única `public/fotos/adicionales/` con nombre plano `{id}-{n}.jpg`. Sigue la
  convención de `public/fotos/{id}.jpg` y `public/fotos/webp/{id}.webp`; una carpeta por producto
  serían ~1800 directorios nuevos que git y Finder manejan peor, sin ganancia real.
- **Sí:** nombrar por `id` aunque varias variantes compartan `clave` y el archivo se duplique. Es lo
  mismo que hizo el SPEC 01 y lo que espera todo el código que arma rutas con `{id}`; nombrar por
  clave ahorraría ~15 % de peso a cambio de que el front tenga que conocer y sanear la clave — la
  misma clave cuyos `/` provocaron los 326 `no-encontrado` del SPEC 01.
- **Sí:** guardar el JPG de 1800×1800 tal cual, sin redimensionar ni convertir. Es lo que ya hay en
  `public/fotos/`, el zoom funciona a píxel real, y evita el paso manual con `sips` que arrastran el
  SPEC 01 y el SPEC 03. El costo es peso de repositorio, anotado en «Riesgos».
- **Sí:** numeración consecutiva sin huecos en vez de índice fijo por sufijo. Permite que el servidor
  corte en el primer archivo ausente en vez de sondear siempre los tres, y que las thumbnails no
  tengan espacios vacíos.
- **Sí:** el servidor lee el disco (`existsSync`) en vez de un manifest JSON. `ProductCardsServer.tsx`
  ya es Server Component y la página es dinámica; son tres llamadas síncronas por render, y nunca
  puede desincronizarse de lo que hay en disco. Un manifest habría que regenerarlo cada vez que se
  agrega o borra una foto a mano — y en este proyecto eso pasa (`102228` del SPEC 03, los `.webp`
  sueltos de `fotos-truper/`).
- **No:** sondear desde el cliente con `onError`. Generaría 404 en cada visita a un producto sin fotos
  extra y las thumbnails aparecerían y desaparecerían durante la carga.
- **Sí:** incluir la foto principal como primer thumbnail. Sin ella no hay forma de volver a la foto
  principal salvo recargando la página.
- **Sí:** sustituir la prop `id` de `ProductImageZoom` por `zoomSrc`. Hoy el componente asume que la
  foto ampliada se llama `/fotos/{id}.jpg`; con galería esa suposición deja de ser cierta y pasarle la
  ruta explícita es más honesto que añadir un segundo camino condicional dentro del componente.
- **Sí:** `key={`${producto.id}-${fotoActiva}`}` en `ProductImageZoom`. El componente cachea la foto
  grande en `triedRef`/`zoom` y solo la carga en el primer `pointerenter`; sin remontar, al cambiar de
  thumbnail la lente seguiría mostrando la foto anterior.
- **Sí:** thumbnails horizontales debajo de la foto. La columna vertical estilo Amazon angosta la
  columna de la foto y complica la geometría del panel de zoom, que el SPEC 03 ya dibuja a la derecha
  y que en ciertos anchos se superpone a la columna de información.
- **Sí:** el script escribe directo en `public/fotos/adicionales/`. Como no hay conversión de formato
  de por medio, mandarlo a una carpeta ignorada solo agregaría un paso manual de copiar ~4000
  archivos.
- **Sí:** segunda pasada sobre las claves con los tres sufijos en 404. Durante la investigación una
  tanda de 8 claves devolvió 404 en todo y minutos después las mismas devolvieron 200: Truper
  responde 404, no 429, cuando limita. Sin esa pasada quedarían marcadas como «sin foto» claves que
  sí la tienen.
- **No:** JSON-LD con `image` como arreglo ni `g:additional_image_link` en el feed. El feed recorre
  2171 productos por petición y tendría que tocar disco para cada uno; va en su propio spec.
- **No:** carrusel, swipe o flechas. Son tres o cuatro fotos; unos botones resuelven el caso y no
  agregan una dependencia ni gestos que compitan con el lightbox táctil del SPEC 03.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Peso del repositorio: ~2.25 fotos por producto × 2171 ids × ~300 KB ≈ **1.4 GB** extra, sobre los 576 MB de `public/fotos` y los 595 MB de `.git` actuales | Aceptado por decisión explícita del usuario a cambio de calidad de zoom sin pasos manuales. Si el build o el deploy en Railway empiezan a fallar por tamaño, las dos salidas ya identificadas son redimensionar a 900×900 (baja a ~250 MB) o mover a CDN, pendiente desde el SPEC 01. |
| Clonar y desplegar el repo se vuelve notablemente más lento | Mismo origen que el anterior; se mide tras la corrida completa y, si molesta, dispara el spec de CDN. |
| Truper devuelve 404 cuando limita el tráfico, no 429, así que un bloqueo transitorio se registra como «sin foto» | Concurrencia fija de 5, User-Agent identificable, y una segunda pasada al final sobre las claves con los tres sufijos en 404. El CSV permite auditar y volver a correr solo esas. |
| `existsSync` en cada render de página de producto | Son como máximo 3 llamadas síncronas sobre archivos locales, en una página que ya hace tres consultas a Postgres. Si aparece en un perfil, se envuelve en un `Map` a nivel de módulo. |
| `process.cwd()` no apunta a la raíz del proyecto en el runtime de Railway | Se verifica en el paso 4 con un producto real desplegado. `next start` sirve desde la raíz del proyecto, igual que resuelve hoy `public/`. |
| La foto adicional pesa ~300 KB y se sirve como vista normal a 366 px | `next/image` la reescala y la entrega en AVIF/WebP según `next.config.ts`; el archivo crudo solo se descarga cuando el usuario activa la lente o el lightbox. El `Cache-Control` de `/fotos/:path*` ya cubre la carpeta nueva. |
| Las thumbnails desplazan hacia abajo el contenido de la columna izquierda | La fila es de 72 px más `mt-4`; la columna de la foto es más corta que la de información en todos los anchos actuales. Se verifica en pantalla en el paso 6. |
| Uso de imágenes de terceros | Mismo criterio del SPEC 01: Truper es el fabricante y Ferredip su distribuidor. Si Truper exige lo contrario, se retiran. |

## Lo que **no** está en este spec

- JSON-LD con varias imágenes y `g:additional_image_link` en `feed.xml`.
- Las fotos de logística `+EIND1`, `+EI1`, `+EM1`.
- Galería en tarjetas de listado, en el carrito o en el panel de administración.
- Carrusel, swipe o flechas de navegación entre fotos.
- Conversión de estas fotos a WebP o generación de un tamaño chico aparte.
- Mover las imágenes a un CDN.
- Workflow de n8n incremental para productos nuevos.
- Unificar el helper `fotoDe()` duplicado en 4 componentes.

Cada uno, si se hace, va en su propio spec.
