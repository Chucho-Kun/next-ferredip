# Spec: Eventos de e-commerce GA4 vía dataLayer

| Campo | Valor |
|---|---|
| Estado | Implementado |
| Dependencias | Ninguna (primera spec del proyecto) |
| Fecha | 2026-07-30 |
| Objetivo | Instrumentar los 8 eventos de e-commerce de GA4 (`view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `add_shipping_info`, `begin_checkout`, `purchase`) mediante pushes al `dataLayer` del contenedor GTM ya instalado. |

---

## Context

El sitio ya carga Google Tag Manager (`GTM-M4B5NXB`, hardcodeado en `src/shared/components/GoogleTagManager.tsx`, montado desde `app/(public)/layout.tsx`), pero **no emite un solo evento de e-commerce**. Hoy no hay forma de medir el embudo: no sabemos cuántos usuarios ven un listado, abren una ficha, agregan al carrito o abandonan en el checkout, ni el revenue real atribuible.

Esta spec agrega los 8 eventos estándar de GA4 Enhanced Ecommerce empujándolos a `window.dataLayer` desde los componentes que ya existen. **No** se toca la configuración de GTM ni se crea un tag de GA4 — eso se hace desde la interfaz de GTM una vez que los eventos aparezcan en Vista Previa.

Tres realidades del código condicionan el diseño y ya fueron resueltas con el usuario:

1. `GroupCard.tsx` es **una tarjeta**, no la lista — los contenedores son `CategoryResults.tsx` y `TrademarckResults.tsx` (server components).
2. El botón de basura en `ProductComponent.tsx` **no borra**: abre un toast de confirmación en `useDeleteToast.tsx`.
3. `PagoExitosoContent.tsx` llama `clearCart()` al montar y la llegada a esa página es una **recarga completa** (`window.location.href`), así que el carrito no es una fuente de datos confiable para `purchase`.

---

## Alcance

### Dentro del alcance

- Utilidad compartida para empujar al `dataLayer` y mapear productos al formato de item de GA4.
- Los 8 eventos en los componentes indicados.
- `view_item_list` y `select_item` **solo** en páginas de categoría (`/categoria/[slug]`) y marca (`/marca/[slug]`).
- Snapshot de la orden en `localStorage` para que `purchase` sobreviva a la recarga y al `clearCart()`.
- Deduplicación de `purchase` por `payment_id`.

### Fuera del alcance (explícito)

- `ProductsSection` (home y `/productos`), `RecommendedProducts`, `RelatedProducts`, `RecentViewProducts` — candidatas a una spec posterior.
- Migrar `GTM-M4B5NXB` a la variable `NEXT_PUBLIC_GTM_ID`.
- Configurar tags, triggers o variables **dentro** de GTM.
- Consent Mode / banner de cookies.
- Eventos de servidor (Measurement Protocol) y webhooks de Mercado Pago.
- `refund`, `view_cart`, `add_to_wishlist`, `search`.
- Tests automatizados (el proyecto no tiene runner configurado).

---

## Modelo de datos

### Item de GA4 (`GA4Item`)

Los productos codifican la variante dentro de `descripcion` como `"Nombre base | variante"`. El mapeo acordado:

| Campo GA4 | Origen |
|---|---|
| `item_id` | `producto.id` |
| `item_name` | `descripcion.split('|')[0].trim()` |
| `item_variant` | `descripcion.split('|')[1]?.trim()` |
| `item_brand` | `producto.marca` |
| `item_category` | `producto.categoria` |
| `price` | `precio` parseado a número (quita `$` y `,`) |
| `quantity` | cantidad (1 por defecto) |
| `index` | posición en la lista (solo listados) |
| `item_list_id` / `item_list_name` | contexto de lista (solo listados y `select_item`) |

Ejemplo:

```ts
// descripcion: 'LIJA DE AGUA | GRANO 220'
{ item_id: '12345', item_name: 'LIJA DE AGUA', item_variant: 'GRANO 220',
  item_brand: 'AUSTROMEX', item_category: 'ABRASIVOS', price: 38.5, quantity: 2 }
```

### Convención de `value`, `shipping` y `tax`

Moneda fija: `MXN`. Los precios en BD **ya incluyen IVA (16%)**.

- `add_to_cart`, `remove_from_cart`, `view_item`, `select_item`: `value` = subtotal de los items del evento (sin envío).
- `begin_checkout`: `value` = `subTotal()` del carrito (sin envío).
- `add_shipping_info`: `value` = `subTotal()`, más `shipping_tier`.
- `purchase`: `value` = `totalPrice()` (subtotal + envío), `shipping` = `shippingCost()`, `tax` = `subtotal - subtotal / 1.16`.

### `item_list_id` / `item_list_name`

| Página | `item_list_id` | `item_list_name` |
|---|---|---|
| `/categoria/[slug]` | `categoria_${slug}` | slug en mayúsculas con espacios (mismo string del `<h2>`) |
| `/marca/[slug]` | `marca_${slug}` | ídem |

### Snapshot de orden (`localStorage`)

```ts
// clave: 'dipemsa-last-order'
type OrderSnapshot = {
  paymentId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  createdAt: number
}

// clave: 'dipemsa-purchase-sent'  →  string[] de paymentId ya reportados (últimos 20)
```

---

## Plan de implementación

Cada paso deja el sistema funcional y verificable de forma aislada en Vista Previa de GTM.

### 1. Utilidad de dataLayer y mapeo — `src/utils/gtm.ts` (nuevo)

- `pushEcommerce(event, ecommerce)`: hace `window.dataLayer.push({ ecommerce: null })` para limpiar el objeto previo (requisito de GA4) y después `push({ event, ecommerce })`. Guarda contra SSR (`typeof window === 'undefined'`).
- `toGA4Item(producto, extras?)`: recibe cualquier forma de producto del proyecto (`ResultadosType`, `CartItem`, `Variant` de `GroupCard`) y devuelve un `GA4Item`.
- `itemsValue(items)`: suma `price * quantity`.
- `taxFromSubtotal(subtotal)`: `subtotal - subtotal / 1.16`.
- Constante `CURRENCY = 'MXN'`.

Añadir a `src/utils/formatPrice.ts` un `parsePrecio(precio: string): number` que reutilice la limpieza `replace(/[$,]/g, '')` que hoy está duplicada en `cartStore.subTotal` y en `totalxcantidad`. `gtm.ts` lo importa.

### 2. `view_item_list` — `ViewItemListTracker` (nuevo) + los dos contenedores

- Crear `src/shared/components/analytics/ViewItemListTracker.tsx` (`'use client'`): recibe `items: GA4Item[]`, `listId`, `listName`; en un `useEffect` con guarda `useRef` dispara **un solo** `view_item_list` por montaje.
- `src/shared/components/CategoryResults.tsx` y `src/shared/components/TrademarckResults.tsx` (server components): mapear `groupedProducts` a items GA4 usando `group.variants[0]` como representante de cada grupo, con `index` correlativo, y montar el tracker antes del grid.

### 3. `select_item` — `src/shared/components/GroupCard.tsx`

- Aceptar props nuevas `listId` y `listName` (pasadas desde los dos contenedores del paso 2).
- Agregar `onClick` al `<Link>` de "VER PRODUCTO" que dispare `select_item` con `selectedVariant` (la variante elegida en el `<select>`, no la primera del grupo) más `item_list_id` / `item_list_name`.
- El push es síncrono y el `<Link>` navega con router de cliente, así que no hace falta retrasar la navegación.

### 4. `view_item` — `src/shared/components/ProductCard.tsx`

- `useEffect` con dependencia `[producto.id]`, **no** solo montaje: el componente ya documenta (líneas 30-38) que la navegación entre variantes reutiliza la misma instancia sin remount, así que un efecto de montaje perdería los cambios de variante.
- Payload: un item construido con `toGA4Item(producto)`, `value` = precio, `currency`.

### 5. `add_to_cart` — `src/shared/components/ProductCard.tsx`

- Dentro de `handleAddToCart`, después de `addToCart(...)` y junto al `toast.success` existente.
- `quantity` = el `quantity` local del selector; `value` = `precio * quantity`.

### 6. `remove_from_cart` — `src/hooks/useDeleteToast.tsx` + `ProductComponent.tsx`

- Cambiar la firma de `deleteItem` para que reciba el `CartItem` completo en vez de `(id, titulo, descripcion)`. El nombre para el toast se sigue armando con `item.titulo` / `item.descripcion`.
- Disparar `remove_from_cart` dentro del `onClick` del botón **"Sí, eliminar"**, junto a `removeFromCart(id)`. Si el usuario cancela no hay evento.
- `src/shared/components/cart/ProductComponent.tsx` (línea 95): actualizar la llamada a `deleteItem(item)`.

### 7. `add_shipping_info` — `src/shared/components/cart/EntregaComponent.tsx`

- `useEffect` sobre `formData` con debounce (~1s) y guarda `useRef` de "ya disparado".
- Condición de disparo: los 6 campos obligatorios de `deliveryStore.validateForm` (`nombre`, `apellidos`, `direccion`, `ciudad`, `cp`, `telefono`) con valor no vacío.
- Payload: items del carrito (`useCartStore.items`), `value` = `subTotal()`, `shipping_tier` = `shippingCost() === 0 ? 'Envio gratis' : 'Envio estandar'`.
- Requiere que el componente lea `useCartStore` (hoy solo usa `useDeliveryStore`).

### 8. `begin_checkout` + snapshot — `src/shared/components/cart/MercadoPagoBrick.tsx`

- En el callback `onReady` existente (línea 204), disparar `begin_checkout` con los items del carrito y `value` = `subTotal()`. Guarda `useRef` para no re-disparar: `handleReset` incrementa `resetKey`, lo que remonta el Brick y volvería a llamar `onReady`.
- En el bloque `result.status === 'approved' || 'in_process'` (línea 103), **antes** del `setTimeout` que llama `onSuccess`, escribir el `OrderSnapshot` en `localStorage['dipemsa-last-order']` con `result.payment_id`, `items`, `subTotal()`, `shippingCost()`, `totalPrice()`.

### 9. `purchase` — `src/shared/components/cart/PagoExitosoContent.tsx`

- Crear `src/utils/orderSnapshot.ts` (nuevo) con `saveOrderSnapshot`, `readOrderSnapshot`, `clearOrderSnapshot`, `wasPurchaseSent(paymentId)`, `markPurchaseSent(paymentId)`. Lo usan el paso 8 y este.
- Reescribir el `useEffect` existente (líneas 17-21) para que, en orden: lea el snapshot → verifique que `snapshot.paymentId === paymentId` de la URL → verifique `!wasPurchaseSent(paymentId)` → dispare `purchase` → `markPurchaseSent` → `clearOrderSnapshot()` → `clearCart()`.
- Payload `purchase`: `transaction_id` = `paymentId`, `value` = `snapshot.total`, `shipping` = `snapshot.shipping`, `tax` = `taxFromSubtotal(snapshot.subtotal)`, `currency`, `items`.
- Si no hay snapshot o el `payment_id` no coincide, **no** disparar el evento y limpiar el carrito igual que hoy (comportamiento actual intacto).

---

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` pasan sin errores nuevos.
- [x] En `/categoria/[slug]` y `/marca/[slug]` se dispara **exactamente un** `view_item_list` por carga, con tantos items como tarjetas renderizadas y con `index` correlativo desde 0.
- [x] Al hacer clic en "VER PRODUCTO" se dispara **un** `select_item` cuyo `item_id` corresponde a la variante seleccionada en el `<select>`, no siempre a la primera del grupo.
- [x] Al abrir `/producto/[id]/[slug]` se dispara `view_item`; al cambiar de variante con el `<select>` se dispara **otro** `view_item` con el nuevo `item_id`.
- [x] "AGREGAR AL CARRITO" con cantidad 3 dispara `add_to_cart` con `quantity: 3` y `value` = precio × 3.
- [x] Clic en el ícono de basura **no** dispara nada; solo "Sí, eliminar" dispara `remove_from_cart`. Cancelar no genera evento.
- [x] `add_shipping_info` se dispara **una sola vez** al completar los 6 campos obligatorios, e incluye `shipping_tier` = `Envio gratis` cuando el subtotal ≥ $5000.
- [x] `begin_checkout` se dispara al cargar el formulario de Mercado Pago y **no** se repite cuando un pago rechazado provoca `handleReset`.
- [x] Tras un pago aprobado en sandbox, `/compra/pago-exitoso` dispara `purchase` con los items reales de la orden (no vacío), `transaction_id` = `payment_id` de la URL y `value` = subtotal + envío.
- [x] Recargar `/compra/pago-exitoso` con el mismo `payment_id` **no** vuelve a disparar `purchase`.
- [x] Entrar directo a `/compra/pago-exitoso` sin snapshot no dispara `purchase` ni rompe la página.
- [x] Todos los pushes van precedidos de `dataLayer.push({ ecommerce: null })`.
- [x] Todos los eventos usan `currency: 'MXN'` y `price`/`value` numéricos (no strings con `$`).
- [x] Ninguna página lanza errores de hidratación ni de `window is not defined` en `npm run build`.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| `view_item_list` desde un tracker cliente montado por los contenedores | Un `view_item_list` por cada `GroupCard` | Generaría 20-40 eventos por página y GA4 los reportaría como listas separadas, inutilizando el reporte de listas. |
| `view_item_list` sin `IntersectionObserver` | Reporte por visibilidad real con buffer y debounce | Mucho más complejo de implementar y depurar en GTM; el listado completo cabe en pocas pantallas. |
| `remove_from_cart` al confirmar en el toast | Al clic en el ícono de basura | El ícono solo abre una confirmación; disparar ahí contaría eliminaciones canceladas e inflaría el embudo. |
| `add_shipping_info` al completar los campos obligatorios | Al primer tecleo (petición literal original) | La semántica de GA4 es "el usuario envió su información de envío"; disparar al primer tecleo hace el embudo incomparable con benchmarks. |
| `purchase` desde snapshot en `localStorage` + dedupe por `payment_id` | Leer el carrito antes de `clearCart()`, o disparar en el Brick antes de redirigir | El carrito no sobrevive a una recarga de `/pago-exitoso`, y un push justo antes de `window.location.href` puede perderse. |
| `value` de `purchase` incluye envío, con `tax` desglosado a 16% | `value` = solo subtotal, o sin `tax` | El revenue de GA4 debe cuadrar con lo cobrado por Mercado Pago. |
| `item_name` = nombre base, `item_variant` = parte tras el `\|` | Descripción completa como `item_name` | Permite agrupar reportes por producto base sin perder la variante; respeta la convención de datos del proyecto. |
| `item_id` = `producto.id` | `producto.clave` (SKU) | `id` es la clave real usada en URLs, imágenes y carrito. |
| Solo `GroupCard` para listados | Incluir `ProductsSection`, `Recommended`, `Related`, `RecentView` | Mantiene el alcance acotado y el QA en GTM manejable; se difiere a otra spec. |
| No tocar el ID de GTM hardcodeado | Migrar a `NEXT_PUBLIC_GTM_ID` | Refactor no relacionado que arriesgaría el tracking en producción. |

---

## Riesgos identificados

1. **`purchase` se dispara también en `in_process`.** `MercadoPagoBrick` redirige a `/pago-exitoso` tanto con `approved` como con `in_process` (pagos en OXXO / contingencia). El revenue de GA4 incluirá pagos aún no acreditados. Mitigación futura: guardar el `status` en el snapshot y decidir en base a él, o conciliar con webhooks.
2. **Sin `localStorage` no hay `purchase`.** Navegación privada estricta o bloqueadores de storage → snapshot no disponible → evento perdido. Es una degradación silenciosa aceptada: la página funciona igual.
3. **Bloqueadores de anuncios** impiden la carga de GTM. Los pushes al `dataLayer` no fallan (el array existe), pero los eventos nunca llegan a GA4. Fuera de nuestro control.
4. **Cambiar la firma de `deleteItem`** rompe cualquier otro consumidor del hook. Hoy solo lo usa `ProductComponent.tsx`, verificado por grep; hay que re-verificarlo al implementar.
5. **`add_shipping_info` con autocompletado del navegador** puede disparar el evento casi instantáneamente al abrir el carrito. El debounce de 1s reduce el ruido pero no lo elimina.
6. **Doble `view_item` en desarrollo.** React Strict Mode en `npm run dev` ejecuta los efectos dos veces; las guardas `useRef` cubren el caso, pero conviene validar los conteos finales en un build de producción, no en dev.

---

## Verificación

1. `npm run build` — sin errores de tipos ni de SSR.
2. `npm run dev` y activar **Vista Previa** en el contenedor `GTM-M4B5NXB` apuntando a `http://localhost:3000`.
3. Recorrer el embudo completo verificando en el panel de Vista Previa (pestaña Data Layer) que cada evento aparezca una sola vez y con el payload correcto:
   `/categoria/[slug]` → clic en VER PRODUCTO → ficha de producto → cambiar variante → agregar al carrito → `/carrito-de-compra` → eliminar un producto (cancelar y luego confirmar) → llenar datos de entrega → Pagar con Mercado Pago → pagar con tarjeta de prueba de sandbox → `/compra/pago-exitoso`.
4. Recargar `/compra/pago-exitoso` y confirmar que **no** aparece un segundo `purchase`.
5. Abrir `/compra/pago-exitoso` sin parámetros en una pestaña limpia y confirmar que la página renderiza sin errores en consola y sin `purchase`.
