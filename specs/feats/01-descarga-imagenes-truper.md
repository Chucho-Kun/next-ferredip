# SPEC 01 — Descarga masiva de imágenes de producto desde el banco de Truper

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-17
> **Objetivo:** Descargar a disco local, con un script reanudable, todas las fotos de producto disponibles en el banco de imágenes de Truper, nombradas por `id` de producto, para poder poblar `public/fotos/webp/`.

## Por qué existe este spec

`public/fotos/webp/` está vacío salvo por el logo, así que **ningún producto del sitio muestra su foto**. En el front el `onError` de `ProductCard`, `GroupCard`, `ProductComponent` y `RecentViewProducts` sustituye la imagen por el logo y disimula el problema; fuera del front no hay disimulo: Mercado Pago, los correos de confirmación y el feed de Google Merchant reciben URLs que devuelven 404.

Las fotos existen y son accesibles públicamente en el banco de imágenes de Truper, indexadas por la clave de catálogo que ya guardamos en `productos_.clave`. Este spec automatiza traerlas a hosting propio en vez de hotlinkear al sitio de Truper.

## Alcance

**Dentro:**

- Script `scripts/download-truper-images.mjs`, ejecutable con `npm run fotos:truper`.
- Lee `id` y `clave` de `productos_` usando `DATABASE_URL` del `.env`, con el driver `pg` ya instalado.
- Descarga `https://www.truper.com/media/import/imagenes/{CLAVE}.jpg`, con la clave normalizada a mayúsculas y sin espacios.
- Escribe cada foto como `fotos-truper/{id}.jpg`.
- Deduplicación por clave: si varios `id` comparten `clave`, se hace **una sola** petición HTTP y el buffer se escribe en cada `{id}.jpg`.
- Reanudable: si `fotos-truper/{id}.jpg` ya existe, se salta; `--force` lo re-descarga.
- Reporte `fotos-truper/_reporte.csv` con el resultado por producto.
- Banderas `--dry-run`, `--limit=N`, `--force`.
- Entrada `fotos-truper/` en `.gitignore`.
- Corrección de las tres rutas de imagen mal formadas listadas en «Correcciones incluidas».

**Fuera de alcance (para specs futuros):**

- Conversión de JPG a WebP y copia a `public/fotos/webp/` — lo hace el usuario manualmente.
- Workflow de n8n para bajar automáticamente las fotos de productos nuevos (incremental por cron). Va en su propio spec.
- Columna `foto` en `productos_` o cualquier cambio de esquema.
- Mover las imágenes a un CDN / storage externo (R2, S3, Cloudinary) y su `remotePatterns` en `next.config.ts`.
- Unificar el helper duplicado `fotoDe()` + `LOGO_SRC` + `onError`, hoy copiado en 4 componentes (con `GroupCard.tsx:25` divergiendo a `/logo_.webp`).
- Arreglar `scripts/import-csv.ts`, que sigue roto por otras razones.
- Redimensionar, recortar o generar múltiples tamaños de imagen.

## Modelo de datos

Este spec **no introduce estructuras nuevas en la base de datos**. Solo lee `id` y `clave` de la tabla `productos_` existente.

Estructura en disco que produce:

```
fotos-truper/            <- ignorada por git
  _reporte.csv
  1001.jpg
  1002.jpg
  ...
```

Formato de `_reporte.csv` (encabezado + una fila por producto procesado):

```csv
id,clave,url,estado,bytes,detalle
1001,FGA-40P,https://www.truper.com/media/import/imagenes/FGA-40P.jpg,ok,232266,
1002,FGA-40P,https://www.truper.com/media/import/imagenes/FGA-40P.jpg,ok-duplicado,232266,copiado de 1001
1003,ZZZ-999X,https://www.truper.com/media/import/imagenes/ZZZ-999X.jpg,no-encontrado,0,HTTP 404
1004,,,sin-clave,0,clave vacia en BD
1005,ABC-1,https://www.truper.com/media/import/imagenes/ABC-1.jpg,error,0,fetch failed tras 3 intentos
1006,DEF-2,,omitido,0,archivo ya existia
```

Valores de `estado`: `ok`, `ok-duplicado`, `no-encontrado`, `sin-clave`, `error`, `omitido`.

Convenciones del script:

- Clave normalizada: `clave.trim().toUpperCase()`, luego `encodeURIComponent` para la URL.
- Una descarga se considera válida solo si se cumplen las tres: `status === 200`, `content-type` empieza con `image/`, y los primeros tres bytes son `FF D8 FF` (magic bytes JPEG).
- Reintentos: hasta 3 intentos con espera de 1 s y 3 s, **solo** ante error de red, timeout, `429` o `5xx`. Un `404` es definitivo y no se reintenta.
- Concurrencia fija de 5 peticiones simultáneas y `AbortSignal.timeout(30000)` por petición.
- Cabecera `User-Agent: ferredip-image-sync/1.0`.

## Plan de implementación

1. Añadir `fotos-truper/` a `.gitignore` y el script `"fotos:truper": "node --env-file=.env scripts/download-truper-images.mjs"` a `package.json`. Verificación: `git check-ignore -v fotos-truper` reporta la regla.
2. Crear `scripts/download-truper-images.mjs` con solo el arranque: parseo de banderas, `new Pool({ connectionString: process.env.DATABASE_URL })`, consulta `SELECT id, clave FROM productos_ ORDER BY id`, e impresión de totales (filas, claves no vacías, claves únicas, conteo por marca) antes de salir. Verificación: `npm run fotos:truper -- --dry-run` imprime los conteos y cierra el pool sin colgarse.
3. Implementar `descargarUno(clave)`: arma la URL, hace `fetch` con timeout y User-Agent, y valida status + content-type + magic bytes. Cablearla con `--limit=1`. Verificación: `npm run fotos:truper -- --limit=1` deja un `fotos-truper/{id}.jpg` que abre correctamente en un visor.
4. Añadir el bucle principal con concurrencia 5, la política de reintentos y la deduplicación por clave (mapa `clave -> Buffer` para escribir el mismo contenido en cada `id` que la comparta). Verificación: `npm run fotos:truper -- --limit=50` termina y el conteo de archivos coincide con los `ok` + `ok-duplicado` del resumen en consola.
5. Añadir la escritura de `fotos-truper/_reporte.csv` y el resumen final en consola por cada valor de `estado`. Verificación: el CSV abre en una hoja de cálculo y sus filas suman el total procesado.
6. Añadir el salto de archivos ya existentes y la bandera `--force`. Verificación: una segunda corrida sin `--force` reporta todo como `omitido` y hace cero peticiones HTTP; con `--force` vuelve a descargar.
7. Corregir las tres rutas mal formadas (ver abajo). Verificación: `npm run build` pasa y `curl localhost:3000/feed.xml | grep image_link` muestra la ruta `/fotos/webp/{id}.webp`.
8. Ejecutar la corrida completa `npm run fotos:truper` y revisar `_reporte.csv`. Verificación: el resumen indica cuántas claves no existen en el banco de Truper.

### Correcciones incluidas

| Archivo | Actual | Debe quedar |
|---|---|---|
| `app/(public)/producto/[id]/[slug]/page.tsx:123` | `https://ferredip.com.mx/webp/${id}.webp` | `https://ferredip.com.mx/fotos/webp/${id}.webp` |
| `app/feed.xml/route.ts:36` | `https://ferredip.com.mx/fotos/${product.id}.jpg` | `https://ferredip.com.mx/fotos/webp/${product.id}.webp` |
| `src/shared/components/cart/MediosdePagoComponent.tsx:48` | `/fotos/webp/${item.id}.webp` | `https://ferredip.com.mx/fotos/webp/${item.id}.webp` |

El dominio se deja hardcodeado por consistencia con `app/api/mercadopago/preference/route.ts:19` y `app/api/send-email/route.ts:76`, que ya lo hacen así. Migrar todo a `NEXT_PUBLIC_URL` es otro spec.

## Criterios de aceptación

- [ ] `npm run fotos:truper -- --dry-run` imprime el total de filas, cuántas tienen `clave` no vacía y cuántas claves únicas hay, sin descargar ningún archivo.
- [ ] `npm run fotos:truper` deja archivos `fotos-truper/{id}.jpg` cuya cantidad coincide con `ok` + `ok-duplicado` del resumen.
- [ ] Cada archivo escrito empieza con los bytes `FF D8 FF` y abre en un visor de imágenes.
- [ ] Una clave inexistente (p. ej. `ZZZ-999X`) queda registrada como `no-encontrado` en `_reporte.csv` y **no** genera ningún archivo en disco.
- [ ] Una clave compartida por dos `id` genera exactamente **una** petición HTTP y **dos** archivos.
- [ ] Una segunda corrida sin `--force` reporta todas las filas ya bajadas como `omitido`; con `--force` las vuelve a descargar.
- [ ] `fotos-truper/_reporte.csv` existe y tiene una fila por cada producto procesado más el encabezado.
- [ ] `git status` no lista nada dentro de `fotos-truper/`.
- [ ] El script termina con código de salida 0 y cierra el pool de `pg` (el proceso no queda colgado).
- [ ] `npm run build` y `npm run lint` pasan tras las correcciones de rutas.
- [ ] El JSON-LD de una página de producto contiene `https://ferredip.com.mx/fotos/webp/{id}.webp`.
- [ ] `/feed.xml` emite `g:image_link` apuntando a `/fotos/webp/{id}.webp`.

## Decisiones

- **Sí:** `.mjs` con `node --env-file=.env`. Node v22.14 trae `fetch`, `--env-file` y `AbortSignal.timeout` nativos, así que el script no agrega **ninguna** dependencia. `tsx` ni siquiera está instalado pese a que `import:csv` lo invoca — esa es probablemente parte de por qué ese script «NO FUNCIONA».
- **No:** `tsx scripts/*.ts`. Repetiría el error de `scripts/import-csv.ts`, que además olvida `import 'dotenv/config'` y por eso recibe `DATABASE_URL` undefined.
- **Sí:** guardar como `{id}.jpg`, renombrando desde la clave. Los 10+ puntos del código que arman `/fotos/webp/{id}.webp` quedan intactos; el alternativo era tocar todos esos archivos o migrar el esquema.
- **No:** columna `foto` en `productos_`. Añade una migración y un punto más de desincronización para resolver algo que la convención de nombre ya resuelve.
- **Sí:** salida a `fotos-truper/` fuera de `public/` e ignorada por git. Los JPG crudos son un artefacto intermedio; solo los `.webp` finales merecen entrar al repo y al deploy.
- **Sí:** deduplicar por clave. `clave` no es unique en el esquema y las variantes de un mismo producto comparten foto; sin dedupe se pagarían peticiones repetidas por la misma imagen.
- **Sí:** validar magic bytes además del status. Cinturón y tirantes barato: si algún día Truper mete un HTML de error con status 200, no acabamos con miles de «JPG» corruptos en disco.
- **No:** reintentar los 404. Se comprobó que Truper devuelve un 404 limpio y definitivo para claves inexistentes; reintentarlos solo alarga la corrida.
- **Sí:** concurrencia 5. Suficiente para bajar miles de imágenes en minutos sin parecer un scraper agresivo ante el Cloudflare de Truper.
- **No:** convertir a WebP dentro del script. Requeriría `sharp` (dependencia nativa pesada) y el usuario prefiere encargarse de la conversión.
- **No:** workflow de n8n en este spec. La carga inicial masiva se resuelve mejor con un script reanudable; lo incremental por cron es un problema distinto y va en su propio spec.
- **Sí:** incluir las tres correcciones de ruta. Son tres líneas y sin ellas el resultado visible del spec sería parcial: las fotos existirían pero seguirían rotas en Mercado Pago, Merchant Center y datos estructurados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cloudflare de Truper bloquea o limita la corrida masiva | Concurrencia fija de 5, User-Agent identificable y backoff ante `429`/`5xx`. El script es reanudable: si se corta, la siguiente corrida retoma donde quedó. |
| Las claves en BD no coinciden con las de Truper (espacios, guiones, sufijos de variante) | El `--dry-run` muestra claves únicas antes de descargar y `_reporte.csv` lista cada `no-encontrado`; el patrón de fallos se revisa ahí y se corrige en BD, no en el script. |
| Muchas claves sin foto en el banco | Es un resultado válido del spec, no un fallo: el reporte cuantifica exactamente cuántas faltan para decidir el siguiente paso. |
| Peso del repo al commitear miles de `.webp` en `public/fotos/webp/` | Fuera del alcance de este spec, pero se anota: si el repo crece de más, la salida es mover a CDN — el spec de storage externo ya está listado como pendiente. |
| Uso de imágenes de terceros | Truper es el fabricante y Ferredip su distribuidor; el uso de fotos de catálogo del fabricante es la práctica habitual del canal. Si Truper exige lo contrario, se retiran. |

## Lo que **no** está en este spec

- La conversión de JPG a WebP y su copia a `public/fotos/webp/`.
- El workflow de n8n para fotos de productos nuevos.
- Cualquier cambio al esquema de `productos_`.
- Mover las imágenes a un CDN o storage externo.
- Unificar el helper `fotoDe()` duplicado en 4 componentes.
- Arreglar `scripts/import-csv.ts`.

Cada uno, si se hace, va en su propio spec.
