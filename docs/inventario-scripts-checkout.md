# Inventario de scripts en checkout — SPEC 18

Documento corto de los scripts de terceros que cargan en el flujo de compra.
GTM queda permitido sin cambios (operado por el dueño). No se implementa CSP en este spec.

| script | dominio | dueño | por qué está en checkout | verificado |
|---|---|---|---|---|
| `GTM-NM38ZR5Z` (`googletagmanager.com/gtm.js`, `ns.html`) | `www.googletagmanager.com` | propio (dueño del sitio) | medición ecommerce GA4 (`begin_checkout`, `add_payment_info`, `purchase`) vía `GoogleTagManager.tsx` + `src/utils/gtm.ts` | sí |
| SDK Mercado Pago (`@mercadopago/sdk-react` → `sdk.mercadopago.com`) | `sdk.mercadopago.com` | Mercado Pago | render del Brick de pago (`MercadoPagoBrick.tsx`, `initMercadoPago` + `getIdentificationTypes` para precarga) | sí |
| Widget asistente (`@n8n/chat@1.39.2` bundle ESM + CSS) | `cdn.jsdelivr.net` | jsDelivr (CDN) / código propio (workflow n8n) | burbuja flotante de ayuda en checkout (`ChatAsistente.tsx`, `next/script` `lazyOnload`, versión pineada `1.39.2`) | sí |

Notas:

- GTM lo opera el dueño del sitio; cualquier tag nuevo dentro del contenedor debe revisarlo él.
- El bundle de `@n8n/chat` está pineado a `1.39.2` por reproducibilidad; no se instaló por npm (arrastra 426 dependencias).
- CSP con `nonce`/SRI queda fuera de este spec y va en spec futuro.
