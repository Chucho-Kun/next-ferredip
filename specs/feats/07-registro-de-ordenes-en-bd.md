# SPEC 07 — Registro de compras de Mercado Pago en base de datos

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-24
> **Objetivo:** Guardar cada intento de pago que Mercado Pago responda en una tabla nueva `ordenes` de la base de Railway, escrita desde `process-payment`, para dejar de depender del correo de confirmación como único registro de las ventas.

## Por qué existe este spec

Hoy la única constancia de una compra es el correo. `MercadoPagoBrick.tsx:164-180` llama a `sendEmailInBackground`, que hace un `fetch` *fire and forget* a `/api/send-email` desde el navegador del comprador. Ese registro depende de tres cosas que pueden fallar sin aviso: que el navegador alcance a mandar la petición antes del `window.location.href` (hoy se cubre con `keepalive: true` y el `setTimeout` de 1 s de la línea 197), que Resend acepte y entregue el mensaje, y que nadie borre el correo de la bandeja de `gameroapp@gmail.com` (la copia oculta de `send-email/route.ts:20`). Si cualquiera de las tres falla, la venta ocurrió, el dinero se cobró y no queda rastro consultable.

Del lado de los pagos **rechazados** no existe ningún registro: `MercadoPagoBrick.tsx:203-265` muestra un toast según `status_detail` y ahí termina. Nadie puede responder hoy cuántos carritos se cayeron por fondos insuficientes o por CVV mal escrito.

El lugar correcto para registrar no es el cliente. `app/api/mercadopago/process-payment/route.ts:75` ya tiene, en el servidor, la respuesta autoritativa de Mercado Pago, y en el mismo `body` ya recibe los renglones del carrito y los datos de entrega (`MercadoPagoBrick.tsx:138-150`). Falta solo escribir esa información en una tabla.

El SPEC 04 dejó fuera de alcance persistir la orden; este spec es esa continuación.

## Alcance

**Dentro:**

- Archivo de schema nuevo `src/shared/db/schema/ordenes.ts` con la tabla `ordenes`.
- Creación de la tabla en la BD de Railway aplicando el `CREATE TABLE` a mano contra `DATABASE_URL`.
- Archivo nuevo `src/shared/db/ordenes.ts` con `registrarOrden()`, que hace el `INSERT` y **nunca lanza**: atrapa su propio error y lo loguea.
- `app/api/mercadopago/process-payment/route.ts`: llamar a `registrarOrden()` después de `payment.create()` y antes del `NextResponse.json` de éxito.
- `src/shared/components/cart/MercadoPagoBrick.tsx`: agregar `subtotal`, `shipping` y `total` al body del `POST` (líneas 138-150), y agregar `clave` y `marca` a cada renglón del `items.map` (líneas 141-148).
- Se registran los tres desenlaces que Mercado Pago responde: `approved`, `in_process` y rechazado.

**Fuera de alcance (para specs futuros):**

- Cualquier pantalla o endpoint para consultar las órdenes guardadas. La verificación de este spec es con `npm run db:studio`.
- Autenticación del grupo de rutas `app/(admin)/` — hoy no tiene ninguna y este spec no agrega rutas ahí.
- Quitar, cambiar o condicionar el correo de confirmación. Sigue exactamente igual, incluida la copia oculta a `gameroapp@gmail.com`.
- Registrar las excepciones de `payment.create()` (el `catch` de `process-payment/route.ts:85-90`). Sin `payment_id` no son reconciliables con Mercado Pago y son fallas de infraestructura, no compras.
- Webhook / `notification_url` de Mercado Pago para actualizar una orden `in_process` cuando el banco la acredite.
- Registrar la creación de la preferencia (`app/api/mercadopago/preference/route.ts`). Una preferencia no es una compra.
- Guardar el carrito abandonado o cualquier evento previo al submit del pago.
- Normalizar los renglones en una tabla `orden_items` aparte, o relacionarlos por FK con `productos_`.
- Reportes, exportación a CSV o cruces de ventas por producto/marca.
- Tocar el flujo de pago con ticket/efectivo (hoy deshabilitado en `PAYMENT_CUSTOMIZATION`, `MercadoPagoBrick.tsx:46-53`).

## Modelo de datos

Tabla nueva `ordenes`, en la misma base de Railway que `productos_`. Archivo `src/shared/db/schema/ordenes.ts`:

```ts
import { pgTable, serial, varchar, integer, numeric, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export type OrdenItem = {
  id: string;
  titulo: string;
  descripcion: string;
  clave: string;
  marca: string;
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
- **Los montos van como `numeric`, no como `varchar`.** `productos_` guarda `precio`/`precioant` como `varchar` por historia del catálogo; aquí los valores ya llegan como número desde `subTotal()`, `shippingCost()` y `totalPrice()` de `cartStore.ts`. Nota práctica: Drizzle devuelve las columnas `numeric` como `string` al leerlas, así que cualquier consulta futura debe pasarlas por `parsePrecio`/`formatMoney` de `src/utils/formatPrice.ts` antes de mostrarlas.
- **`precio` dentro de `items` es número.** El body que hoy manda `MercadoPagoBrick.tsx:146` ya normaliza (`Number(String(item.precio).replace(/[$,]/g, ""))`); se guarda ese mismo valor, no el string con `$`. Ojo con `precio`: desde 2026-08-14 puede traer decimales.
- **`clave` y `marca` se congelan en el renglón.** `clave` es el código Truper con el que se surte el pedido y `marca` permite cruzar ventas sin volver a consultar `productos_`. Ambos ya viven en `CartItem` (`cartStore.ts:4-13`) y hoy simplemente no se mandan al servidor.
- **`estatus_pedido` no lo escribe la aplicación.** Nace en `'nuevo'` y por ahora se mueve a mano (`preparando`, `enviado`, `entregado`) desde `npm run db:studio`. No hay código que lo lea ni lo actualice en este spec.
- **Nada en `localStorage` cambia.** `ferredip-cart`, `ferredip-last-order` y `ferredip-purchase-sent` siguen igual.

Campos nuevos en el body que `MercadoPagoBrick.tsx` manda a `process-payment`:

```ts
subtotal: subTotal(),
shipping: shippingCost(),
total: totalPrice(),
```

Y dentro del `items.map` existente, dos campos más por renglón:

```ts
clave: item.clave ?? "",
marca: item.marca ?? "",
```

## Plan de implementación

1. **Crear el schema de Drizzle.** Nuevo archivo `src/shared/db/schema/ordenes.ts` con la tabla `ordenes` y el tipo `OrdenItem` tal como quedaron arriba. No se modifica `schema/productList.ts`.
   *Verificación:* `npm run lint` pasa sin errores de tipos.

2. **Crear la tabla en Railway.** Ejecutar el `CREATE TABLE` de la sección anterior a mano contra `DATABASE_URL`, con TablePlus (el mismo camino que CLAUDE.md ya recomienda para el import del catálogo) o con un script node de una sola vez usando el driver `pg` que ya está instalado. **No correr `npx drizzle-kit migrate`**: `drizzle.__drizzle_migrations` está vacía (0 filas), así que intentaría re-aplicar las 6 migraciones desde `0000_worried_manta.sql` y reventaría al crear `productos_` de nuevo. `drizzle-kit push` tampoco: compara todo el schema contra la base y cualquier drift de `productos_` respecto a `productList.ts` se convertiría en un `ALTER TABLE` no pedido sobre la tabla del catálogo.
   *Verificación:* `npm run db:studio` muestra la tabla `ordenes` vacía, con sus 20 columnas.

3. **Crear la función de escritura.** Nuevo archivo `src/shared/db/ordenes.ts`, siguiendo el patrón de funciones sueltas de `queries.ts` (no hay capa de repositorio en este proyecto). Exporta `registrarOrden(datos)`, que importa el `db` ya existente de `src/shared/db/index.ts` (nunca crear un pool nuevo), hace `db.insert(ordenes).values(...)` y envuelve todo en un `try/catch` que loguea `console.error('❌ No se pudo registrar la orden', { mp_payment_id, error })` y **no relanza**. La firma recibe los datos ya listos para insertar; el mapeo desde la respuesta de Mercado Pago vive en el paso 5.
   *Verificación:* `npm run lint` pasa.

4. **Mandar montos y campos de renglón desde el cliente.** En `MercadoPagoBrick.tsx`, dentro del `JSON.stringify` de `handleSubmit` (líneas 138-150): agregar `subtotal: subTotal()`, `shipping: shippingCost()` y `total: totalPrice()` junto a `items` y `deliveryData` — los tres ya están desestructurados en la línea 107 —, y agregar `clave` y `marca` a cada objeto del `items.map`. Esos dos campos extra no se filtran a Mercado Pago: `process-payment/route.ts:43-51` reconstruye `additional_info.items` campo por campo con una lista fija, así que ignora cualquier propiedad adicional. Sí hay que extender el tipo local `PaymentItemIn` (líneas 30-39) con `clave?: string` y `marca?: string` para poder leerlos en el servidor.
   *Verificación:* en la pestaña Red del navegador, el payload del `POST` a `/api/mercadopago/process-payment` incluye los tres montos, y cada renglón trae `clave` y `marca`.

5. **Registrar la orden en el servidor.** En `app/api/mercadopago/process-payment/route.ts`, después del `const response = await payment.create(...)` (línea 75) y antes del `return NextResponse.json(...)` (línea 79), armar el objeto de la orden y hacer `await registrarOrden(...)`:
   - `mp_payment_id: String(response.id)`, `mp_status: response.status`, `mp_status_detail: response.status_detail`, `payment_method_id: formData.payment_method_id`, `installments: Number(formData.installments) || 1`.
   - Comprador y entrega desde `body.deliveryData` (`nombre`, `apellidos`, `telefono`, `direccion`, `entreCalles` → `entre_calles`, `ciudad`, `cp`) y el correo desde `formData.payer?.email` (es el autoritativo: es el que el comprador escribió en el Brick y el mismo que `MercadoPagoBrick.tsx:118` guarda en `deliveryStore`).
   - Montos desde `body.subtotal`, `body.shipping` y `body.total`; `total` cae de vuelta a `transactionAmount` (línea 16) si no viene.
   - `items` desde `rawItems`, mapeando `id`, `title` → `titulo`, `description` → `descripcion`, `clave`, `marca`, `quantity` → `cantidad` y `unit_price` → `precio`.
   El `await` es deliberado: la respuesta al cliente espera al `INSERT`, que es una escritura de una fila contra el mismo pool que ya usa todo el sitio. Como `registrarOrden` no lanza, un fallo de BD no puede cambiar lo que se le responde al comprador. **No se toca el `catch` de la línea 85.**
   *Verificación:* pagar con tarjeta de prueba APRO en `npm run dev` y confirmar en `npm run db:studio` que aparece una fila con `mp_status = 'approved'`, los renglones correctos en `items` y los montos que mostraba `ResumenCompra`.

6. **Verificar los desenlaces restantes y cerrar.** Repetir el flujo con tarjeta OTHE (rechazo) y confirmar que también se inserta una fila, con `mp_status = 'rejected'` y `mp_status_detail = 'cc_rejected_other_reason'`, sin que cambie nada de lo que ve el usuario (mismo toast, mismo `handleReset`). Confirmar que en el caso aprobado sigue llegando el correo, sigue apareciendo el overlay del SPEC 04 (`PagoProcesadoOverlay`) y sigue guardándose el snapshot en `ferredip-last-order`. Correr `npm run lint` y `npm run build`.

## Criterios de aceptación

- [ ] La tabla `ordenes` existe en la BD de Railway con las columnas descritas en el modelo de datos.
- [ ] `productos_` no cambió: mismas columnas y mismo número de filas que antes del spec.
- [ ] Un pago aprobado (tarjeta APRO) inserta exactamente una fila con `mp_status = 'approved'` y el `mp_payment_id` que devolvió Mercado Pago.
- [ ] Un pago rechazado (tarjeta OTHE) inserta una fila con `mp_status = 'rejected'` y su `mp_status_detail`.
- [ ] La fila guarda nombre, apellidos, teléfono, dirección, entre calles, ciudad y CP del formulario de entrega, y el correo con el que se pagó.
- [ ] `subtotal`, `envio` y `total` de la fila coinciden con los montos que mostró `ResumenCompra` en el checkout, incluido el caso de envío gratis (subtotal ≥ $5000 → `envio = 0`).
- [ ] `items` contiene un objeto por renglón del carrito, con `id`, `titulo`, `descripcion`, `clave`, `marca`, `cantidad` y `precio` unitario numérico.
- [ ] Un producto con precio decimal (p. ej. `12.5`) se guarda como `12.5` en `items`, no truncado ni como string con `$`.
- [ ] `estatus_pedido` nace en `'nuevo'` en toda fila nueva.
- [ ] Con la base de datos inalcanzable (por ejemplo con un `DATABASE_URL` inválido), un pago aprobado se sigue procesando: el cliente recibe `status: 'approved'`, se ve el overlay del SPEC 04, llega el correo y en el log del servidor aparece el error del registro.
- [ ] Reintentar el registro del mismo `mp_payment_id` no crea una segunda fila.
- [ ] El correo de confirmación sigue llegando al comprador y con copia oculta a `gameroapp@gmail.com`, sin cambios de contenido.
- [ ] El evento GA4 `purchase` y el vaciado del carrito en `/compra/pago-exitoso` siguen funcionando igual.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones

- **Sí:** tabla nueva en la misma base de Railway, no una base separada. Reusa el `pg.Pool` único de `src/shared/db/index.ts` (`max: 8`), no agrega variables de entorno ni costo de infraestructura, y deja abierta la posibilidad de cruzar órdenes con `productos_` en una sola consulta.
- **Sí:** escribir desde `process-payment/route.ts`. Es el único punto del flujo que corre en el servidor con la respuesta real de Mercado Pago en la mano. Un endpoint nuevo llamado desde el cliente heredaría exactamente la fragilidad que este spec busca eliminar.
- **Sí:** registrar también los pagos rechazados. Es información que hoy no existe en ningún lado y llega gratis en el mismo punto del código; permite ver cuántas ventas se caen y por qué motivo (`status_detail`).
- **Sí:** una sola tabla con `items` en `jsonb`, en vez de `ordenes` + `orden_items`. Sigue el patrón que ya usa `related_products` en `productos_`, es un solo `INSERT` atómico y alcanza para reconstruir cualquier pedido. Postgres sabe consultar dentro de `jsonb` si algún día hace falta.
- **Sí:** guardar `clave` y `marca` en cada renglón, a diferencia del spec equivalente del otro proyecto. `clave` es lo que se usa para surtir con Truper y para encontrar la foto; `marca` permite cruces de ventas. Ya viven en `CartItem`, así que el costo es mandarlos en el body.
- **No:** guardar la respuesta cruda en `mp_response`. Es demasiada información sin valor inmediato; con `mp_payment_id` siempre se puede consultar el detalle real en el panel de Mercado Pago.
- **Sí:** `registrarOrden()` atrapa su propio error y no relanza. El cobro ya ocurrió en Mercado Pago antes de que se intente el `INSERT`; devolverle un 500 al cliente le mostraría un pago fallido por un cargo que sí se hizo. Perder el registro es malo; hacerle creer al comprador que no le cobraron es peor.
- **Sí:** `await` en el registro en vez de fire and forget. El `INSERT` es una fila contra un pool ya caliente; soltarlo sin `await` arriesga que el handler termine antes de que la escritura se complete, que es justo el modo de falla que este spec elimina.
- **Sí:** `UNIQUE` en `mp_payment_id`. Es la defensa contra duplicados sin escribir lógica: el segundo intento lo rechaza Postgres y `registrarOrden` lo absorbe.
- **Sí:** mandar `subtotal`, `shipping` y `total` explícitos desde el cliente. Derivarlos en el servidor obligaría a reimplementar ahí la regla de envío gratis ≥ $5000 de `cartStore.shippingCost()`, y cualquier desfase entre las dos implementaciones quedaría escondido dentro de los datos guardados.
- **Sí:** montos como `numeric(12,2)`. `productos_` usa `varchar` para precios por historia del catálogo, pero aquí los valores nacen como números.
- **Sí:** `CREATE TABLE` a mano. `drizzle-kit migrate` falla porque `drizzle.__drizzle_migrations` está vacía (verificado: 0 filas) y re-aplicaría desde `0000`; `drizzle-kit push` compara todo el schema y podría proponer alterar `productos_` por drift. Un `CREATE TABLE` aditivo no toca nada de lo existente.
- **Sí:** nombre `ordenes`, sin guion bajo. El `_` de `productos_` es herencia del catálogo importado, no una convención que valga la pena propagar.
- **Sí:** columna `estatus_pedido` desde ahora, aunque nada la escriba todavía. Separa "el banco aprobó" de "ya lo surtimos", y agregarla hoy cuesta una línea de DDL mientras que agregarla después es otro `ALTER TABLE` sobre producción.
- **No:** registrar las excepciones de `payment.create()`. Sin `mp_payment_id` la fila no se puede reconciliar contra Mercado Pago, y son fallas técnicas del proveedor, no compras.
- **No:** webhook de Mercado Pago para cerrar los `in_process`. Es una superficie nueva (URL pública, verificación de firma, idempotencia) que merece su propio spec.
- **No:** quitar ni condicionar el correo. Es el canal que el equipo ya usa para operar; la BD se suma como registro, no lo reemplaza.
- **No:** pantalla de administración en este spec. Requiere resolver antes la autenticación del grupo `app/(admin)/`, que hoy no tiene ninguna.
- **No:** relacionar los renglones con `productos_` por FK. Un producto puede cambiar de precio o desaparecer del catálogo; la orden debe conservar lo que se vendió y a qué precio, congelado en el `jsonb`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El `INSERT` agrega latencia a la respuesta del pago | Es una fila contra el pool ya abierto del mismo proceso. El `setTimeout` de 1 s de `MercadoPagoBrick.tsx:197` lo absorbe por completo, y el overlay del SPEC 04 ya cubre visualmente esa ventana. |
| El pool (`max: 8`) se satura por las escrituras | Una escritura de una fila por pago, contra un sitio de catálogo que hace muchas más lecturas que ventas. Despreciable frente al tráfico de navegación. |
| Un `deliveryData` incompleto rompe el `INSERT` | Todas las columnas son nullable salvo `id`; `validateForm()` de `deliveryStore` ya bloquea el checkout sin nombre, apellidos, dirección, ciudad, CP ni teléfono (`entreCalles` sí puede ir vacío). En el peor caso queda una fila con campos vacíos, que sigue siendo mejor registro que ninguno. |
| Aplicar el DDL a mano en producción se hace en el momento equivocado | Es puramente aditivo (`CREATE TABLE IF NOT EXISTS`): no altera ni borra ninguna tabla existente, así que puede correrse con el sitio arriba. |
| El schema de Drizzle y la tabla real se desincronizan porque no hay migración versionada | La tabla nace en este spec y `schema/ordenes.ts` es su única definición en el repo; el DDL de este documento queda como constancia de lo aplicado. Cualquier cambio futuro repite el camino (`ALTER TABLE` a mano + edición del schema). |
| Un `in_process` que el banco acredita después queda para siempre como pendiente | Aceptado: sin webhook, la fila refleja el estatus del momento del cobro. `mp_payment_id` permite verificar el estado real en el panel de Mercado Pago. |
| Los campos extra `clave`/`marca` en `items` se filtran a Mercado Pago | No ocurre: `process-payment/route.ts:43-51` construye `additional_info.items` con una lista fija de campos y descarta el resto. |

## Lo que **no** está en este spec

- Pantalla, endpoint o reporte para consultar las órdenes guardadas.
- Autenticación para el grupo de rutas `app/(admin)/`.
- Webhook / `notification_url` de Mercado Pago.
- Cambiar, condicionar o eliminar el correo de confirmación.
- Registrar preferencias, carritos abandonados o excepciones de la API de Mercado Pago.
- Normalizar los renglones en una tabla aparte o relacionarlos con `productos_`.
- Exportación a CSV o cruces de ventas por producto/marca.

Cada uno, si se hace, va en su propio spec.
