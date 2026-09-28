# SPEC 06 — Registro de compras de Mercado Pago en base de datos

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-24
> **Objetivo:** Guardar cada intento de pago que Mercado Pago responda en una tabla nueva `ordenes` de la base de Railway, escrita desde `process-payment`, para dejar de depender del correo de confirmación como único registro de las ventas.

## Por qué existe este spec

Hoy la única constancia de una compra es el correo. `MercadoPagoBrick.tsx:161-177` llama a `sendEmailInBackground`, que hace un `fetch` *fire and forget* a `/api/send-email` desde el navegador del comprador. Ese registro depende de tres cosas que pueden fallar sin aviso: que el navegador alcance a mandar la petición antes del `window.location.href` (hoy se cubre con `keepalive: true` y un `setTimeout` de 1 s), que Resend acepte y entregue el mensaje, y que nadie borre el correo de la bandeja de `ventas.grupoceic@gmail.com` (la copia oculta de `send-email/route.ts:20`). Si cualquiera de las tres falla, la venta ocurrió, el dinero se cobró y no queda rastro consultable.

Además, del lado de los pagos **rechazados** no existe absolutamente ningún registro: `MercadoPagoBrick.tsx:198-263` muestra un toast según `status_detail` y ahí termina. Nadie puede responder hoy cuántos carritos se cayeron por fondos insuficientes o por CVV mal escrito.

El lugar correcto para registrar no es el cliente. `app/api/mercadopago/process-payment/route.ts:75` ya tiene, en el servidor, la respuesta autoritativa de Mercado Pago, y en el mismo `body` ya recibe los `items` del carrito (`MercadoPagoBrick.tsx:138-145`) y los datos de entrega (`deliveryData`, línea 146). Falta solo escribir esa información en una tabla.

El SPEC 04 dejó "persistir la orden en base de datos" explícitamente fuera de alcance. Este spec es esa continuación.

## Alcance

**Dentro:**

- Archivo de schema nuevo `src/shared/db/schema/ordenes.ts` con la tabla `ordenes`.
- Creación de la tabla en la BD de Railway aplicando el `CREATE TABLE` a mano contra `DATABASE_URL`.
- Archivo nuevo `src/shared/db/ordenes.ts` con la función `registrarOrden()`, que hace el `INSERT` y **nunca lanza**: atrapa su propio error y lo loguea.
- `app/api/mercadopago/process-payment/route.ts`: llamar a `registrarOrden()` después de `payment.create()` y antes del `NextResponse.json` de éxito.
- `src/shared/components/cart/MercadoPagoBrick.tsx`: agregar `subtotal`, `shipping` y `total` al body que `handleSubmit` ya manda a `/api/mercadopago/process-payment` (líneas 132-148), tomados de los mismos `subTotal()`, `shippingCost()` y `totalPrice()` que ya se leen en la línea 105.
- Se registran los tres desenlaces que Mercado Pago responde: `approved`, `in_process` y rechazado.

**Fuera de alcance (para specs futuros):**

- Cualquier pantalla o endpoint para consultar las órdenes guardadas. La verificación de este spec es con `npm run db:studio`. La vista de administración va en su propio spec, ya con datos reales que mostrar.
- Autenticación del grupo de rutas `app/(admin)/` — hoy no tiene ninguna y este spec no agrega rutas ahí.
- Quitar, cambiar o condicionar el correo de confirmación. Sigue exactamente igual, incluida la copia oculta a `ventas.grupoceic@gmail.com`.
- Registrar las excepciones de `payment.create()` (el `catch` de `process-payment/route.ts:85-90`). Sin `payment_id` no son reconciliables con Mercado Pago y son fallas de infraestructura, no compras.
- Webhook / `notification_url` de Mercado Pago para actualizar una orden `in_process` cuando el banco la acredite. La fila queda con el estatus que MP respondió en el momento del cobro.
- Registrar la creación de la preferencia (`app/api/mercadopago/preference/route.ts`). Una preferencia no es una compra.
- Guardar el carrito abandonado o cualquier evento previo al submit del pago.
- Normalizar los renglones en una tabla `orden_items` aparte, o relacionarlos por FK con `productos_`.
- Reportes, exportación a CSV, o cruces de ventas por producto/marca.
- Tocar el flujo de pago en efectivo o ticket (hoy deshabilitados, ver commits `b5b6e2b` y `5837727`).

## Modelo de datos

Tabla nueva `ordenes`, en la misma base de Railway que `productos_`. Archivo `src/shared/db/schema/ordenes.ts`:

```ts
import { pgTable, serial, varchar, integer, numeric, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export type OrdenItem = {
  id: string;
  titulo: string;
  descripcion: string;
  cantidad: number;
  precio: number;     // unitario, ya normalizado a número
};

export const ordenes = pgTable('ordenes', {
  id: serial('id').primaryKey(),

  // Identidad del pago en Mercado Pago
  mp_payment_id: varchar('mp_payment_id', { length: 40 }).unique(),
  mp_status: varchar('mp_status', { length: 30 }),
  mp_status_detail: varchar('mp_status_detail', { length: 60 }),
  payment_method_id: varchar('payment_method_id', { length: 30 }),
  installments: integer('installments'),

  // Comprador y entrega
  nombre: varchar('nombre', { length: 100 }),
  apellidos: varchar('apellidos', { length: 100 }),
  email: varchar('email', { length: 150 }),
  telefono: varchar('telefono', { length: 30 }),
  direccion: text('direccion'),
  entre_calles: text('entre_calles'),
  ciudad: varchar('ciudad', { length: 100 }),
  cp: varchar('cp', { length: 10 }),

  // Montos
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
  envio: numeric('envio', { precision: 12, scale: 2 }),
  total: numeric('total', { precision: 12, scale: 2 }),

  // Contenido del pedido
  items: jsonb('items').$type<OrdenItem[]>().default([]),

  // Seguimiento interno, editable a mano
  estatus_pedido: varchar('estatus_pedido', { length: 20 }).default('nuevo'),

  createdat: timestamp('createdat').defaultNow(),
});
```

DDL equivalente, que es lo que se aplica a mano contra `DATABASE_URL`:

```sql
CREATE TABLE IF NOT EXISTS ordenes (
  id                serial PRIMARY KEY,
  mp_payment_id     varchar(40) UNIQUE,
  mp_status         varchar(30),
  mp_status_detail  varchar(60),
  payment_method_id varchar(30),
  installments      integer,
  nombre            varchar(100),
  apellidos         varchar(100),
  email             varchar(150),
  telefono          varchar(30),
  direccion         text,
  entre_calles      text,
  ciudad            varchar(100),
  cp                varchar(10),
  subtotal          numeric(12,2),
  envio             numeric(12,2),
  total             numeric(12,2),
  items             jsonb DEFAULT '[]'::jsonb,
  estatus_pedido    varchar(20) DEFAULT 'nuevo',
  createdat         timestamp DEFAULT now()
);
```

Convenciones:

- **`mp_payment_id` es UNIQUE.** Es la protección contra duplicados: si por reintento o doble submit se intenta insertar dos veces el mismo pago, Postgres rechaza el segundo `INSERT` y `registrarOrden()` lo atrapa y loguea, sin afectar la respuesta al cliente.
- **Los montos van como `numeric`, no como `varchar`.** `productos_` guarda `precio`/`precioant` como `varchar` por historia del catálogo; aquí los valores ya llegan como número desde `subTotal()`, `shippingCost()` y `totalPrice()` de `cartStore.ts`, así que no hay motivo para volver a stringificarlos. Nota práctica: Drizzle devuelve las columnas `numeric` como `string` al leerlas, así que cualquier consulta futura debe pasarlas por `parsePrecio`/`formatMoney` de `src/utils/formatPrice.ts` antes de mostrarlas.
- **`precio` dentro de `items` es número.** El body que hoy manda `MercadoPagoBrick.tsx:143` ya normaliza (`Number(String(item.precio).replace(/[$,]/g, ""))`); se guarda ese mismo valor, no el string con `$`.
- **`estatus_pedido` no lo escribe la aplicación.** Nace en `'nuevo'` y por ahora se mueve a mano (`preparando`, `enviado`, `entregado`) desde `npm run db:studio`. No hay código que lo lea ni lo actualice en este spec.
- **Nada en `localStorage` cambia.** `dipemsa-cart`, `dipemsa-last-order` y `dipemsa-purchase-sent` siguen igual.

Campos nuevos en el body que `MercadoPagoBrick.tsx` manda a `process-payment` (los tres son números, ya calculados en el cliente):

```ts
subtotal: subTotal(),
shipping: shippingCost(),
total: totalPrice(),
```

## Plan de implementación

1. **Crear el schema de Drizzle.** Nuevo archivo `src/shared/db/schema/ordenes.ts` con la tabla `ordenes` y el tipo `OrdenItem` tal como quedaron arriba. No se modifica `schema/productList.ts`.
   *Verificación:* `npm run lint` pasa sin errores de tipos.

2. **Crear la tabla en Railway.** Ejecutar el `CREATE TABLE` de la sección anterior a mano contra `DATABASE_URL` (por ejemplo con `psql "$DATABASE_URL" -f <archivo.sql>`). **No correr `npx drizzle-kit push` ni `npx drizzle-kit migrate`**: según CLAUDE.md, `push` intenta borrar la tabla legada `productos` que tiene datos reales, y `migrate` falla porque `drizzle.__drizzle_migrations` está vacía.
   *Verificación:* `npm run db:studio` muestra la tabla `ordenes` vacía, con las 20 columnas.

3. **Crear la función de escritura.** Nuevo archivo `src/shared/db/ordenes.ts`, siguiendo el patrón de funciones sueltas de `queries.ts`/`productos.ts` (no hay capa de repositorio en este proyecto). Exporta `registrarOrden(datos)`, que importa el `db` ya existente de `src/shared/db/index.ts` (nunca crear un pool nuevo), hace `db.insert(ordenes).values(...)` y envuelve todo en un `try/catch` que loguea `console.error('❌ No se pudo registrar la orden', { mp_payment_id, error })` y **no relanza**. La firma recibe los datos ya listos para insertar; el mapeo desde la respuesta de Mercado Pago vive en el paso 5.
   *Verificación:* `npm run lint` pasa.

4. **Mandar los montos desde el cliente.** En `MercadoPagoBrick.tsx`, dentro del `JSON.stringify` de `handleSubmit` (líneas 135-147), agregar `subtotal: subTotal()`, `shipping: shippingCost()` y `total: totalPrice()` junto a `items` y `deliveryData`. Los tres ya están desestructurados en la línea 105.
   *Verificación:* en la pestaña Red del navegador, el payload del `POST` a `/api/mercadopago/process-payment` incluye los tres campos con los mismos valores que muestra `ResumenCompra`.

5. **Registrar la orden en el servidor.** En `app/api/mercadopago/process-payment/route.ts`, después del `const response = await payment.create(...)` (línea 75) y antes del `return NextResponse.json(...)` (línea 79), armar el objeto de la orden y hacer `await registrarOrden(...)`:
   - `mp_payment_id: String(response.id)`, `mp_status: response.status`, `mp_status_detail: response.status_detail`, `payment_method_id: formData.payment_method_id`, `installments: Number(formData.installments) || 1`.
   - Comprador y entrega desde `body.deliveryData` (`nombre`, `apellidos`, `telefono`, `direccion`, `entreCalles` → `entre_calles`, `ciudad`, `cp`) y el correo desde `formData.payer?.email`.
   - Montos desde `body.subtotal`, `body.shipping` y `body.total`; `total` cae de vuelta a `transactionAmount` si no viene.
   - `items` desde `body.items`, quedándose con `id`, `titulo`/`title`, `descripcion`/`description`, `cantidad`/`quantity` y `precio`/`unit_price`.
   El `await` es deliberado: la respuesta al cliente espera al `INSERT`, que es una escritura de una fila contra el mismo pool que ya se usa en todo el sitio. Como `registrarOrden` no lanza, un fallo de BD no puede cambiar lo que se le responde al comprador. **No se toca el `catch` de la línea 85** — las excepciones de Mercado Pago siguen sin registrarse.
   *Verificación:* pagar con tarjeta de prueba APRO en `npm run dev` y confirmar en `npm run db:studio` que aparece una fila con `mp_status = 'approved'`, los renglones correctos en `items` y los montos que mostraba el resumen del carrito.

6. **Verificar los desenlaces restantes y cerrar.** Repetir el flujo con tarjeta OTHE (rechazo) y confirmar que también se inserta una fila, con `mp_status = 'rejected'` y `mp_status_detail = 'cc_rejected_other_reason'`, sin que cambie nada de lo que ve el usuario (mismo toast, mismo `handleReset`). Confirmar que el correo de confirmación sigue llegando igual en el caso aprobado. Correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] La tabla `ordenes` existe en la BD de Railway con las columnas descritas en el modelo de datos.
- [ ] La tabla legada `productos` (sin guion bajo) sigue existiendo con sus datos, y `productos_` no cambió.
- [ ] Un pago aprobado (tarjeta APRO) inserta exactamente una fila con `mp_status = 'approved'` y el `mp_payment_id` que devolvió Mercado Pago.
- [ ] Un pago rechazado (tarjeta OTHE) inserta una fila con `mp_status = 'rejected'` y su `mp_status_detail`.
- [ ] La fila guarda nombre, apellidos, teléfono, dirección, entre calles, ciudad y CP del formulario de entrega, y el correo con el que se pagó.
- [ ] `subtotal`, `envio` y `total` de la fila coinciden con los montos que mostró `ResumenCompra` en el checkout.
- [ ] `items` contiene un objeto por renglón del carrito, con `id`, `titulo`, `descripcion`, `cantidad` y `precio` unitario numérico.
- [ ] `estatus_pedido` nace en `'nuevo'` en toda fila nueva.
- [ ] Con la base de datos inalcanzable (por ejemplo con un `DATABASE_URL` inválido), un pago aprobado se sigue procesando: el cliente recibe `status: 'approved'`, se ve el overlay del SPEC 04, llega el correo y en el log del servidor aparece el error del registro.
- [ ] Reintentar el registro del mismo `mp_payment_id` no crea una segunda fila.
- [ ] El correo de confirmación sigue llegando al comprador y con copia oculta a `ventas.grupoceic@gmail.com`, sin cambios de contenido.
- [ ] El evento GA4 `purchase` y el vaciado del carrito en `/compra/pago-exitoso` siguen funcionando igual.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones

- **Sí:** tabla nueva en la misma base de Railway, no una base separada. Reusa el `pg.Pool` único de `src/shared/db/index.ts` (ya afinado a `max: 8` por el SPEC 03 de memoria), no agrega variables de entorno ni costo de infraestructura, y deja abierta la posibilidad de cruzar órdenes con `productos_` en una sola consulta.
- **Sí:** escribir desde `process-payment/route.ts`. Es el único punto del flujo que corre en el servidor con la respuesta real de Mercado Pago en la mano. Un endpoint nuevo llamado desde el cliente heredaría exactamente la fragilidad que este spec busca eliminar: si el navegador se cierra, no hay registro.
- **Sí:** registrar también los pagos rechazados. Es información que hoy no existe en ningún lado y llega gratis en el mismo punto del código; permite ver cuántas ventas se caen y por qué motivo (`status_detail`).
- **Sí:** una sola tabla con `items` en `jsonb`, en vez de `ordenes` + `orden_items`. Sigue el patrón que ya usa `related_products` en `productos_`, es un solo `INSERT` atómico (nada de una orden a medias si falla el segundo insert) y alcanza para reconstruir cualquier pedido. Postgres sabe consultar dentro de `jsonb` si algún día hace falta.
- **No:** guardar la respuesta cruda en `mp_response`. El spec original la incluía como respaldo irrecuperable del pago, pero se decidió sobre la marcha (2026-08-24) que no se iba a usar y que era demasiada información sin valor inmediato; se acepta perder ese respaldo detallado a cambio de una tabla más simple.
- **Sí:** `registrarOrden()` atrapa su propio error y no relanza. El cobro ya ocurrió en Mercado Pago antes de que se intente el `INSERT`; devolverle un 500 al cliente le mostraría un pago fallido por un cargo que sí se hizo. Perder el registro es malo; hacerle creer al comprador que no le cobraron es peor.
- **Sí:** `await` en el registro en vez de fire and forget. El `INSERT` es una fila contra un pool ya caliente; soltarlo sin `await` en un entorno serverless arriesga que la función termine antes de que la escritura se complete, que es justo el modo de falla que este spec elimina.
- **Sí:** `UNIQUE` en `mp_payment_id`. Es la defensa contra duplicados sin escribir nada de lógica: el segundo intento lo rechaza Postgres y `registrarOrden` lo absorbe.
- **Sí:** mandar `subtotal`, `shipping` y `total` explícitos desde el cliente. Derivarlos en el servidor obligaría a reimplementar ahí la regla de envío gratis ≥ $5000 de `cartStore.shippingCost()`, y cualquier desfase entre las dos implementaciones quedaría escondido dentro de los datos guardados.
- **Sí:** montos como `numeric(12,2)`. `productos_` usa `varchar` para precios por historia del catálogo, pero aquí los valores nacen como números; guardarlos como texto obligaría a limpiarlos otra vez en cada consulta futura.
- **Sí:** `CREATE TABLE` a mano. Es lo que ya indica CLAUDE.md para esta base: `drizzle-kit push` intenta borrar la tabla legada `productos` con datos reales, y `drizzle-kit migrate` falla porque la tabla de tracking está vacía. Un `CREATE TABLE` aditivo no toca nada de lo existente.
- **Sí:** columna `estatus_pedido` desde ahora, aunque nada la escriba todavía. Separa "el banco aprobó" de "ya lo surtimos", y agregarla hoy cuesta una línea de DDL mientras que agregarla después es otro `ALTER TABLE` sobre producción.
- **No:** registrar las excepciones de `payment.create()`. Sin `mp_payment_id` la fila no se puede reconciliar contra Mercado Pago, y son fallas técnicas del proveedor, no compras: mezclarlas en la misma tabla ensucia el registro de ventas.
- **No:** webhook de Mercado Pago para cerrar los `in_process`. Es una superficie nueva (URL pública, verificación de firma, idempotencia) que merece su propio spec; por ahora la fila conserva el estatus del momento del cobro, que es más de lo que hay hoy.
- **No:** quitar ni condicionar el correo. Es el canal que el equipo ya usa para operar; la BD se suma como registro, no lo reemplaza. Cuando la tabla tenga historia real se podrá decidir otra cosa, en otro spec.
- **No:** pantalla de administración en este spec. Requiere resolver antes la autenticación del grupo `app/(admin)/`, que hoy no tiene ninguna. Se hace después, con datos reales que mostrar.
- **No:** relacionar los renglones con `productos_` por FK. Un producto puede cambiar de precio o desaparecer del catálogo; la orden debe conservar lo que se vendió y a qué precio, congelado en el `jsonb`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El `INSERT` agrega latencia a la respuesta del pago | Es una fila contra el pool ya abierto y caliente del mismo proceso. El `setTimeout` de 1 s de `MercadoPagoBrick.tsx:194` lo absorbe por completo, y el overlay del SPEC 04 ya cubre visualmente esa ventana. |
| El pool (`max: 8`, afinado en el SPEC 03 por memoria en Railway) se satura por las escrituras | Una escritura de una fila por pago, contra un sitio de catálogo que hace muchas más lecturas que ventas. El impacto sobre el pool es despreciable frente al tráfico de navegación. |
| Un `deliveryData` incompleto rompe el `INSERT` | Todas las columnas son nullable salvo `id`; `validateForm()` de `deliveryStore` ya bloquea el checkout sin nombre, dirección, ciudad, CP ni teléfono. En el peor caso queda una fila con campos vacíos, que sigue siendo mejor registro que ninguno. |
| Aplicar el DDL a mano en producción se hace en el momento equivocado | Es puramente aditivo (`CREATE TABLE IF NOT EXISTS`): no altera ni borra ninguna tabla existente, así que puede correrse con el sitio arriba. Lo que no debe correrse es `drizzle-kit push`. |
| El schema de Drizzle y la tabla real se desincronizan porque no hay migración versionada | La tabla nace en este spec y el archivo `ordenes.ts` es su única definición en el repo; el DDL de este documento queda como constancia de lo que se aplicó. Cualquier cambio futuro repite el mismo camino (`ALTER TABLE` a mano + edición del schema). |
| Un `in_process` que el banco acredita después queda para siempre como pendiente en la tabla | Aceptado: sin webhook, la fila refleja el estatus del momento del cobro. `mp_payment_id` permite verificar el estado real en el panel de Mercado Pago cuando haga falta. |

## Lo que **no** está en este spec

- Pantalla, endpoint o reporte para consultar las órdenes guardadas.
- Autenticación para el grupo de rutas `app/(admin)/`.
- Webhook / `notification_url` de Mercado Pago.
- Cambiar, condicionar o eliminar el correo de confirmación.
- Registrar preferencias, carritos abandonados o excepciones de la API de Mercado Pago.
- Normalizar los renglones en una tabla aparte o relacionarlos con `productos_`.
- Exportación a CSV o cruces de ventas por producto/marca.

Cada uno, si se hace, va en su propio spec.
