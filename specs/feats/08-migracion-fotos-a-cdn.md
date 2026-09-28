# SPEC 08 — Migración de las fotos de producto a Cloudflare R2

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 03, SPEC 05
> **Fecha:** 2026-08-24
> **Objetivo:** Sacar los 2 GB de fotos de producto del repositorio hacia un bucket de Cloudflare R2 servido desde `cdn.ferredip.com.mx`, con tamaños pregenerados que eliminen por completo las invocaciones a `sharp` en Railway, conservando las URLs indexadas mediante redirects 301 en el edge.

## Por qué existe este spec

El SPEC 01 trajo 2 171 fotos principales del banco de Truper a `public/fotos/webp/`. El SPEC 03 exigió, para la lente de zoom, el original de 1800×1800 en `public/fotos/{id}.jpg`. El SPEC 05 sumó hasta tres fotos adicionales por producto en `public/fotos/adicionales/{id}-{n}.jpg` y dejó escrito, como pendiente explícito, «mover las imágenes a un CDN». Hoy el peso real es:

| Carpeta | Peso | Archivos | ¿Pasa por `/_next/image`? |
|---|---|---|---|
| `public/fotos/*.jpg` | 536 MB | 2 171 | No — `<img>` plano en `ProductImageZoom.tsx` (el zoom necesita el original) |
| `public/fotos/adicionales/*.jpg` | 1 516 MB | 5 088 | Sí — foto principal (366 px) y thumbnails (72 px) |
| `public/fotos/webp/*.webp` | 29 MB | 2 171 | Sí |

Los tres se despliegan enteros en cada build de Railway. La nota de memory leak del 2026-08-24 en `CLAUDE.md` documenta el síntoma: la memoria del servicio sube en escalera de ~600 MB a >1.5 GB durante ráfagas de crawl de Googlebot y nunca vuelve a bajar. La causa no es un leak de heap de JS: es `sharp`/libvips decodificando en memoria originales de 1800×1800 en cada cache-miss de `/_next/image`, sin límite de operaciones concurrentes entre requests distintos, agravado por la fragmentación de malloc de glibc en contenedores Linux que impide que esa memoria nativa se devuelva al SO. El fix ya aplicado en `next.config.ts` (solo WebP, una sola calidad, `imgOptConcurrency: 1`, `minimumCacheTTL` de 30 días) mitigó la combinatoria de variantes, pero mientras el optimizador siga recibiendo originales de 1800×1800 el techo de memoria por operación sigue siendo el mismo.

Un dato que corrige la premisa original: **`app/products.xml/route.ts` no contiene ninguna imagen** — es un sitemap de URLs de producto (`<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`), sin ninguna etiqueta de imagen. El único lugar donde una URL de foto se publica hacia Google es `app/feed.xml/route.ts` (`g:image_link`, consumido por Google Merchant Center) y el JSON-LD/OpenGraph de `app/(public)/producto/[id]/[slug]/page.tsx`. La preocupación de SEO de este spec se resuelve ahí y con redirects 301 para las URLs ya indexadas por Google Images, no tocando `products.xml`.

## Alcance

**Dentro:**

- Bucket R2 `ferredip-fotos`, con dominio público `cdn.ferredip.com.mx` (custom domain conectado en el dashboard de Cloudflare, ya que el DNS del dominio vive ahí).
- Script nuevo `scripts/subir-fotos-r2.mjs`, ejecutable con `npm run fotos:r2`: genera las variantes con `sharp` y las sube a R2 con `@aws-sdk/client-s3`. Reanudable (`--force`, `--dry-run`, `--limit=N`), con reporte `fotos-truper/_reporte_r2.csv`, siguiendo el patrón ya usado por `scripts/download-truper-images.mjs`.
- Manifiesto `src/shared/db/fotos-adicionales.json`, generado por ese mismo script.
- Helper nuevo `src/utils/fotos.ts`, único constructor de rutas de foto del proyecto.
- Migrar a ese helper los 13 lugares que hoy construyen una ruta de foto: `ProductCard.tsx`, `GroupCard.tsx`, `RecentViewProducts.tsx`, `RelatedProducts.tsx`, `RecommendedProducts.tsx`, `cart/ProductComponent.tsx`, `cart/MediosdePagoComponent.tsx`, `dashboard/{LeftPanel,CenterPanel,RightPanel}.tsx`, `app/feed.xml/route.ts`, `app/(public)/producto/[id]/[slug]/page.tsx`, `app/api/mercadopago/preference/route.ts`, `app/api/send-email/route.ts`.
- `next.config.ts`: quitar el header `Cache-Control` de `/fotos/:path*` (queda sin propósito, R2 sirve sus propios headers de caché).
- `unoptimized` en todo `<Image>` que reciba una URL del CDN.
- Sacar `public/fotos/` del control de versiones (`git rm -r --cached`) y agregarlo a `.gitignore`; mover el contenido actual a `fotos-truper/` como respaldo local.
- Redirect Rule 301 en el dashboard de Cloudflare para las URLs `/fotos/*` ya indexadas, documentada en este spec (no versionada en el repo).
- Cambiar el destino de escritura de `scripts/download-truper-adicionales.mjs` de `public/fotos/adicionales/` a `fotos-truper/adicionales/`, para que el pipeline de descarga de Truper siga alimentando a `subir-fotos-r2.mjs` en vez de volver a escribir dentro de `public/`.

**Fuera de alcance (para specs futuros):**

- Reescribir la historia de git para recuperar los ~2 GB que ya pesa `.git` (BFG / `git filter-repo`). Se documenta como riesgo aceptado, no se ejecuta en este spec.
- `<image:image>` en `products.xml` y `g:additional_image_link` en `feed.xml` (galería completa en el feed de Merchant Center).
- Cloudflare Image Transformations o cualquier redimensionado on-the-fly: los tamaños se pregeneran una sola vez.
- Mover al CDN el resto de `public/` (sliders, catálogos, logos de marca, imágenes de categoría) — solo las fotos de producto.
- Migrar los dominios hardcodeados `https://ferredip.com.mx` (en `feed.xml`, `preference/route.ts`, `send-email/route.ts`) a `NEXT_PUBLIC_URL`.
- Workflow de n8n para descarga incremental de fotos de productos nuevos (pendiente desde el SPEC 01).
- `MALLOC_ARENA_MAX=2` y cualquier límite de memoria/restart policy del servicio en Railway — son configuración de infraestructura, no de este repo.
- Autenticación de `app/(admin)/`.

## Modelo de datos

**Esquema de objetos en R2** — se conservan las tres rutas que ya existen hoy, para que la Redirect Rule sea una sola regla con comodín y cada URL indexada caiga en un archivo real:

| Objeto en R2 | Qué es | ¿Existía esta ruta antes? |
|---|---|---|
| `fotos/{id}.jpg` | original 1800×1800, lo consume la lente de zoom | sí |
| `fotos/webp/{id}.webp` | principal, 800 px | sí (antes era 1800 px) |
| `fotos/webp/160/{id}.webp` | principal, 160 px, para los thumbnails | no |
| `fotos/adicionales/{id}-{n}.jpg` | adicional original 1800×1800, para el zoom | sí |
| `fotos/adicionales/webp/{id}-{n}.webp` | adicional, 800 px | no |
| `fotos/adicionales/webp/160/{id}-{n}.webp` | adicional, 160 px | no |

Toda subida lleva `Cache-Control: public, max-age=31536000, immutable` (las fotos no cambian sin una corrida nueva del script) y el `Content-Type` correcto (`image/jpeg` / `image/webp`).

Peso estimado del bucket: ~2.6 GB (2.05 GB de originales sin tocar + ~500 MB de variantes 800/160), dentro de los 10 GB gratis de R2. El objetivo de este spec no es ahorrar storage — es sacar esos 2 GB del repositorio y de cada build de Railway.

**Manifiesto** `src/shared/db/fotos-adicionales.json` — mapa `id → cantidad de fotos adicionales`, solo con los ids que tienen al menos una (≈2 100 entradas, unos 25 KB):

```json
{ "100103": 3, "100124": 2, "100125": 1 }
```

Sustituye al `existsSync` de `src/utils/fotosAdicionales.ts`, que deja de tener sentido en cuanto los archivos no viven en el disco del contenedor. Se commitea como cualquier otro archivo de datos estático del repo (mismo patrón que `db/marcas.ts` o `db/productos.ts`) y se regenera cada vez que corre `npm run fotos:r2`.

**Variables de entorno nuevas** — `NEXT_PUBLIC_CDN_URL` en `.env` y en Railway; las otras cuatro solo en `.env`, las usa el script de subida:

```
NEXT_PUBLIC_CDN_URL=https://cdn.ferredip.com.mx
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ferredip-fotos
```

**API de `src/utils/fotos.ts`** — reemplaza el `fotoDe()` + `LOGO_SRC` hoy duplicado en `ProductCard.tsx`, `GroupCard.tsx`, `RecentViewProducts.tsx` y `cart/ProductComponent.tsx`:

```ts
export const LOGO_SRC = '/logo.webp'; // sigue siendo un asset local

export function fotoPrincipal(id: string): string;       // {CDN}/fotos/webp/{id}.webp — 800px
export function fotoPrincipalThumb(id: string): string;   // {CDN}/fotos/webp/160/{id}.webp
export function fotoPrincipalZoom(id: string): string;    // {CDN}/fotos/{id}.jpg — original

export type FotoAdicional = { src: string; thumb: string; zoom: string };
export function fotosAdicionalesDe(id: string): FotoAdicional[]; // lee el manifiesto, no el disco
```

Al no depender de `node:fs`, deja de ser server-only: funciona igual importado desde un componente de cliente (`ProductCard.tsx`) que desde uno de servidor (`ProductCardsServer.tsx`, `feed.xml`, `send-email/route.ts`).

## Plan de implementación

1. **Bucket y dominio.** Crear el bucket `ferredip-fotos` en R2, conectar `cdn.ferredip.com.mx` como custom domain, generar el token con permisos S3 y llenar las cinco variables en `.env`. Verificar subiendo un archivo de prueba a mano y pidiéndolo por HTTPS. El sitio sigue funcionando exactamente igual — nada del código cambia todavía.
2. **Script de subida.** Escribir `scripts/subir-fotos-r2.mjs` y `npm run fotos:r2`, agregar `sharp` y `@aws-sdk/client-s3` como devDependencies. Probar primero con `--dry-run`, luego con `--limit=20` contra el bucket real. El front sigue sirviendo desde `public/` sin cambios.
3. **Corrida completa.** Subir las 2 171 fotos principales (original + 800 + 160) y las 5 088 adicionales (original + 800 + 160), ~15 000 objetos en total. Generar y commitear `src/shared/db/fotos-adicionales.json`. Revisar `fotos-truper/_reporte_r2.csv` para confirmar que no quedaron fallidos.
4. **Helper.** Crear `src/utils/fotos.ts` con la API de arriba; borrar `src/utils/fotosAdicionales.ts`.
5. **Front.** Migrar los 13 archivos listados en el alcance para que usen el helper en vez de construir rutas locales, agregando `unoptimized` a cada `<Image>` que ahora apunte al CDN. `ProductCardsServer.tsx` sigue calculando la lista de adicionales y pasándola como prop, ahora leída del manifiesto en vez de `existsSync`. `ProductCard.tsx` usa la variante `thumb` (160 px) en los botones de la galería y `src`/`fotoPrincipal` (800 px) en la foto grande. Verificar en `npm run dev`, con las herramientas de red del navegador, que ninguna foto de producto sale por `/_next/image`.
6. **Salida del repo.** `git rm -r --cached public/fotos`, agregar `/public/fotos` a `.gitignore`, mover el contenido actual de esa carpeta a `fotos-truper/` como respaldo, quitar el header muerto de `next.config.ts`, y cambiar el destino de escritura de `download-truper-adicionales.mjs`. Correr `npm run build` y un arranque limpio para confirmar que nada depende ya de `public/fotos/`.
7. **Redirect y despliegue.** Crear en Cloudflare la Redirect Rule 301 `/fotos/*` → `https://cdn.ferredip.com.mx/fotos/$1`, agregar `NEXT_PUBLIC_CDN_URL` en las variables de entorno de Railway, desplegar, y verificar con `curl -I` que una URL vieja conocida responde 301 hacia un objeto que existe en el CDN.

## Criterios de aceptación

- [ ] `https://cdn.ferredip.com.mx/fotos/webp/100103.webp` responde 200 y pesa menos de 100 KB.
- [ ] `curl -I https://ferredip.com.mx/fotos/webp/100103.webp` responde 301 hacia el CDN, y esa URL de destino responde 200.
- [ ] Lo mismo se cumple para `/fotos/100103.jpg` y `/fotos/adicionales/100103-1.jpg`.
- [ ] `git ls-files public/fotos | wc -l` devuelve 0, y el peso versionado del repo cae por debajo de 100 MB.
- [ ] `npm run build` termina sin errores y ninguna ruta de imagen queda rota.
- [ ] En la página de producto, el panel de red del navegador no muestra ninguna petición a `/_next/image` para fotos de producto.
- [ ] La galería de thumbnails del SPEC 05 muestra el número correcto de fotos por producto (3 en un producto con las tres, 0 en uno sin adicionales), leyendo el manifiesto, sin thumbnails rotos.
- [ ] La lente de zoom y el lightbox del SPEC 03 siguen usando el original de 1800×1800 servido desde el CDN.
- [ ] `feed.xml`, el JSON-LD y el OpenGraph de la página de producto devuelven URLs de `cdn.ferredip.com.mx`, y esas URLs responden 200.
- [ ] El correo de confirmación de compra y el `picture_url` enviado a Mercado Pago muestran la foto correcta desde el CDN.
- [ ] Un producto sin foto sigue cayendo al logo local (`LOGO_SRC`) vía `onError`, igual que hoy.
- [ ] Transcurridas 24 horas de tráfico normal (incluido crawl de bots) tras el despliegue, la memoria del servicio en Railway no repite el patrón de escalera sin bajar.
- [ ] Google Merchant Center no reporta errores nuevos de `image_link` a las 72 horas del despliegue.

## Decisiones tomadas y descartadas

- **Storage: Cloudflare R2 con dominio propio, no Cloudflare Images ni Bunny.net.** R2 tiene egress gratis siempre y un free tier de 10 GB que cubre el bucket completo estimado (~2.6 GB); su API S3-compatible permite reusar el mismo patrón de script que ya usan `download-truper-images.mjs`/`download-truper-adicionales.mjs`. Se descartó Cloudflare Images por su costo recurrente y por imponer un esquema de URLs propio distinto al que usa hoy el sitio; se descartó Bunny.net por no tener free tier de almacenamiento y por su API propia (no S3), que hubiera exigido un cliente distinto al del resto del pipeline de imágenes del proyecto.
- **Las tres carpetas (`fotos/`, `fotos/webp/`, `fotos/adicionales/`) salen del repo, no solo una parte.** Dejar cualquiera de las tres localmente habría dejado el criterio de servido de fotos «mitad aquí, mitad en el CDN», con dos rutas de mantenimiento distintas para el mismo tipo de dato. Sacar las tres deja un solo helper y un solo pipeline de subida.
- **Servido con `unoptimized` y tamaños pregenerados, no `remotePatterns` a secas.** Apuntar `next/image` al CDN sin más habría resuelto el peso del repo pero no el problema real: `sharp` seguiría decodificando el original de 1800×1800 en cada cache-miss dentro de Railway. Pregenerar 800/160 en el momento de subir y marcar `unoptimized` saca a `sharp` por completo del contenedor de producción.
- **No se declara `remotePatterns` para `cdn.ferredip.com.mx`.** Es deliberado: sin esa entrada, cualquier `<Image>` que apunte al CDN y olvide `unoptimized` falla en desarrollo en vez de invocar a `sharp` en silencio en producción. Es la red de seguridad que impide reintroducir el problema de memoria por descuido.
- **`unoptimized` se aplica por componente, no `images.unoptimized: true` global.** El resto de `public/` (sliders, logos de marca, imágenes de categoría) sigue siendo local, son pocos archivos, y sí se benefician del optimizador — incluido el slider de home, sensible al LCP.
- **Historia de git: `git rm` + `.gitignore`, sin reescribir.** Resuelve el problema real (peso del build/deploy en Railway) sin la irreversibilidad de un `git filter-repo`/BFG, que además exigiría que cualquier clon existente del repo se rehaga desde cero. Queda documentado como riesgo aceptado, no resuelto.
- **URLs viejas: Redirect Rule 301 en el edge de Cloudflare, no `redirects()` en `next.config.ts`.** Resuelta en el edge, nunca despierta al servidor de Next en Railway — justo el tipo de tráfico de bot que se quiere sacar del contenedor. Vive fuera del repo, por lo que queda documentada aquí explícitamente para no perderla.
- **`products.xml` no se toca.** No contiene imágenes hoy; agregar un sitemap de imágenes (`<image:image>`) es una mejora de descubrimiento independiente y queda fuera de este spec. La señal de recrawl para las fotos ya migradas la dan los redirects 301, el feed y el JSON-LD.
- **Conteo de adicionales: manifiesto JSON commiteado, no columna en `productos_` ni asumir siempre 3.** Un `readdir` en build ya no es posible sin los archivos en el repo, y consultar R2 en cada request de la página de producto o del feed metería latencia de red evitable. Se descartó la columna en `productos_` por no ser necesaria: el manifiesto ya resuelve la consulta sin tocar el schema del catálogo.
- **URL base vía `NEXT_PUBLIC_CDN_URL` y un helper único, no dominio hardcodeado.** Permite apuntar a otro bucket o revertir sin tocar código, y de paso unifica el `fotoDe()`/`LOGO_SRC` duplicado en 6 componentes, pendiente desde el SPEC 01.
- **Tamaños: 800 px + 160 px + original, no una escalera de 4 tamaños ni un solo tamaño visible.** 800 px cubre la foto principal (366 px CSS, hasta 2x) y el ancho de las tarjetas de listado en móvil; 160 px cubre los thumbnails de 72 px en pantallas retina. Una escalera más larga (400/800/1600) cuadruplicaría los ~15 000 archivos a generar y subir por una ganancia marginal.
- **Formato: WebP en las variantes visibles, JPG en el original del zoom — no AVIF ni `<picture>` con doble formato.** AVIF es justo el códec que se quitó del optimizador en el fix de memoria del 2026-08-24 por ser el más caro de codificar; no tiene sentido reintroducirlo en un script batch. Doble formato con `<picture>` duplicaría archivos y complejidad del componente sin necesidad, dado que WebP ya cubre navegadores modernos.
- **Herramientas: `sharp` (devDependency) + `@aws-sdk/client-s3`, no `sips`+`wrangler` ni `sharp`+`rclone`.** `sharp` corre solo en la máquina de quien ejecuta el script, nunca en el contenedor de Railway, así que no reintroduce el problema de memoria. `sips` en macOS 12 no exporta WebP de forma confiable y `wrangler r2 object put` sube archivo por archivo, demasiado lento para ~15 000 objetos. `rclone` habría exigido instalar y configurar una herramienta externa al repo sin necesidad, cuando el SDK de AWS ya cubre subida masiva con el mismo lenguaje del resto del proyecto.
- **Los originales locales se mueven a `fotos-truper/`, no se borran ni se dejan en `public/fotos/` ignorados.** Sirven de respaldo si hace falta regenerar variantes sin volver a descargar de R2 o de Truper. Dejarlos en `public/fotos/` solo ignorados por git habría sido más simple, pero en local seguirían resolviendo rutas que en producción ya no existen, ocultando errores de migración incompleta.

## Riesgos identificados

- **Ventana de reindexado de Google Images.** Un 301 conserva la señal de posicionamiento pero no es instantáneo; puede tomar semanas. Mitigación: no borrar nunca la Redirect Rule una vez creada.
- **Recrawl de Merchant Center.** Cambiar `image_link` para 2 171 productos de una sola vez dispara una revalidación masiva; si el CDN devolviera 403/404 en ese momento, el feed quedaría con productos desaprobados. Mitigación: verificar 200 sobre una muestra representativa antes del paso 7 del plan.
- **La Redirect Rule vive fuera del repo.** No aparece en ningún code review y un cambio accidental en el dashboard de Cloudflare puede borrarla sin dejar rastro en el historial de git. Mitigación: queda documentada literalmente en este spec.
- **El manifiesto se puede desincronizar del bucket.** Si alguien sube fotos a R2 sin volver a correr `npm run fotos:r2`, la galería mostraría de menos o apuntaría a objetos inexistentes. Mitigación: el script siempre reescribe el manifiesto completo; no hay una vía de subida manual fuera de él.
- **`public/fotos/` ignorada pero con residuos en disco local.** Si alguna ruta antigua sobrevive al paso 5 del plan, en la máquina de desarrollo seguiría resolviendo mientras que en producción daría 404 — un desajuste difícil de notar. Mitigación: por eso los archivos se mueven a `fotos-truper/` en vez de quedarse en su lugar solo ignorados.
- **Objetos huérfanos en R2.** Sin una política de borrado, cada corrida futura del script podría acumular variantes de fotos que ya no correspondan a ningún producto activo. Riesgo bajo dado el free tier de 10 GB, pero queda anotado para cuando el catálogo crezca.
- **La memoria de Railway podría no bajar del todo incluso tras esta migración.** Si el patrón persistiera, las mitigaciones que quedan fuera de alcance de este spec son `MALLOC_ARENA_MAX=2` (fragmentación de malloc de glibc) y un límite explícito de memoria/restart policy en el servicio de Railway.
