# SPEC 16 — Estabilizar memoria del servicio Next.js en Railway

> **Estado:** Approved
> **Depende de:** SPEC 08, SPEC 15
> **Fecha:** 2026-10-06
> **Objetivo:** Frenar el crecimiento de memoria de `next-ferredip` de ~120MB a ~400MB sin más visitas, bajando el costo de memoria (~$1.32 de $1.42) con quick-wins de servidor más corrección de queries y feeds pesados.

## Por qué existe este spec

El 2026-10-06 Railway alertó `$2.51` de uso con `Estimated $5.23`, dominado por `Memory $1.32`. La gráfica muestra `next-ferredip` subiendo en escalera con piso cada vez más alto mientras CPU sigue en ~0 y las visitas no suben. Los picos de `Network egress` coinciden con crawl (Google + 19 bots IA permitidos en `app/robots.ts`), no con usuarios. La causa no es un leak de heap en una request: es costo por request pesada multiplicado por crawl sin cache efectiva, más `sharp` residual. Antecedente directo: incidente 2026-08-24 documentado en `CLAUDE.md` y mitigado a medias en `next.config.ts`.

## Alcance

**Dentro:**

- Paginar `app/api/admin/productos/route.ts` (`?page&limit`, default 50, max 100) y proyectar solo columnas usadas en el dashboard.
- Quitar `JSON.stringify(carrito_completo)` de logs en `app/api/mercadopago/preference/route.ts` y `process-payment/route.ts`; dejar solo `payment_id + total`.
- `AbortSignal.timeout(8000-10000)` en `preference.create`, `payment.create`, `resend.emails.send` (`app/api/contacto/route.ts`, `app/api/send-email/route.ts`).
- `src/shared/db/index.ts`: añadir `statement_timeout: 8000` al `Pool` (mantener `max: 8`).
- `app/api/search/route.ts` y `app/api/agente-productos/route.ts`: `maxLength 80`, `Cache-Control: s-maxage=60` en respuestas GET.
- `src/shared/db/queries.ts`: proyectar columnas mínimas en `getAllProductosXML`, `getProductsByGroupsofTrademarks`, `getProductsByGroupsofCategories`; `.limit(20)` en `getRecomendedProducts`.
- `app/feed.xml/route.ts` y `app/products.xml/route.ts`: construir XML por chunks/stream en vez de un solo `.join('')`; `Cache-Control: s-maxage=3600, stale-while-revalidate`.
- `next.config.ts`: reactivar caché ISR con tope (ej. `cacheMaxMemorySize: 50MB`, quitar `0`) conservando `revalidate=3600` existente.
- `Header/Footer/Marcas/SliderMain/ProductsSection/SoyMayorista`: `unoptimized` + `sizes` correctos para no regenerar variantes `sharp` bajo crawl.
- `npm run build` y `npm run lint` en verde.

**Fuera de alcance (para specs futuros):**

- Bloquear o limitar los 19 bots IA de `app/robots.ts`.
- Leaks de cliente (`ChatAsistente.tsx`, `SliderMain.tsx`, `ProductImageZoom.tsx`, stores Zustand, `MercadoPagoBrick.tsx`).
- Auth completa del panel admin (solo se pagina la API, no se implementa login).
- Migración de assets locales restantes a R2.
- Rate-limit por IP o WAF.

## Modelo de datos

Este spec no crea tablas ni cambia el schema. Solo acota lecturas.

```ts
// GET /api/admin/productos?page=1&limit=50 (default 50, max 100)
// Respuesta: { page: number; limit: number; total: number; items: ProductoResumen[] }
type ProductoResumen = {
  id: string;
  clave: string | null;
  descripcion: string | null;
  precio: string | null;
  marca: string | null;
  categoria: string | null;
};
```

Convenciones:

- Toda query de catálogo proyecta columnas, nunca `select()` sin argumentos.
- Todo endpoint público GET lleva `Cache-Control` explícito.
- Ningún log de servidor serializa el carrito completo.

## Plan de implementación

1. **Paginar `app/api/admin/productos/route.ts`.** Aceptar `page/limit`, proyectar 6 columnas, devolver `{page, limit, total, items}`.
   *Verificación:* `curl '/api/admin/productos?limit=5'` devuelve 5 items con solo esas columnas.
2. **Limpiar logs de Mercado Pago.** Sustituir `JSON.stringify(carrito)` por `payment_id + total` en `preference` y `process-payment`.
   *Verificación:* `grep -r carrito_completo app/api/mercadopago` sin resultados de `stringify`.
3. **Añadir timeouts.** `AbortSignal.timeout` en `preference.create`, `payment.create` y los dos `resend.emails.send`.
   *Verificación:* cada llamada externa tiene timeout visible en el diff.
4. **Endurecer pool.** `statement_timeout: 8000` en `src/shared/db/index.ts`.
   *Verificación:* query `ILIKE` lenta aborta en ~8s en vez de encolar el pool.
5. **Acotar search/agente.** `maxLength 80` + `s-maxage=60` en ambas rutas.
   *Verificación:* `q` de 500 chars responde 400 o truncado; segunda llamada igual usa cache.
6. **Proyectar queries pesadas.** Columnas mínimas en los 3 grupos de `queries.ts` + `.limit(20)` en recomendados.
   *Verificación:* `EXPLAIN` o log muestra `SELECT id, ...` en vez de `SELECT *`.
7. **Streamear feeds.** Reescribir `feed.xml` y `products.xml` por chunks + header `s-maxage=3600`.
   *Verificación:* `curl -I /feed.xml` trae el header; 10 reqs concurrentes no duplican RSS.
8. **Reactivar caché ISR.** `cacheMaxMemorySize: 50MB` en `next.config.ts`.
   *Verificación:* segundo hit a `/categoria/truper` no re-ejecuta la query (log DB).
9. **Locales sin `sharp`.** `unoptimized` + `sizes` en los 6 componentes con `next/image` local.
   *Verificación:* `/_next/image?url=/sliders` deja de generar variantes nuevas bajo crawl.
10. **Build y lint.** Correr `npm run build` y `npm run lint`.
    *Verificación:* ambos en verde.

## Criterios de aceptación

- [ ] `GET /api/admin/productos?limit=5` devuelve máximo 5 items con solo las 6 columnas.
- [ ] Ningún log de `app/api/mercadopago/*` contiene el carrito completo.
- [ ] Toda llamada a MP/Resend tiene timeout explícito.
- [ ] `getRecomendedProducts` devuelve máximo 20 filas.
- [ ] `GET /feed.xml` y `/products.xml` responden con `Cache-Control: s-maxage=3600`.
- [ ] Segundo `GET` a `/categoria/truper` dentro de la hora no re-ejecuta query pesada.
- [ ] `next-ferredip` se mantiene <250MB durante 24h en Railway sin reinicios.
- [ ] `Estimated usage` mensual vuelve a <$3 por memoria.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: SPEC 16 cubre F1+F2 juntas.** El usuario lo eligió; evita dos deploys y el riesgo de medir quick-wins sin la raíz.
- **Sí: reactivar caché ISR con tope 50MB.** El usuario lo permitió; sin esto cada hit de bot re-ejecuta queries pesadas y el fix no se sostiene.
- **Sí: paginar + columnas mínimas en admin API, sin auth.** Menor riesgo; auth completa va a otro spec.
- **No: bloquear bots IA.** El usuario lo rechazó; el catálogo debe seguir citable, se absorbe con cache.
- **No: leaks de cliente en este spec.** El usuario priorizó factura Railway; cliente va a SPEC 17 si se hace.
- **Sí: `statement_timeout` 8s.** Corta scans `ILIKE %x%` colgados sin cambiar plan de índices (índices trigram van a otro spec).
- **No: rate-limit por IP en este spec.** Se registra como riesgo; si el crawl persiste se evalúa aparte.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Reactivar ISR sube RAM si el tope es alto | Tope 50MB explícito + vigilancia 24h en Railway |
| Proyectar columnas rompe algún componente que usaba un campo | Solo se quitan columnas no leídas; build + smoke de marca/categoría/producto/feed |
| Stream de XML cambia formato y rompe Merchant Center | Diff del XML antes/después byte a byte salvo `lastBuildDate` |

## Lo que **no** está en este spec

- Bloqueo o `Crawl-delay` a bots IA.
- Fixes de `ChatAsistente`, sliders, zoom, Zustand, Brick de Mercado Pago.
- Login o roles del admin.
- Subida de sliders/marcas a R2.
- Rate-limit, WAF o índices `pg_trgm`.

Cada uno de ellos, si se hace, va en su propio spec.
