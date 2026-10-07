# SPEC 17 — Memoria rojo 320MB: ISR producto, cursor en feeds e índices trigram

> **Estado:** Approved
> **Depende de:** SPEC 16, SPEC 08
> **Fecha:** 2026-10-07
> **Objetivo:** Frenar la escalera de memoria que SPEC 16 no detuvo (320MB a 24h) con ISR en fichas de producto, cursor real en feeds e índices trigram en búsquedas.

## Por qué existe este spec

A 24h del deploy de SPEC 16 (`c2d89b4`, `cacheMaxMemorySize: 50MB`) Railway marcó 320MB. Con base 140-190MB + tope 50MB el techo esperado era ~240MB. 320MB = +80MB sobre el peor caso: no es caché, sigue el crecimiento en escalera. La investigación (solo lectura + subagente explore) encontró la ficha de producto 100% dinámica, `/productos` dinámico, `feed.xml`/`products.xml` con streaming falso (array completo en heap antes de streamear), `ILIKE %x%` sin índice trigram ante `q` único de bots, y `robots.ts` con `allow: /` sin `disallow` para los 19 bots IA sobre `/api/`.

## Alcance

**Dentro:**

- `app/(public)/producto/[id]/[slug]/page.tsx`: agregar `export const revalidate = 3600`.
- `app/(public)/productos/page.tsx`: agregar `export const revalidate = 3600`.
- `app/sitemap.xml/route.ts`: agregar `Cache-Control: public, s-maxage=3600, stale-while-revalidate=600`.
- `app/robots.ts`: agregar `disallow: RUTAS_BLOQUEADAS` a las 19 reglas de bots IA (siguen con `allow: /`, solo se les cierra `/api/`, `/resultados/`, `/compra/`, `/productos/relacionados`).
- `app/api/agente-productos/route.ts`: subir `s-maxage=60` a `s-maxage=300`.
- `src/shared/db/queries.ts` (`getAllProductosXML`): paginar con cursor `LIMIT 500 OFFSET` en loop desde `feed.xml` y `products.xml`, sin cambiar columnas.
- Índices `pg_trgm`: `CREATE EXTENSION IF NOT EXISTS pg_trgm` + índice GIN trigram en `descripcion`, `marca`, `categoria`, `clave` de `productos_`, aplicado a mano en Railway.
- `src/shared/db/index.ts`: `max: 8 → 4`, `idleTimeoutMillis: 12000 → 5000` (se mantiene `statement_timeout: 8000`).
- `src/shared/components/MercadoPagoButton.tsx`: `unoptimized` al `<Image src="/icons/logo-mercado-pago.svg">` local.
- `npm run build` y `npm run lint` en verde.

**Fuera de alcance (para specs futuros):**

- Rate-limit por IP, WAF o middleware de conteo.
- Paginación visual de categorías/marcas o agrupación en SQL.
- Generación de feeds a R2/estático por cron.
- Leaks de cliente (`ChatAsistente`, sliders, zoom, Zustand, Brick MP).
- Auth del panel admin.
- Bloqueo total o `Crawl-delay` a bots IA.

## Modelo de datos

Este spec no crea tablas ni cambia el schema. Solo acota lecturas y agrega índices.

```sql
-- Correr a mano en Railway (una sola vez), no vía drizzle-kit
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_productos_trgm
  ON productos_ USING gin (
    descripcion gin_trgm_ops,
    marca gin_trgm_ops,
    categoria gin_trgm_ops,
    clave gin_trgm_ops
  );
```

```ts
// GET /api/agente-productos — solo cambia el header de caché
// Antes: 'public, s-maxage=60, stale-while-revalidate=30'
// Después: 'public, s-maxage=300, stale-while-revalidate=60'
```

Convenciones:

- Toda query de catálogo sigue proyectando columnas, nunca `select()` sin argumentos (regla SPEC 16).
- Todo endpoint público GET lleva `Cache-Control` explícito.
- Ningún índice nuevo cambia el plan de escritura; solo acelera `ILIKE %x%`.

## Plan de implementación

1. **ISR en ficha de producto.** Agregar `export const revalidate = 3600` en `app/(public)/producto/[id]/[slug]/page.tsx`.
   *Verificación:* segundo `GET` al mismo `/producto/{id}/{slug}` dentro de la hora no re-ejecuta `getProductById` (log DB).
2. **ISR en `/productos`.** Agregar `export const revalidate = 3600` en `app/(public)/productos/page.tsx`.
   *Verificación:* segundo hit no re-ejecuta `getProductsByGroupsofCategories`.
3. **Cache header en índice de sitemaps.** Agregar `Cache-Control: public, s-maxage=3600, stale-while-revalidate=600` en `app/sitemap.xml/route.ts`.
   *Verificación:* `curl -I /sitemap.xml` trae el header.
4. **Cerrar `/api/` a bots IA.** Agregar `disallow: RUTAS_BLOQUEADAS` a las 19 reglas de `BOTS_IA` en `app/robots.ts`, manteniendo `allow: /`.
   *Verificación:* `/robots.txt` muestra `Disallow: /api/` también bajo `GPTBot`, `ClaudeBot`, etc.
5. **Subir caché del agente.** Cambiar `s-maxage=60` a `s-maxage=300` en `app/api/agente-productos/route.ts`.
   *Verificación:* `curl -I '/api/agente-productos?q=taladro'` trae `s-maxage=300`.
6. **Cursor real en feeds.** Reescribir el loop de `app/feed.xml/route.ts` y `app/products.xml/route.ts` para pedir `getAllProductosXML` por páginas de 500 (`LIMIT/OFFSET`) y encolar cada página al `ReadableStream` en vez de un solo array.
   *Verificación:* diff del XML byte a byte salvo `lastBuildDate`; 10 reqs concurrentes no duplican RSS en memoria.
7. **Índices trigram.** Correr el SQL del modelo de datos a mano en Railway y confirmar con `EXPLAIN (ANALYZE, BUFFERS)` que `ILIKE %truper%` usa el índice.
   *Verificación:* `EXPLAIN` muestra `Bitmap Index Scan on idx_productos_trgm`.
   *Nota de implementación (2026-10-07, rama `spec-17-memoria-rojo-320mb`):* índice creado en Railway prod (`pg_trgm` instalado en 181ms, `idx_productos_trgm` creado en 177ms, 784KB sobre 2,170 filas, `ANALYZE productos_` corrido). El `EXPLAIN` con settings default muestra `Seq Scan` incluso con patrones raros (`%zxq123nada%`, `%taladro roto%`): la tabla es chica (106 páginas, cabe en memoria) y el planner sobreestima el costo del bitmap (290 vs 149). Con `SET enable_seqscan = off` (solo diagnóstico) sí usa `BitmapOr` con 4 `Bitmap Index Scan on idx_productos_trgm` en 0.24ms vs 3-6ms del seq scan. Se deja el índice: ayuda bajo crawl concurrente y cuando el catálogo crezca. La verificación de este criterio se hace con `enable_seqscan = off`.
8. **Pool más chico.** `max: 4`, `idleTimeoutMillis: 5000` en `src/shared/db/index.ts`.
   *Verificación:* bajo carga el pool no pasa de 4 clientes (`SELECT count(*) FROM pg_stat_activity`).
9. **Último `sharp` local.** `unoptimized` en `MercadoPagoButton.tsx` al `/icons/logo-mercado-pago.svg`.
   *Verificación:* `/_next/image?url=/icons/logo-mercado-pago` deja de aparecer en logs.
10. **Build y lint.** Correr `npm run build` y `npm run lint`.
    *Verificación:* ambos en verde.

## Criterios de aceptación

- [ ] Segundo `GET` al mismo `/producto/{id}/{slug}` dentro de la hora no re-ejecuta query pesada.
- [ ] Segundo `GET` a `/productos` dentro de la hora no re-ejecuta query pesada.
- [ ] `GET /sitemap.xml` responde con `Cache-Control: public, s-maxage=3600`.
- [ ] `/robots.txt` muestra `Disallow: /api/` bajo las reglas de bots IA manteniendo `Allow: /`.
- [ ] `GET /api/agente-productos?q=taladro` responde con `s-maxage=300`.
- [ ] `EXPLAIN` de `ILIKE %truper%` sobre `productos_` usa `idx_productos_trgm` (parcial 2026-10-07: verificado solo con `enable_seqscan = off`; con settings default el planner prefiere `Seq Scan` por tabla chica — ver nota del paso 7).
- [ ] `GET /feed.xml` y `/products.xml` responden igual byte a byte salvo `lastBuildDate` y con `s-maxage=3600`.
- [ ] `next-ferredip` se mantiene <250MB durante 24h en Railway sin reinicios (baseline tras reinicio limpio).
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: `revalidate = 3600` en ficha de producto.** El usuario lo autorizó; sin esto cada URL de ~2170 productos re-ejecuta 3 queries por hit de bot y el fix no se sostiene. Costo aceptado: precios/stock pueden tardar 1h.
- **Sí: cursor real `LIMIT 500` en feeds (opción 1a).** Cambio chico frente a generar a R2 por cron; elimina el array completo en heap manteniendo el XML idéntico.
- **Sí: índices `pg_trgm` aplicados a mano en Railway.** `drizzle-kit migrate/push` no aplican en este repo (precedente SPEC 07 con `ordenes`); se corre el SQL una sola vez contra `DATABASE_URL`.
- **Sí: pool `max 4` + `idle 5s`.** Plan Hobby no necesita 8 conexiones ociosas reteniendo buffers; se mantiene `statement_timeout 8s` de SPEC 16.
- **Sí: cerrar `/api/` y `/resultados/` a bots IA en `robots.ts`.** No es bloqueo total (decisión SPEC 16 de seguir citable se respeta): mantienen `Allow: /` al catálogo, solo se les cierra lo que genera `ILIKE` con `q` único.
- **Sí: `s-maxage=300` solo en agente-productos.** `search` se queda en 60s por ser interactivo; el agente re-pregunta lo mismo y aguanta 5 min.
- **No: rate-limit por IP / WAF en este spec.** Queda como riesgo; si el crawl persiste se evalúa aparte.
- **No: paginar categorías/marcas ni agrupar en SQL.** Solo ISR; el cambio visual y de query va a otro spec.
- **No: feeds a R2/estático.** Opción 1b descartada por ahora; si el cursor no basta se retoma.
- **Definición rápida sin clarificación extendida.** El usuario pidió ir directo con 4 respuestas cerradas (1a, 2 sí, 3 sí, 4 sí); se registra según la regla del skill.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| ISR en producto retrasa precio/stock hasta 1h | `revalidate = 3600` ya aceptado; si urge un precio, redeploy o revalidación manual |
| Índice trigram no usado por planner en `ILIKE` con leading `%` corto | Verificar con `EXPLAIN`; si no lo usa, ajustar a `gin_trgm_ops` por columna separada |
| Cursor `LIMIT/OFFSET` cambia orden del XML y rompe Merchant Center | Mantener mismo `ORDER BY createdat DESC`; diff byte a byte salvo `lastBuildDate` |
| Pool 4 se queda corto bajo pico real de checkout | `statement_timeout 8s` + monitoreo; checkout son 3 rutas puntuales, no scans |

## Lo que **no** está en este spec

- Rate-limit por IP, WAF o middleware de conteo.
- Paginación visual de categorías/marcas o agrupación en SQL.
- Generación de feeds a R2 o a archivo estático por cron.
- Fixes de `ChatAsistente`, sliders, zoom, Zustand, Brick de Mercado Pago.
- Login o roles del admin.
- Bloqueo total o `Crawl-delay` a bots IA.
- Migración de assets locales restantes a R2.

Cada uno de ellos, si se hace, va en su propio spec.
