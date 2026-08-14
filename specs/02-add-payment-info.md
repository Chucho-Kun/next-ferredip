# Spec: Evento GA4 add_payment_info en el Brick de Mercado Pago

| Campo | Valor |
|---|---|
| Estado | Implementado |
| Dependencias | `02-add-payment-info` depende de `01-ga4-ecommerce-events` (reutiliza `pushEcommerce`, `CURRENCY`, `round2` de `src/utils/gtm.ts`, y el mismo patrón de `useRef` de deduplicación usado en `begin_checkout`) |
| Fecha | 2026-07-30 |
| Objetivo | Instrumentar el evento `add_payment_info` de GA4 en el `onSubmit` del Brick de pago de Mercado Pago (`MercadoPagoBrick.tsx`), mapeando el `paymentType` del Brick a una etiqueta legible en español, disparado una sola vez por sesión de checkout. |

---

## Context

La spec `01-ga4-ecommerce-events` instrumentó 8 eventos estándar de GA4 Enhanced Ecommerce, pero dejó fuera `add_payment_info` porque no estaba claro cómo capturar de forma confiable el método de pago elegido dentro del Brick de Mercado Pago (`@mercadopago/sdk-react`).

Revisando los tipos del SDK (`bricks/payment/type.d.ts`), el único callback donde el método de pago llega tipado y documentado es `onSubmit`, vía `formData.paymentType` / `formData.selectedPaymentMethod` (`TPaymentBrickPaymentType`). Existe también `onRenderNextStep(currentStep: string)`, que se dispara en cada cambio de paso del Brick y podría capturar la selección temprana del método de pago, pero `currentStep` es un `string` sin valores documentados — no es una base confiable para esta spec.

`onSubmit` se dispara cuando el usuario ya llenó el formulario y le dio clic a pagar, no en el instante exacto en que elige "tarjeta" vs "efectivo" en la pantalla inicial del Brick. Esto coincide, sin embargo, con la semántica oficial de GA4 para este evento: *"el cliente envió su información de pago"*.

También se confirmó por grep que el flujo real de checkout es `ResumenCompra.tsx` → `MediosdePagoComponent` → `MercadoPagoButton` → `MercadoPagoBrick`. `WhatsAppButton.tsx` también envuelve `MercadoPagoBrick`, pero no está importado en ningún lugar del código — es una vía muerta.

---

## Alcance

### Dentro del alcance

- Disparo de `add_payment_info` dentro del callback `onSubmit` de `src/shared/components/cart/MercadoPagoBrick.tsx`, antes de la llamada a `/api/mercadopago/process-payment`.
- Mapeo de `formData.paymentType` (SDK de Mercado Pago) a una etiqueta en español para el campo `payment_type` de GA4.
- Deduplicación por sesión de checkout con `useRef` (mismo patrón que `beginCheckoutSent` — no se repite si `handleReset()` remonta el Brick tras un pago rechazado, ni si el usuario reintenta el submit).
- Payload `value`/`items`/`currency` con la misma convención que `begin_checkout` (subtotal del carrito, sin envío).

### Fuera del alcance (explícito)

- `WhatsAppButton.tsx` — no está importado en ningún lugar del código, es una vía muerta; no se instrumenta.
- Cualquier intento de capturar la selección temprana del método de pago vía `onRenderNextStep` (se descartó por no tener valores tipados/documentados).
- Nuevos tags/triggers dentro de la interfaz de GTM.
- Migrar `GTM-M4B5NXB` a `NEXT_PUBLIC_GTM_ID` (fuera de alcance también en la spec 01).
- Tests automatizados (el proyecto sigue sin runner configurado).

---

## Modelo de datos

### Mapeo `payment_type` (Mercado Pago → GA4)

Nueva utilidad en `src/utils/gtm.ts`: `paymentTypeLabel(paymentType: string): string`, respaldada por un mapa constante:

```ts
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  creditCard: 'Tarjeta de crédito',
  debitCard: 'Tarjeta de débito',
  ticket: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
};

export function paymentTypeLabel(paymentType: string): string {
  return PAYMENT_TYPE_LABELS[paymentType] ?? paymentType;
}
```

- Los 4 valores mapeados son los únicos habilitados hoy en `customization.paymentMethods` de `MercadoPagoBrick.tsx` (`ticket`, `creditCard`, `debitCard`, `bankTransfer`).
- Si el Brick alguna vez devuelve un `paymentType` no mapeado (`atm`, `prepaidCard`, `wallet_purchase`, `onboarding_credits`, o uno nuevo que MP agregue), el fallback es pasar el valor crudo tal cual — no se descarta el evento ni se etiqueta como "Otro" genérico, para no perder visibilidad de un caso inesperado en el reporte.

### Payload del evento

Disparado en `onSubmit`, con el mismo criterio de `value`/`items` que `begin_checkout` (spec 01): subtotal sin envío.

```ts
pushEcommerce('add_payment_info', {
  currency: CURRENCY,
  value: round2(subTotal()),
  payment_type: paymentTypeLabel(formData.paymentType),
  items: items.map((item) => toGA4Item(item, { quantity: item.cantidad })),
});
```

### Deduplicación

Nuevo `useRef(false)` en `MercadoPagoBrick.tsx`, ej. `addPaymentInfoSent`, mismo patrón que `beginCheckoutSent`: se marca en `true` la primera vez que se dispara el evento dentro de `onSubmit`, y no se vuelve a disparar en reintentos de submit dentro de la misma sesión de checkout (incluyendo los que ocurren tras un `handleReset()` por pago rechazado).

---

## Plan de implementación

### 1. Mapeo de `payment_type` — `src/utils/gtm.ts`

- Agregar la constante `PAYMENT_TYPE_LABELS` y la función `paymentTypeLabel(paymentType: string): string` tal como se definieron en el modelo de datos.
- Sin cambios visibles todavía (la función queda sin consumidores hasta el paso 2), pero es verificable de forma aislada si se desea (llamada directa con cada valor de `TPaymentBrickPaymentType`).

### 2. `add_payment_info` — `src/shared/components/cart/MercadoPagoBrick.tsx`

- Importar `paymentTypeLabel` desde `@/src/utils/gtm`.
- Agregar `const addPaymentInfoSent = useRef(false)` junto al `beginCheckoutSent` existente.
- Al inicio del callback `onSubmit` (antes del `fetch('/api/mercadopago/process-payment', ...)`), si `!addPaymentInfoSent.current`: marcar `addPaymentInfoSent.current = true` y disparar `pushEcommerce('add_payment_info', ...)` con el payload definido en el modelo de datos, usando `formData.paymentType` que ya llega como primer argumento de `onSubmit`.
- Verificable en Vista Previa de GTM: elegir cada método de pago habilitado (tarjeta crédito, débito, efectivo, transferencia), confirmar la etiqueta en español correcta y que el evento no se repite si el pago es rechazado y se reintenta.

---

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` pasan sin errores nuevos.
- [x] Al enviar el Brick con tarjeta de crédito se dispara `add_payment_info` con `payment_type: "Tarjeta de crédito"`.
- [x] Al enviar con tarjeta de débito, `payment_type: "Tarjeta de débito"`.
- [x] Al enviar con efectivo (ticket), `payment_type: "Efectivo"`.
- [x] Al enviar con transferencia bancaria, `payment_type: "Transferencia bancaria"`.
- [x] `value` = `subTotal()` del carrito (sin envío), numérico, `currency: "MXN"`.
- [x] `add_payment_info` se dispara **exactamente una vez** por sesión de checkout, incluso si el pago es rechazado y el usuario reintenta el submit (vía `handleReset`).
- [x] El push va precedido de `dataLayer.push({ ecommerce: null })`.
- [x] Ningún error de hidratación ni de `window is not defined` en `npm run build`.

---

## Decisiones tomadas y descartadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Disparar en `onSubmit` | Disparar en `onRenderNextStep` (selección temprana del método) | `onSubmit` expone `paymentType`/`selectedPaymentMethod` tipados y documentados; `onRenderNextStep` solo recibe un `string` sin valores documentados, habría que inferirlos en vivo. Además `onSubmit` coincide con la semántica oficial de GA4 para este evento ("el cliente envió su información de pago"). |
| Mapear `paymentType` a etiquetas en español (`"Tarjeta de crédito"`, etc.) | Pasar el valor crudo del SDK (`creditCard`, `ticket`, ...) | Consistencia con `shipping_tier` de la spec 01 (`"Envio gratis"`/`"Envio estandar"`) y legibilidad directa en reportes de GA4, sin traducir mentalmente valores internos del SDK. |
| Fallback: pasar el valor crudo si `paymentType` no está en el mapa | Etiquetarlo como `"Otro"` genérico | Evita perder visibilidad de un método de pago inesperado (nuevo valor del SDK, o uno de los 4 no habilitados hoy: `atm`, `prepaidCard`, `wallet_purchase`, `onboarding_credits`) en vez de agruparlo silenciosamente. |
| Solo instrumentar `MercadoPagoBrick.tsx` | Instrumentar también `WhatsAppButton.tsx` | `WhatsAppButton.tsx` no está importado en ningún lugar del código — es una vía muerta, no forma parte del flujo real de checkout. |
| Deduplicar con `useRef` por sesión de checkout, igual que `begin_checkout` | Disparar en cada intento de submit (incluyendo reintentos tras pago rechazado) | Mismo criterio que `begin_checkout`: un pago rechazado que dispara `handleReset()` no debe inflar el embudo con eventos repetidos. |
| `value`/`items` con la misma convención que `begin_checkout` (subtotal, sin envío) | Usar `totalPrice()` (subtotal + envío) | En el momento de `onSubmit` el resultado del pago aún no se conoce; se mantiene el mismo criterio ya usado en `begin_checkout` para no reportar un total que podría no concretarse. |

---

## Riesgos identificados

1. **Valores nuevos del SDK de Mercado Pago.** Si MP agrega un método de pago nuevo o cambia el string interno de `paymentType`, el mapeo no lo reconocerá y caerá al fallback (valor crudo en inglés/snake_case dentro de un campo que normalmente trae español). Mitigación: revisar `PAYMENT_TYPE_LABELS` si se habilitan nuevos métodos en `customization.paymentMethods`.
2. **Solo verificable con submit real del Brick.** Igual que `purchase` en la spec 01, para probar los 4 valores de `payment_type` hay que completar el flujo de pago en sandbox con cada método (tarjeta de prueba, cuenta de prueba para transferencia, etc.), no basta con abrir la página.
