# SPEC 03 — Reducción de consumo de memoria en Railway

> **Status:** Approved
> **Depends on:** Ninguno
> **Date:** 2026-08-05
> **Objective:** Reducir el consumo de memoria en producción del servicio `next-dipemsa-web` en Railway ajustando caché de Next.js, optimización de imágenes y queries sin caché, sin cambiar funcionalidad visible para el usuario.

## Diagnóstico

Datos de costos de Railway (mes de 31 días): memoria $4.70 (67% del costo total, 20,320 GB-min), CPU $0.05 (113.63 vCPU-min, prácticamente nulo), egress $2.20, volumen $0.03. La gráfica de "Memory usage" por servicio confirma que el consumo es casi en su totalidad del servicio `next-dipemsa-web` (Postgres es plano/despreciable en esa gráfica), con un patrón de piso creciente (~200MB → ~400-500MB) intercalado con picos repetidos hasta 1.0-1.1GB.

Hallazgos de la investigación del código:

1. **Causa principal probable:** el 26 may se agregó a `next.config.ts` un fix explícito (`cacheHandler: undefined`, `cacheMaxMemorySize: 0`) con el comentario "Solución temporal para el LRUCache" — deshabilitaba el caché en memoria (Full Route Cache / Data Cache) de Next.js. El 13 jul, en el commit "new products", esas líneas quedaron comentadas (revertidas) sin explicación clara — el usuario reporta que coincidió con logs de "cierre inesperado en la consulta a la base de datos", pero ese problema ya tiene su propio mitigante (`pool.on('error')` en `src/shared/db/index.ts`), sin evidencia de relación causal con el caché. El caché LRU en memoria está activo de nuevo hoy, lo que coincide con el patrón de piso creciente en la gráfica de memoria.
2. **Optimización de imágenes sin restricción:** `next.config.ts` tiene `remotePatterns: { hostname: '**' }`, pero ninguna imagen en el código usa una URL remota — todas vienen de `/public/fotos/` (1056 imágenes, 35MB), `/public/icons/` y assets estáticos. El patrón `'**'` deja abierto el optimizador de imágenes (`sharp`, en runtime) a cualquier host externo sin necesidad real, y el array `qualities: [75, 85, 90, 100]` amplía innecesariamente las combinaciones de caché cuando en el código solo se usa `85` explícitamente (`ProductCard.tsx:179`) además del valor por defecto.
3. **Queries sin caché en rutas de feeds:** `app/feed.xml/route.ts` y `app/products.xml/route.ts` llaman a `getAllProductosXML()` (sin `limit`, sin paginar) en cada request, sin ningún `revalidate`. La tabla `productos_` es pequeña (437 filas, 400KB), así que esto no es la causa principal de memoria, pero cada hit de un bot/crawler dispara una query nueva y construcción de XML sin necesidad.
4. **Descartado como causa:** el pool de PostgreSQL (`src/shared/db/index.ts`) está bien configurado (`max: 8`, `idleTimeoutMillis`, listener de error) — no hay evidencia de fuga ahí. No se encontraron `setInterval`/`addEventListener` sin limpiar ni cachés module-level (`Map` global) en el código de la aplicación.
5. **Configuración de Railway:** el usuario confirmó 1 sola réplica del servicio, siempre activa (sin "sleep on idle"), lo que — dado el CPU casi nulo — implica pagar memoria base 24/7 aunque el tráfico real sea bajo.
6. **Egress sin caché en imágenes servidas directo (hallazgo posterior, del análisis de las gráficas de "Public Network Traffic" del mes pasado):** las imágenes optimizadas vía `next/image` (`/_next/image?...`) sí cachean 4h (`Cache-Control: max-age=14400`), pero las imágenes servidas directo desde `/public/fotos/*.webp` (sin pasar por el optimizador) responden `Cache-Control: public, max-age=0` — sin caché alguno. Ese path directo es justo el que usan `app/feed.xml/route.ts` y `app/products.xml/route.ts` en `<g:image_link>` para Google Merchant Center, así que cada recorrido del bot de Google Shopping sobre las 437 imágenes del catálogo se sirve sin ningún caché de por medio. Esto coincide con las ráfagas de egress muy frecuentes observadas en la gráfica del mes pasado.
7. **Corrección: "CPU casi nulo" no significa "tráfico bajo" (hallazgo del panel "Requests" de 30 días de Railway):** el proyecto recibió 787.7k requests en 30 días (~26,200/día en promedio, picos de hasta 34.4k en un solo día) — nada despreciable. Lo que sí es bajo es el costo de CPU por request (~8.6ms de CPU por request en promedio: `113.63 vCPU-min × 60 / 787,700`), consistente con que la mayoría de esas requests son baratas de procesar (imágenes estáticas, feeds XML, assets), no renderizado SSR pesado — ver punto 9 sobre a quién corresponde ese volumen. Esto matiza el punto 5: la justificación para "sleep on idle" sigue siendo válida (CPU real es bajo), pero el ahorro esperado es más incierto de lo planteado originalmente, porque con un patrón de tráfico tan disparejo entre días, el servicio podría no acumular fácilmente los 10 minutos sin tráfico saliente que Railway requiere para dormirlo en los días de mayor actividad.
8. **Evidencia de cold starts ya presentes hoy, sin haber activado "sleep on idle" (panel "Response Time" de 30 días):** el p99 de tiempo de respuesta se dispara a 6-7+ segundos exactamente en los momentos que coinciden con los deploys (líneas punteadas verticales en las gráficas de Railway). Esto es consistente con que el servicio web no tiene volumen persistente (a diferencia de Postgres), así que el caché en disco de `next/image` se pierde en cada deploy y debe reconstruirse desde cero. El "Request Error Rate" se mantiene en 0.0% durante estos picos (no hay caídas 5xx), pero sí hay una ventana de varios segundos de latencia alta justo después de cada deploy. Esto es evidencia concreta — no solo teórica — que respalda la cautela ya documentada sobre el riesgo de cold starts en el paso 5 (sleep on idle): si un deploy normal ya genera este tipo de pico, un cold start por inactividad podría tener un comportamiento similar o peor.
9. **Corrección sobre el origen del tráfico (hallazgo de Google Analytics de 30 días, que filtra bots/arañas de rastreo):** hubo 5,689 sesiones reales en el período (~190/día), desglosadas en Paid Search 46,6%, Organic Search 29,9%, Direct 8,6%, **Organic Shopping 7,8%** (445 sesiones — tráfico que llega vía Google Shopping, es decir, generado por el mismo feed `products.xml`/`feed.xml`), Unassigned 1,5%. Dividiendo las 787.7k requests de Railway (punto 7) entre estas 5,689 sesiones da ~138 requests por sesión — alto pero razonable para un catálogo con tantas variantes de imagen por página (`srcset` de hasta 7 anchos por `<Image>`), no un indicio de tráfico dominado por bots. **Esto corrige la suposición del punto 7**: el grueso del volumen de requests probablemente viene de visitantes reales navegando un catálogo pesado en imágenes, no de crawlers — lo cual refuerza (no invalida) el valor de los cambios de imágenes de este spec: casi la mitad del tráfico es Paid Search (tráfico pagado) y un 7,8% llega directo del feed de Merchant Center, así que la eficiencia de entrega de imágenes y la vigencia del feed importan tanto para el costo de Railway como para la experiencia de esas visitas reales.

## Scope

**In:**

- Re-habilitar el control de tamaño de caché en memoria de Next.js (`cacheMaxMemorySize`) en `next.config.ts`, revirtiendo el comentario del 13 jul y volviendo al valor ya probado en producción (`0`), que deshabilita el caché LRU en memoria (Full Route Cache / Data Cache) forzando disco.
- Eliminar `remotePatterns: { hostname: '**' }` en `next.config.ts`. Ninguna imagen en el código usa una URL remota — todas vienen de `/public/fotos/`, `/public/icons/` y assets estáticos locales — así que este patrón solo deja abierto el optimizador de imágenes a cualquier host externo sin necesidad real.
- Reducir el array `qualities` en `next.config.ts` a los valores realmente usados en el código (`75` por defecto implícito, `85` explícito en `ProductCard.tsx`), quitando `90` y `100`.
- Agregar `revalidate` a las rutas `app/feed.xml/route.ts` y `app/products.xml/route.ts`, que hoy ejecutan `getAllProductosXML()` (consulta completa, sin límite) en cada request sin ningún control de caché — cada hit de un bot/crawler dispara una query nueva.
- Agregar `headers()` en `next.config.ts` para poner `Cache-Control` con `max-age` razonable a `/fotos/*` y `/icons/*`, que hoy se sirven con `max-age=0` (sin caché) al no pasar por el optimizador de `next/image`.

**Out of scope (for future specs):**

- Cambios al pool de PostgreSQL (`src/shared/db/index.ts`) — ya está bien configurado (`max: 8`, `idleTimeoutMillis`, listener de error); no hay evidencia de que sea causa del problema.
- Revisión de `deviceSizes`/`imageSizes` de `next/image` — requeriría medir los anchos reales renderizados (`sizes` prop) por componente; queda para un spec de imágenes más profundo si el problema persiste.
- Migrar a `output: 'standalone'` — afecta sobre todo tamaño de build/imagen, no memoria en runtime; sin evidencia de que sea causa del problema actual.
- Investigar a fondo los logs de "cierre inesperado en la consulta a la base de datos" — ya existe `pool.on('error')` en `src/shared/db/index.ts` que evita el crash; no hay evidencia de relación causal con el caché de Next.js revertido.
- Cambiar número de réplicas o límite de memoria del servicio en Railway — el usuario confirmó 1 sola réplica; no se toca sin evidencia adicional.
- Activar "sleep on idle" en Railway — se evaluó a fondo (ver Decisions y el historial de la sección Diagnóstico) y se decidió **no activarlo**: el checkout llama de forma síncrona a `/api/mercadopago/process-payment` desde el navegador (no hay webhook de por medio), la documentación oficial de Railway admite un posible `502 Bad Gateway` en la primera request tras dormir, y ya hay evidencia de cold starts de 6-7+ segundos en los deploys actuales. El ahorro esperado, además, era incierto dado el volumen y patrón de tráfico real (787.7k requests/mes, ~190 sesiones reales/día).

## Data model

Este spec no introduce estructuras de datos nuevas. Todos los cambios son de configuración (`next.config.ts`) y de control de caché en dos route handlers existentes (`app/feed.xml/route.ts`, `app/products.xml/route.ts`). No se modifica el schema de Drizzle ni `productos_`.

## Implementation plan

1. En `next.config.ts`, descomentar `cacheHandler: undefined` y `cacheMaxMemorySize: 0` (líneas revertidas el 13 jul). Verificación manual: `npm run build && npm run start` local, navegar el catálogo (`/`, `/productos`, `/producto/[id]/[slug]`) y confirmar que carga igual, ahora con caché en disco en vez de memoria.
2. En `next.config.ts`, quitar el bloque `remotePatterns` (no se usa ninguna imagen remota en el código). Verificación: `npm run build` sin errores; las imágenes de producto en `/productos`, `/marca/[slug]` y `/categoria/[slug]` siguen cargando igual.
3. En `next.config.ts`, reducir `qualities` a `[75, 85]`. Verificación: la imagen con `quality={85}` en `ProductCard.tsx:179` sigue renderizando sin error de "quality not allowed".
4. En `app/feed.xml/route.ts` y `app/products.xml/route.ts`, agregar `export const revalidate = 3600;` (el catálogo solo cambia vía importación CSV manual, no en tiempo real). Verificación: `curl localhost:3000/feed.xml` y `curl localhost:3000/products.xml` en local devuelven XML válido con los mismos productos.
5. ~~(Fuera de código, dashboard de Railway) Activar "sleep on idle" para el servicio `next-dipemsa-web`.~~ **Descartado.** Se evaluó a fondo (ver Decisions) y se decidió no activarlo: el checkout es una llamada síncrona del navegador a `/api/mercadopago/process-payment` sin webhook de por medio, la documentación oficial de Railway admite un posible `502 Bad Gateway` en la primera request tras dormir, y ya hay evidencia de cold starts de 6-7+ segundos en los deploys actuales del proyecto — el riesgo sobre el checkout no se justifica frente a un ahorro incierto.
6. En `next.config.ts`, agregar una función `headers()` que aplique `Cache-Control: public, max-age=86400, must-revalidate` a `/fotos/:path*` y `/icons/:path*`. Verificación: `npm run build && npm run start` local, `curl -sI http://localhost:3000/fotos/webp/<id>.webp` debe mostrar el nuevo `Cache-Control` (ya no `max-age=0`); `curl -sI http://localhost:3000/feed.xml` / `/products.xml` siguen funcionando igual.

## Acceptance criteria

- [ ] `next.config.ts` tiene `cacheHandler: undefined` y `cacheMaxMemorySize: 0` activos (no comentados).
- [ ] `next.config.ts` ya no contiene `remotePatterns` con `hostname: '**'`.
- [ ] `next.config.ts` tiene `qualities: [75, 85]`.
- [ ] `app/feed.xml/route.ts` y `app/products.xml/route.ts` exportan `revalidate = 3600`.
- [ ] `npm run build` completa sin errores.
- [ ] Las páginas `/`, `/productos`, `/producto/[id]/[slug]`, `/marca/[slug]` y `/categoria/[slug]` cargan sus imágenes de producto correctamente en local tras el cambio.
- [ ] El flujo de checkout con Mercado Pago sigue funcionando igual que antes del cambio.
- [ ] `/feed.xml` y `/products.xml` devuelven XML válido con el mismo conteo de productos que antes del cambio.
- [ ] (Verificación post-deploy, 7 días) La gráfica de "Memory usage" de `next-dipemsa-web` en Railway ya no muestra picos sostenidos por encima de 1 GB bajo tráfico normal.
- [ ] `curl -sI http://localhost:3000/fotos/webp/<id>.webp` devuelve `Cache-Control: public, max-age=86400, must-revalidate` (ya no `max-age=0`).
- [ ] (Verificación post-deploy, 7 días) La gráfica de "Public Network Traffic" (egress) de `next-dipemsa-web` en Railway muestra ráfagas menos frecuentes bajo tráfico normal.

## Decisions

- **Sí:** re-aplicar `cacheMaxMemorySize: 0` — el valor exacto ya probado en producción entre el 26 may y el 13 jul — en vez de un valor intermedio (ej. 25MB). Es el único valor con historial real en este proyecto; uno intermedio sería una hipótesis nueva sin validar.
- **No:** usar un `cacheHandler` personalizado (ej. respaldado por Redis) en vez de deshabilitar el caché en memoria. Agregaría un servicio adicional en Railway para un problema resoluble sin costo extra; se puede reconsiderar si el tráfico crece mucho.
- **Sí:** eliminar `remotePatterns` por completo en vez de restringirlo a hosts específicos. No hay ningún uso real de imágenes remotas en el código — no hace falta permitir ningún host externo.
- **No:** tocar `deviceSizes`/`imageSizes` en este spec. Requiere medir los anchos renderizados reales por componente (`sizes` prop), es una auditoría aparte no cubierta por los hallazgos actuales.
- **Sí:** agregar `revalidate = 3600` a las rutas de feeds en vez de un caché más elaborado (ej. revalidación on-demand enganchada al script de importación CSV). Es el cambio mínimo que resuelve el problema — query sin caché en cada request — sin acoplar los feeds al pipeline de importación.
- **No:** modificar `src/shared/db/index.ts` (pool de PostgreSQL). Ya está bien configurado y no hay evidencia de fuga ahí.
- **No:** migrar a `output: 'standalone'` en este spec. No hay evidencia de que afecte memoria en runtime; es un cambio de build que amerita su propia validación por separado.
- **No:** activar "sleep on idle" en Railway. Se consideró inicialmente por el CPU casi nulo, pero tras evaluarlo a fondo el usuario decidió no activarlo: el checkout llama de forma síncrona a `/api/mercadopago/process-payment` desde el navegador (sin webhook de por medio) y la documentación oficial de Railway admite un posible `502 Bad Gateway` en la primera request tras dormir — un fallo ahí sería visible para el cliente en plena compra. Además, ya hay evidencia de cold starts de 6-7+ segundos en los deploys actuales (sin sleep involucrado), y el ahorro esperado era incierto dado el patrón real de tráfico (787.7k requests/mes, ~190 sesiones reales/día). El riesgo no se justificaba frente a un beneficio incierto.
- **Sí:** agregar `headers()` para `/fotos/*` e `/icons/*` con `max-age=86400` (1 día) en vez de un valor mayor (ej. 1 año/immutable). Las fotos de producto se actualizan vía importación manual y pueden sobrescribirse bajo el mismo nombre de archivo (mismo `id`); 1 día limita cuánto tiempo podría verse una foto desactualizada tras un reemplazo, a cambio de igual reducir bastante el egress repetido de crawlers/bots.

## Risks

| Risk | Mitigation |
|---|---|
| `cacheMaxMemorySize: 0` fuerza el caché a disco, lo que podría aumentar levemente la latencia de páginas al perder el caché rápido en memoria. | Ya estuvo así en producción ~7 semanas (26 may–13 jul) sin reportes de lentitud. Monitorear tiempos de respuesta tras el deploy. |
| Quitar `remotePatterns` rompe si en el futuro se agrega una imagen remota (ej. CDN externo) sin actualizar `next.config.ts`. | `next/image` lanza un error claro en build/desarrollo indicando el host no permitido — fácil de detectar y volver a agregar. |
| `revalidate = 3600` en los feeds retrasa hasta 1 hora que un producto nuevo (agregado vía `npm run import:csv`) aparezca en `/feed.xml` y `/products.xml` (Google Merchant Center, sitemap). | Aceptable porque las importaciones son manuales y no urgentes; si se necesita reflejo inmediato, bajar el `revalidate` o disparar una revalidación manual después del import. |
| `Cache-Control: max-age=86400` en `/fotos/*` puede mostrar una foto desactualizada hasta por 1 día si se reemplaza el archivo de un producto existente (mismo `id`) vía importación CSV. | Riesgo bajo — las fotos de producto rara vez cambian una vez publicadas. Si se necesita invalidación inmediata tras un reemplazo puntual, renombrar el archivo (nuevo `id`/sufijo) en vez de sobrescribir el mismo nombre. |

## What is **not** in this spec

- Cambios al pool de PostgreSQL (`src/shared/db/index.ts`).
- Revisión de `deviceSizes`/`imageSizes` de `next/image`.
- Migración a `output: 'standalone'`.
- Investigación a fondo de los logs de "cierre inesperado en la consulta a la base de datos".
- Cambios al número de réplicas o al límite de memoria del servicio en Railway.
- Activar "sleep on idle" en Railway (evaluado y descartado — ver Decisions).

Cada uno de estos, si se necesita, va en su propio spec.
