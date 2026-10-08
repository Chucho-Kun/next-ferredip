# SPEC 18 — Endurecer pagos, emails y admin sin tocar GTM ni TLS

> **Estado:** Approved
> **Depende de:** SPEC 06, SPEC 12, SPEC 17
> **Fecha:** 2026-10-07
> **Objetivo:** Cerrar fraude directo y abuso en pagos, emails y admin con validación zod, recálculo de montos en servidor, token admin y rate-limit en memoria.

## Scope

**In:**

- `app/api/mercadopago/process-payment/route.ts`: validar con `zod`, recalcular `transaction_amount` e ítems desde `productos_` en DB, rechazar divergencias, allowlist `payment_method_id`/`installments`, validar `payer.email`, errores genéricos al cliente.
- `app/api/mercadopago/preference/route.ts`: validar con `zod` `items/payer/metadata`, no copiar `...body.metadata` arbitrario, validar `picture_url/id`.
- `app/api/send-email/route.ts`: mantener POST público con `zod`, validar `customerEmail`, escapar todo campo con `escapeHtml` de `contacto`, check `Origin/Referer` vs `Host`, rate-limit, errores genéricos.
- `app/api/admin/productos/[id]/relacionados/route.ts` + `GET admin/productos`: exigir token `ADMIN_*` en header con `timingSafeEqual`, validar `related_products: string[]` con límite, 401 sin token.
- `middleware.ts` nuevo + checks en POST: rate-limit en memoria por IP para `/api/contacto`, `/api/send-email`, `/api/mercadopago/*`, `/api/search`, `/api/agente-productos`, más `Origin/Referer` vs `Host`.
- Limpieza PII en cliente: quitar `console.log` de email/`formData`/respuesta en `MercadoPagoBrick.tsx`, `ResumenCompra.tsx`, `MediosdePagoComponent.tsx`.
- JSON-LD: `JSON.stringify(...).replace(/</g, '\u003c')` en `TrademarckResults.tsx`, `CategoryResults.tsx`, `producto/[id]/[slug]/page.tsx`, `(public)/page.tsx`, `preguntas-frecuentes/page.tsx`.
- `contacto/route.ts`: extender `escapeHtml` a comilla simple, validar largo/charset de `subject`, sin cambiar flujo.
- Inventario de scripts de checkout como documento (`GTM-NM38ZR5Z` operado por el dueño, `sdk.mercadopago.com`, `cdn.jsdelivr.net/npm/@n8n/chat@1.39.2/`), sin implementar CSP.
- `npm audit` con reporte y updates solo patch/minor seguros, `npm run build` y `lint` en verde.

**Out of scope (for future specs):**

- GTM como riesgo: operado por el dueño, queda permitido y sin cambios.
- Webhook Mercado Pago con verificación `x-signature`/HMAC e idempotencia.
- Implementación CSP con `nonce`, HSTS, `X-Frame-Options` y SRI.
- TLS Postgres `rejectUnauthorized:true` + `DATABASE_CA_CERT`.
- Login/sesión/roles de admin o Server Action autenticada.
- CAPTCHA/Turnstile/honeypot en contacto.
- Redis/Upstash, WAF externo o bloqueo total de bots.

## Data model

Este spec no crea tablas ni cambia el schema de Drizzle. Reusa `productos_` y `ordenes` de SPEC 06. Introduce solo schemas de validación, contrato de auth admin y store de rate-limit.

```ts
// POST /api/mercadopago/process-payment — lo que el cliente puede mandar vs lo que el servidor cobra
const ProcessPaymentSchema = z.object({
  token: z.string().min(10).max(500),
  issuer_id: z.string().max(20).optional(),
  payment_method_id: z.string().max(30),
  installments: z.number().int().min(1).max(24),
  payer: z.object({ email: z.string().email().max(120) }),
  items: z.array(z.object({ id: z.string().max(40), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
  transaction_amount: z.number().positive().optional(),
});

// Servidor recalcula y compara
type ServerQuote = { id: string; unit_price: number; quantity: number; line_total: number };
type QuoteCheck = { server_total: number; client_total: number; diverged: boolean };
```

```ts
// POST /api/mercadopago/preference
const PreferenceSchema = z.object({
  items: z.array(z.object({
    id: z.string().max(40),
    title: z.string().max(120),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
  payer: z.object({ email: z.string().email().max(120) }).optional(),
  metadata: z.record(z.string().max(40), z.string().max(200)).optional(),
});

// POST /api/send-email — mantiene POST público pero validado y escapado
const SendEmailSchema = z.object({
  customerEmail: z.string().email().max(120),
  orderData: z.object({ id: z.string().max(60), total: z.number().positive(), items: z.array(z.object({ id: z.string().max(40), titulo: z.string().max(120), quantity: z.number().int().min(1).max(99) })).max(50) }),
  deliveryData: z.object({ nombre: z.string().max(80), direccion: z.string().max(200), email: z.string().email().max(120).optional() }),
});

// PUT /api/admin/productos/[id]/relacionados
const RelacionadosSchema = z.object({ related_ids: z.array(z.string().max(40)).max(20) });
// Auth: header `x-admin-token: <ADMIN_TOKEN>` comparado con `timingSafeEqual` contra `process.env.ADMIN_TOKEN`. Sin token → 401 genérico.
```

```ts
// middleware.ts — rate-limit en memoria por IP (sin Redis)
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();
// Grupos: contacto (10/min), send-email (10/min), mercadopago (20/min), search/agente (30/min). Respuesta 429 genérica con `Retry-After`.
```

```md
// Inventario scripts checkout — documento corto, ej. `docs/inventario-scripts-checkout.md`
// Columnas: script | dominio | dueño | por qué está en checkout | verificado (sí/no)
```

Convenciones:

- El servidor nunca cobra `unit_price/total` del cliente, solo lo recalculado desde `productos_`.
- Todo campo que va a HTML de email pasa por `escapeHtml` (incluida comilla simple).
- Ningún error al cliente incluye `error.message` del procesador, solo `No se pudo procesar, intenta de nuevo` + `requestId` en log server.

## Implementation plan

1. Añadir `zod` a `package.json` y crear `src/shared/validation/schemas.ts` con `ProcessPaymentSchema`, `PreferenceSchema`, `SendEmailSchema`, `RelacionadosSchema`.
   *Verificación:* `npm run build` pasa, schemas importables desde las 4 rutas.

2. Endurecer `app/api/mercadopago/process-payment/route.ts`: validar con `zod`, recargar precios desde `productos_` por `id`, cobrar `server_total`, rechazar divergencia >$1 con 400 genérico, allowlist `payment_method_id/installments`, no reenviar `error.message` de MP.
   *Verificación:* POST con `transaction_amount:1` para carrito de $500 es rechazado, pago válido sigue creando preferencia/orden.

3. Endurecer `app/api/mercadopago/preference/route.ts`: validar con `zod`, recalcular `unit_price` desde DB, no hacer spread de `body.metadata`, validar `id` para `picture_url`.
   *Verificación:* POST con `unit_price:1` cobra precio DB, `metadata` extra es ignorada o rechazada.

4. Endurecer `app/api/send-email/route.ts` manteniendo POST público: validar con `zod`, escapar todo campo con `escapeHtml`, validar `customerEmail`, check `Origin/Referer` vs `Host`, error genérico.
   *Verificación:* POST con `<script>` en `nombre/titulo` llega escapado al HTML, `Origin` externo es 403, email inválido es 400.

5. Gatear admin: `app/api/admin/productos/[id]/relacionados/route.ts` PUT y `GET admin/productos` exigen `x-admin-token` vs `ADMIN_TOKEN` con `timingSafeEqual`, validar body con `RelacionadosSchema`.
   *Verificación:* sin header → 401 genérico, con token válido PUT escribe, con IDs inválidos → 400.

6. Crear `middleware.ts` con rate-limit en memoria por IP + `Origin` check en POST: `contacto/send-email` 10/min, `mercadopago/*` 20/min, `search/agente-productos` 30/min, respuesta 429 con `Retry-After`.
   *Verificación:* 11 POST seguidos a `/api/contacto` desde misma IP → 429, GET normal sigue 200.

7. Retocar `app/api/contacto/route.ts`: `escapeHtml` también escapa `'`, validar largo/charset de `subject`, sin cambiar flujo.
   *Verificación:* `'` en nombre no rompe atributo, `subject` de 500 chars es 400 o truncado.

8. Quitar PII de consola cliente en `MercadoPagoBrick.tsx`, `ResumenCompra.tsx`, `MediosdePagoComponent.tsx`: eliminar `console.log` de email/`formData`/respuesta, dejar solo error genérico.
   *Verificación:* `grep -r console.log src/shared/components/MercadoPago* src/shared/components/ResumenCompra*` sin PII.

9. Escapar `</script>` en JSON-LD: `.replace(/</g, '\u003c')` en `TrademarckResults.tsx`, `CategoryResults.tsx`, `producto/[id]/[slug]/page.tsx`, `(public)/page.tsx`, `preguntas-frecuentes/page.tsx`.
   *Verificación:* descripción con `</script>` no rompe el bloque, página sigue con JSON-LD válido.

10. Crear `docs/inventario-scripts-checkout.md` con tabla script/dominio/dueño/motivo: `GTM-NM38ZR5Z` (dueño propio), `sdk.mercadopago.com`, `cdn.jsdelivr.net/npm/@n8n/chat@1.39.2/`.
    *Verificación:* archivo existe y lista los 3 con dueño y motivo.

11. Correr `npm audit`, actualizar solo patch/minor seguros, luego `npm run build` y `npm run lint`.
    *Verificación:* ambos en verde, reporte audit guardado en el PR.

## Acceptance criteria

- [ ] POST a `process-payment` con `transaction_amount` manipulado a $1 es rechazado con 400 genérico y no crea cargo.
- [ ] POST a `preference` con `unit_price` manipulado cobra el precio de DB, no el del cliente.
- [ ] POST a `send-email` con `<script>` en `nombre/titulo` entrega HTML con `&lt;script&gt;` y no ejecuta nada.
- [ ] POST a `send-email` sin `Origin` válido es 403 y con `customerEmail` inválido es 400.
- [ ] PUT a `admin/productos/[id]/relacionados` sin `x-admin-token` es 401 y con token válido escribe.
- [ ] 11 POST seguidos a `/api/contacto` desde la misma IP devuelven 429 con `Retry-After`.
- [ ] Ninguna respuesta de `mercadopago/*` o `send-email` incluye `error.message` interno del procesador.
- [ ] `grep console.log` en `MercadoPagoBrick/ResumenCompra/MediosdePagoComponent` no muestra email ni `formData`.
- [ ] Página de producto con `descripcion` que contiene `</script>` renderiza JSON-LD sin romper el `<script>`.
- [ ] Existe `docs/inventario-scripts-checkout.md` con los 3 scripts, dueño y motivo.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisions

- **Sí: alcance todo menos GTM.** Cubre P0 fraude + P1 abuso + hardening liviano en un solo SPEC 18 para un deploy.
- **Sí: GTM fuera del riesgo.** Operado por el dueño (`GTM-NM38ZR5Z`), queda permitido y documentado en inventario, sin cambios.
- **Sí: `zod` para validación.** Estándar, permite allowlist y rangos sin validación manual dispersa.
- **Sí: recálculo server-side desde `productos_`.** Nunca se cobra `unit_price/total` del cliente, tolerancia $1 por redondeo.
- **Sí: `send-email` mantiene POST público (opción 5b).** Con `zod` + `escapeHtml` + `Origin` + rate-limit en vez de hacerlo interno. Menor cambio, corta relay abierto e inyección.
- **Sí: rate-limit en memoria en `middleware.ts` (opción 3a).** Sin Redis en Railway, por grupos de ruta con 429 + `Retry-After`.
- **Sí: admin con token `ADMIN_*` + `timingSafeEqual` (opción 4a).** Cambio chico frente a login/sesión completa.
- **No: webhook MP con `x-signature` (opción 6b).** Va a spec futuro, aquí solo se endurece Brick + `process-payment`.
- **No: CSP con `nonce`/SRI (opción 7c).** Solo inventario documentado, implementación queda fuera.
- **No: TLS `rejectUnauthorized:true` (opción 8c).** Queda fuera, no se toca `src/shared/db/index.ts` en este spec.
- **No: CAPTCHA/Turnstile/honeypot.** Queda fuera aunque SPEC 12 lo descartó explícitamente, se reevaluará si el rate-limit no basta.
- **No: Redis/Upstash ni WAF.** Sobreingeniería para este corte.

## Risks

| Riesgo | Mitigación |
|---|---|
| Recálculo rechaza pagos legítimos por redondeo o precio cambiado a mitad de checkout | Tolerancia $1 y mensaje genérico con reintento, precio DB es fuente verdad |
| Rate-limit en memoria se reinicia con cada deploy/instancia en Railway | Límites conservadores por grupo, si hay múltiples instancias se pasa a Redis en otro spec |
| `Origin` check rompe clientes legítimos sin `Origin/Referer` (apps, curl) | Solo aplica a POST browser, permitir vacío en GET y documentar |
| Token `ADMIN_TOKEN` filtrado en logs o repo | Solo por env server, nunca `NEXT_PUBLIC_*`, comparar con `timingSafeEqual` |
| `escapeHtml` incompleto si se reutiliza en atributos | Se extiende a comilla simple y se usa solo en nodos de texto del email |

## What is **not** in this spec

- GTM como riesgo o cambio (operado por el dueño).
- Webhook de Mercado Pago con verificación de firma.
- CSP con `nonce`, HSTS, `X-Frame-Options` y SRI.
- TLS Postgres con `rejectUnauthorized:true`.
- Login, sesión o roles de admin.
- CAPTCHA, Turnstile o honeypot.
- Redis, WAF o bloqueo total de bots.

Cada uno de ellos, si se hace, va en su propio spec.
