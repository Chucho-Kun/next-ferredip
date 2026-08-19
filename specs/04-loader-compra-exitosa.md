# SPEC 04 — Loader de compra exitosa tras el pago

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-19
> **Objetivo:** Mostrar un overlay a pantalla completa que confirme la compra y anuncie el correo de confirmación desde que Mercado Pago aprueba el pago hasta que carga `/compra/pago-exitoso`, y eliminar los remontajes del Brick que hoy hacen reaparecer el formulario de pago en ese intervalo.

## Por qué existe este spec

Cuando el pago se aprueba, `MercadoPagoBrick.tsx:188` espera 1 s antes de llamar a `onSuccess`, que en
`MercadoPagoButton.tsx:66` hace `window.location.href = '/compra/pago-exitoso?payment_id=…'`. Durante
ese segundo, más todo lo que tarde en pintar la página de destino, el usuario sigue viendo el
formulario de Mercado Pago — y lo ve **reiniciarse**: el Brick se desmonta y se vuelve a crear vacío,
como si el pago no hubiera ocurrido. Es el peor momento posible para sembrar esa duda: el cargo ya se
hizo y el usuario está a un clic de volver a intentarlo o de cerrar la pestaña.

El remonte no es del SDK, es propio. Tres disparadores, todos confirmados en código:

1. **`onSuccess` es una función inline** (`MercadoPagoButton.tsx:65-67`), así que cambia de identidad
   en cada render del botón. Está en el arreglo de dependencias de `handleSubmit`
   (`MercadoPagoBrick.tsx:263`), y `onSubmit` es una de las props que el `useEffect` interno del SDK
   observa: si cambia, destruye el Brick y lo crea de nuevo. Esto anula precisamente el trabajo de
   `useMemo`/`useCallback` que los comentarios de las líneas 90-97 dicen haber añadido para evitarlo.
2. **`useDeliveryStore.getState().setFormData({ email })` en la línea 110**, es decir, *a mitad del
   submit*. El componente está suscrito al store completo (`useDeliveryStore()` sin selector, línea
   80), así que esa escritura provoca un re-render inmediato → nuevas dependencias → nuevo
   `handleSubmit` → remonte, justo dentro de la ventana de 1 s.
3. **Suscripción a los stores completos** (`useDeliveryStore()` línea 80, `useCartStore()` línea 82).
   Cualquier tecla en `EntregaComponent` re-renderiza el Brick durante todo el checkout.

Un overlay por encima resuelve lo que el usuario ve; el arreglo de las tres causas resuelve lo que
pasa por debajo, incluido el caso —fuera de la ventana del overlay— de escribir la dirección con el
formulario de pago ya montado.

## Alcance

**Dentro:**

- Componente nuevo `src/shared/components/cart/PagoProcesadoOverlay.tsx` (cliente): overlay
  `fixed inset-0`, con dos variantes de mensaje (`aprobado` y `pendiente`).
- `src/shared/components/cart/MercadoPagoBrick.tsx`:
  - Estado `estadoPago: 'idle' | 'aprobado' | 'pendiente'` que monta el overlay.
  - Quitar el `toast.success` de la línea 187 (lo sustituye el overlay).
  - Leer `deliveryStore` y `cartStore` con `getState()` dentro de `handleSubmit`/`handleReady` en vez
    de suscribirse a los stores completos.
  - `keepalive: true` en el `fetch` a `/api/send-email` de `sendEmailInBackground`.
- `src/shared/components/cart/MercadoPagoButton.tsx`: memoizar `onSuccess` con `useCallback`.
- Se conserva el `setTimeout` de 1 s antes del redirect.

**Fuera de alcance (para specs futuros):**

- Cambiar el mecanismo de navegación (`window.location.href` → `router.push`) o el destino de la
  redirección.
- Mandar el correo de confirmación desde el servidor (`process-payment`) en vez del cliente, o
  añadir un webhook / `notification_url` de Mercado Pago.
- Rehabilitar `resendEmail` en `PagoExitosoContent.tsx:46-96` (hoy comentado).
- Rediseñar la página `/compra/pago-exitoso` o darles contenido real a las páginas stub
  `pago-fallido` y `pago-pendiente`.
- Separar `in_process` a su propia URL de destino: por ahora sigue cayendo en `/compra/pago-exitoso`,
  solo cambia el texto del overlay.
- Unificar los cuatro spinners distintos que hoy conviven (`LoadingComponent.tsx`, la copia inline de
  `ResumenCompra.tsx:71-74`, la de `pago-exitoso/page.tsx:15` y el `Loader2` de
  `MercadoPagoButton.tsx:56`).
- Persistir la orden en base de datos.
- Cambiar el comportamiento de `handleReset()` en las ramas de pago rechazado.
- Tocar `EntregaComponent.tsx` o la validación del formulario de entrega.

## Modelo de datos

Este spec **no introduce estructuras en la base de datos** ni claves nuevas en `localStorage`
(`ferredip-last-order` y `ferredip-purchase-sent` de `src/utils/orderSnapshot.ts` siguen igual).

Estado local nuevo en `MercadoPagoBrick.tsx`:

```ts
// 'idle'      -> el usuario sigue en el formulario, sin overlay
// 'aprobado'  -> result.status === 'approved'
// 'pendiente' -> result.status === 'in_process'
type EstadoPago = 'idle' | 'aprobado' | 'pendiente';
const [estadoPago, setEstadoPago] = useState<EstadoPago>('idle');
```

Contrato del componente nuevo:

```ts
type Props = {
  variante: 'aprobado' | 'pendiente';
};
```

Copys, literales:

| variante | Título | Cuerpo | Pie |
|---|---|---|---|
| `aprobado` | ¡Compra exitosa! | Te enviaremos un correo de confirmación con el detalle de tu pedido. | No cierres esta ventana, te estamos redirigiendo… |
| `pendiente` | Estamos confirmando tu pago | Te enviaremos un correo en cuanto se acredite. | No cierres esta ventana, te estamos redirigiendo… |

Un estado rechazado **no** monta el overlay: `estadoPago` se queda en `'idle'` y siguen aplicando los
toasts y el `handleReset()` que ya existen.

## Plan de implementación

1. **Componente del overlay.** Crear `src/shared/components/cart/PagoProcesadoOverlay.tsx`
   (`'use client'`): `div` `fixed inset-0 z-[100]` con fondo `bg-white/95 backdrop-blur-sm`, centrado
   con flex, tarjeta con ícono (palomita en círculo verde `#16a34a` para `aprobado`, reloj ámbar para
   `pendiente`), título, cuerpo y, en el pie, un `Loader2` de `lucide-react` con `animate-spin` junto
   al texto de redirección. Un `useEffect` pone `document.body.style.overflow = 'hidden'` al montar y
   lo restaura al desmontar. `role="status"` y `aria-live="polite"` en el contenedor.
   *Verificación:* renderizarlo temporalmente con `variante="aprobado"` en la página de carrito y
   comprobar que cubre la pantalla completa, que el fondo no hace scroll y que ningún clic llega a lo
   que hay debajo.

2. **Montarlo al aprobarse el pago.** En `MercadoPagoBrick.tsx`, añadir el estado `estadoPago`;
   dentro de la rama `result.status === 'approved' || 'in_process'`, llamar
   `setEstadoPago(result.status === 'approved' ? 'aprobado' : 'pendiente')` **antes** de
   `sendEmailInBackground` y `saveOrderSnapshot`, borrar el `toast.success` de la línea 187 y dejar
   intactos el `setTimeout(1000)` y la llamada a `onSuccess`. En el `return`, renderizar
   `{estadoPago !== 'idle' && <PagoProcesadoOverlay variante={estadoPago} />}` como hermano de
   `<Payment>`.
   *Verificación:* con tarjeta de prueba aprobada (APRO), el overlay aparece de inmediato al enviar y
   permanece visible hasta que pinta `/compra/pago-exitoso`. Con tarjeta rechazada (OTHE) no aparece
   y sigue saliendo el toast de error de siempre.

3. **Memoizar `onSuccess`.** En `MercadoPagoButton.tsx`, envolver el handler en `useCallback` con
   dependencias vacías:
   `const handleSuccess = useCallback((data: any) => { window.location.href = \`/compra/pago-exitoso?payment_id=${data.payment_id}\` }, [])`,
   y pasar `onSuccess={handleSuccess}`.
   *Verificación:* con un `console.count('brick render')` temporal en el `onReady` del Brick, el
   ocultado del loader de 1 s (`setShowLoader(false)`) ya no dispara una recreación del formulario.

4. **Dejar de suscribirse a los stores completos.** En `MercadoPagoBrick.tsx`, quitar el destructuring
   de `useDeliveryStore()` (línea 80) y de `useCartStore()` (línea 82), y leer los datos con
   `useDeliveryStore.getState()` / `useCartStore.getState()` dentro de `handleSubmit` y `handleReady`,
   que son los dos únicos consumidores. Con eso, `handleSubmit` queda con dependencias
   `[onSuccess, handleReset]` — ambas ya estables — y el `setFormData({ email })` de la línea 110 deja
   de provocar un re-render del Brick (se conserva la llamada; simplemente ya no se escucha).
   *Verificación:* teclear en el formulario de entrega con el Brick ya montado no vuelve a dibujar el
   formulario de pago ni borra los datos de tarjeta ya escritos.

5. **`keepalive` en el correo.** Añadir `keepalive: true` al `fetch` de `sendEmailInBackground`
   (`MercadoPagoBrick.tsx:60-65`), para que el navegador termine la petición aunque el documento se
   descargue durante el `window.location.href`.
   *Verificación:* en la pestaña Red, la petición a `/api/send-email` aparece como completada aun
   cuando la navegación ocurre antes de su respuesta; llega el correo.

6. **Cierre.** Quitar los `console.count`/renders temporales y correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] Con una tarjeta de prueba aprobada (APRO), al enviar el formulario aparece un overlay a pantalla
      completa con «¡Compra exitosa!» y la mención al correo de confirmación.
- [ ] Ese overlay sigue visible durante toda la navegación a `/compra/pago-exitoso` — en ningún
      momento se ve el formulario de Mercado Pago vacío o reiniciándose.
- [ ] Ya no aparece el toast «¡Pago exitoso! Te hemos enviado un correo de confirmación».
- [ ] Con el overlay visible, hacer clic en cualquier parte de la página no activa nada de lo que hay
      debajo, y la página de fondo no hace scroll.
- [ ] Un pago con `status === 'in_process'` muestra «Estamos confirmando tu pago», no «¡Compra
      exitosa!», y redirige igual que hoy.
- [ ] Una tarjeta rechazada (OTHE, FUND, SECU) **no** muestra el overlay: sale el toast de error
      correspondiente y el formulario vuelve a estar disponible, como hoy.
- [ ] Teclear en el formulario de entrega con el Brick ya montado no vuelve a crear el formulario de
      pago ni pierde los datos de tarjeta ya capturados.
- [ ] El ocultado del loader de 1 s de `MercadoPagoButton` no provoca una segunda creación del Brick.
- [ ] En la pestaña Red, la petición a `/api/send-email` se completa aunque la redirección ocurra
      antes de su respuesta, y el correo de confirmación llega.
- [ ] El evento GA4 `purchase` se sigue disparando una sola vez en `/compra/pago-exitoso` y el carrito
      se sigue vaciando ahí.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** overlay `fixed inset-0` en vez de reemplazar el bloque del Brick en su lugar. Aunque el
  Brick se remonte por debajo, el usuario no lo ve; y bloquear la pantalla completa evita clics en el
  resto del checkout cuando el cobro ya se hizo.
- **Sí:** el overlay aparece solo cuando `process-payment` responde aprobado o en proceso, no desde
  que se envía el formulario. Se evaluó cubrir también el tiempo de proceso, pero el Brick ya tiene su
  propio indicador de envío y adelantar el mensaje obligaría a un estado intermedio que hay que
  retirar cuando el pago se rechaza — más superficie para un problema que no es el reportado.
- **Sí:** arreglar además las tres causas del remonte. Viven en los mismos dos archivos que ya se
  tocan, y sin ellas el overlay solo tapa el síntoma dentro de su ventana: el remonte por tecleo en el
  formulario de entrega seguiría borrando datos de tarjeta ya capturados.
- **Sí:** el estado del overlay vive en `MercadoPagoBrick`, no en `MercadoPagoButton`. El Brick es el
  único que conoce `result.status`, así que el botón no necesita aprender a distinguir `approved` de
  `in_process` y el contrato de `onSuccess` no cambia.
- **Sí:** `getState()` en vez de selectores de zustand. Ni `handleSubmit` ni `handleReady` necesitan
  re-renderizar cuando esos datos cambian — solo leerlos en el momento del evento. Con selectores
  seguirían entrando al arreglo de dependencias y el remonte volvería por la puerta de atrás.
- **Sí:** mantener el `setTimeout` de 1 s. Es lo que hoy da margen al `fetch` del correo y al
  `saveOrderSnapshot`; alargarlo solo agrega espera sobre una pantalla que ya explica lo que pasa, y
  el overlay permanece visible durante toda la carga de la página siguiente, así que el mensaje se
  alcanza a leer.
- **Sí:** `keepalive: true` en el `fetch` del correo. Es una línea, es exactamente el mecanismo que
  existe para peticiones que deben sobrevivir a la descarga del documento, y hoy el único seguro es
  ese segundo de `setTimeout`.
- **No:** mensaje único para `approved` e `in_process`. Decirle «¡Compra exitosa!» a alguien cuyo pago
  todavía no acredita el banco genera exactamente la llamada que este spec quiere evitar.
- **No:** mostrar el correo del comprador en el overlay. Depende de que el Brick siempre devuelva
  `payer.email` y expone el dato en pantalla; el texto genérico funciona en todos los casos.
- **No:** `beforeunload` para advertir al cerrar durante el redirect. Chrome muestra un diálogo
  genérico que se lee como que algo salió mal, y el pago ya está cobrado y el snapshot ya está en
  `localStorage`: recargar no pierde nada.
- **No:** conservar el `toast.success`. Duplicaría el mensaje del overlay a un tercio del tamaño.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Quitar la suscripción a los stores rompe algún consumo no evidente de esos datos en el Brick | Solo `handleSubmit` y `handleReady` los usan (verificado en las líneas 100-278); ambos los leen dentro del evento, donde `getState()` devuelve exactamente lo mismo. |
| El overlay queda pegado si la navegación falla (red caída al pedir `/compra/pago-exitoso`) | El pago ya está cobrado y el snapshot en `localStorage`; recargar la pestaña lleva al carrito con el overlay ya desmontado. Se acepta: cubrirlo requeriría un temporizador de rescate que compite con la navegación. |
| `document.body.style.overflow` se queda en `hidden` si el componente no alcanza a desmontarse | La navegación es una recarga completa del documento, que descarta cualquier estilo inline; el `useEffect` de limpieza cubre el caso de desmontaje normal. |
| `keepalive` limita el cuerpo de la petición a 64 KB | El cuerpo es el detalle del pedido en JSON; un carrito tendría que llevar cientos de renglones para acercarse. Si algún día se supera, el fallo es el mismo que hoy (correo no enviado), no uno nuevo. |
| `z-[100]` compite con el portal de `react-hot-toast` o con el iframe del Brick | Se verifica en pantalla que el overlay quede encima del formulario; los toasts de error solo ocurren cuando el overlay no está montado. |
| Memoizar `onSuccess` con dependencias vacías congela una referencia obsoleta | El handler solo lee `data.payment_id`, que llega por argumento; no captura nada del render. |

## Lo que **no** está en este spec

- Cambiar el mecanismo o el destino de la redirección tras el pago.
- Mandar el correo desde el servidor, o añadir webhook de Mercado Pago.
- Rehabilitar el reenvío de correo comentado en `PagoExitosoContent.tsx`.
- Rediseñar `/compra/pago-exitoso` ni dar contenido a `pago-fallido` / `pago-pendiente`.
- Unificar los cuatro spinners duplicados del proyecto.
- Persistir la orden en base de datos.

Cada uno, si se hace, va en su propio spec.
