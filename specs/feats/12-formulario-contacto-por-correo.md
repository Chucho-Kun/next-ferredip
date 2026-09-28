# SPEC 12 — Formulario de contacto por correo a contacto@ferredip.com.mx

> **Estado:** Implementado
> **Depende de:** SPEC 11
> **Fecha:** 2026-09-02
> **Objetivo:** Hacer que el formulario de `/contacto` envíe un correo a `contacto@ferredip.com.mx` a través de Resend, conservando el envío por WhatsApp como botón secundario, sin contratar ningún servicio ni costo adicional.

## Por qué existe este spec

El formulario de `/contacto` no manda ningún correo. Su `handleSubmit` (`src/shared/components/ContactoCliente.tsx:13–28`) toma los tres campos, arma una URL de `api.whatsapp.com` con el mensaje prellenado y hace `window.open`. Eso obliga al visitante a tener WhatsApp, lo saca del sitio a otra pestaña, y deja el mensaje en un chat de teléfono en vez de en un buzón consultable.

El componente además arrastra el andamiaje del envío por correo que existió antes y hoy está muerto: `status` (`:9`), `isLoading` (`:10`) y `formRef` (`:11`) están declarados, el bloque que pinta `status.message` (`:113–117`) es inalcanzable porque nadie llama a `setStatus`, y el label `«ENVIANDO...»` del botón (`:111`) nunca se muestra porque `setIsLoading` tampoco se llama. El server action que los alimentaba, `src/actions/contact.ts`, se borró en SPEC 11 junto con `nodemailer` — y de todos modos no habría funcionado: su cuerpo HTML era el literal `'...'` y mezclaba un usuario de Gmail con el SMTP de Hospedalia.

Lo que faltaba para conectarlo ya está resuelto por SPEC 11: Resend está instalado, `ferredip.com.mx` es dominio verificado, `noreply@ferredip.com.mx` es remitente válido y `contacto@ferredip.com.mx` es un buzón vivo que Cloudflare Email Routing reenvía a la bandeja del negocio. El plan gratuito de Resend cubre 3,000 correos al mes, así que **este spec no agrega ningún proveedor ni ningún cobro** — es el requisito central del usuario.

SPEC 11 dejó este trabajo fuera de su alcance de forma explícita en tres lugares (`specs/11-correo-noreply-y-buzon-contacto.md:31`, `:185`, `:207`), anotando que «conectarlo al correo exige un endpoint nuevo, una plantilla y manejo de estados de carga y error — otro spec». Este es ese spec.

## Alcance

**Dentro:**

- Route handler nuevo `app/api/contacto/route.ts`: recibe el mensaje del formulario, lo valida en el servidor y lo envía con Resend a `contacto@ferredip.com.mx`.
- Plantilla HTML corta e inline en ese mismo archivo, con los datos del visitante.
- Escapado de HTML de todo lo que escribe el visitante antes de meterlo en el cuerpo del correo.
- `ContactoCliente.tsx`: el `submit` deja de abrir WhatsApp y hace `fetch` al endpoint nuevo, conectando por fin `isLoading`, `status` y `formRef`.
- Campo `telefono` **opcional** agregado al formulario, después de `email`.
- Botón secundario «O escríbenos por WhatsApp», renderizado **fuera del `<form>`**, que conserva el comportamiento actual (abre el chat con los campos prellenados).
- Arreglo cosmético del espacio faltante en `ContactoCliente.tsx:47` (`<strong>Correo:</strong>contacto@…` se renderiza pegado).

**Fuera de alcance (para specs futuros):**

- Cualquier protección anti-spam: honeypot, límite por IP, Cloudflare Turnstile o reCAPTCHA. Decisión explícita del usuario; ver Riesgos.
- Autorespuesta o acuse de recibo al visitante. Se manda un solo correo, al buzón de Ferredip.
- Guardar los mensajes de contacto en la base de datos, al estilo de la tabla `ordenes` de SPEC 07.
- Tocar `app/api/send-email/route.ts` o su plantilla de confirmación de compra.
- Formulario en `/soy-mayorista`, que hoy es solo un enlace a WhatsApp sin campos.
- Mover `contacto@ferredip.com.mx` a `src/shared/db/contact-info.ts` o a `src/shared/seo/negocio.ts` como constante única. Hoy la dirección está escrita a mano en cuatro lugares; unificarla es otro trabajo.

## Modelo de datos

Este spec **no introduce estructuras de datos nuevas** en la base de datos: el mensaje se envía y no se persiste. Sí define el contrato del endpoint nuevo.

```ts
// app/api/contacto/route.ts

type ContactoPayload = {
  nombre: string;    // requerido, 1–100 caracteres
  email: string;     // requerido, formato de correo, ≤ 150 caracteres
  telefono?: string; // opcional, ≤ 30 caracteres
  mensaje: string;   // requerido, 10–5000 caracteres
};
```

Respuestas:

| Caso | Código | Cuerpo |
|---|---|---|
| Envío correcto | 200 | `{ success: true }` |
| Validación fallida | 400 | `{ error: 'mensaje legible en español' }` |
| Error de Resend o excepción | 500 | `{ error: 'mensaje legible en español' }` |

El correo resultante:

| Campo | Valor |
|---|---|
| `from` | `Ferredip Web <noreply@ferredip.com.mx>` |
| `to` | `contacto@ferredip.com.mx` |
| `replyTo` | el `email` que escribió el visitante |
| `subject` | `Nuevo mensaje de contacto — {nombre}` |

## Plan de implementación

1. **Endpoint nuevo.** Crear `app/api/contacto/route.ts` con un `POST`, siguiendo el patrón de `app/api/send-email/route.ts:1–7`: `import { Resend } from 'resend'` y `const resend = new Resend(process.env.RESEND_API_KEY)`. Leer el body, aplicar la validación de la tabla anterior y devolver 400 sin llamar a Resend si algo falla. **Verificación:** un `curl -X POST` con el cuerpo vacío devuelve 400 y no aparece nada en el panel de Resend.

2. **Plantilla y envío.** En el mismo archivo, armar el HTML del correo (una tabla simple con Nombre, Correo, Teléfono si viene, y Mensaje) y llamar a `resend.emails.send` con las direcciones de la tabla de arriba. Antes de interpolar, pasar `nombre`, `email`, `telefono` y `mensaje` por un helper local `escapeHtml` que reemplace `&`, `<`, `>` y `"`; en `mensaje`, convertir además los saltos de línea a `<br />` **después** de escapar. **Verificación:** un `curl` con datos válidos deja el correo en la bandeja, y un mensaje que contenga `<script>` llega mostrando el texto literal, no interpretado.

3. **Campo de teléfono.** En `ContactoCliente.tsx`, agregar entre el input de `email` (`:88–95`) y el `textarea` (`:97–104`) un `<input type="tel" name="telefono" placeholder="Teléfono (opcional):">` **sin** `required`, con las mismas clases que los otros dos para no romper el ritmo visual.

4. **Conectar el submit al correo.** Reescribir `handleSubmit` para que haga `setIsLoading(true)`, un `fetch('/api/contacto', { method: 'POST' })` con los cuatro campos en JSON, y según la respuesta: al éxito `setStatus({ success: true, message: '¡Mensaje enviado! Te responderemos pronto.' })` y `formRef.current?.reset()`; al error `setStatus({ success: false, message: … })` **sin** limpiar los campos, para que el visitante pueda reintentar sin volver a escribir. Cerrar con `setIsLoading(false)` en ambos caminos. El bloque de `status.message` (`:113–117`) y el `disabled={isLoading}` del botón (`:108`) ya existen y empiezan a funcionar solos con esto. **Verificación:** al enviar, el botón se deshabilita y dice «ENVIANDO...»; al terminar aparece el mensaje verde y los campos quedan vacíos.

5. **Botón secundario de WhatsApp.** Extraer la construcción de la URL de WhatsApp a una función aparte en el mismo componente, que lea los valores actuales vía `formRef.current` (sigue funcionando aunque el botón viva fuera del `<form>`: `formRef` apunta al elemento del formulario, no a la posición del botón en el DOM). Renderizar el botón **fuera del `<form>`**, como hermano de él y no como hijo — así no puede disparar el submit tenga el `type` que tenga, y el descuido de olvidar `type="button"` deja de ser posible. Estilo secundario (borde en vez de fondo sólido) para que se lea como alternativa y no como acción primaria. Cuidar el espaciado: el botón deja de estar dentro del `space-y-6` del `<form>`, así que hay que darle su propio margen superior.

6. **Correo pegado en la columna izquierda.** En `ContactoCliente.tsx:47`, agregar el espacio faltante entre `</strong>` y la dirección, que hoy se renderiza como `Correo:contacto@ferredip.com.mx`. Mismo detalle en la línea del WhatsApp (`:46`) si aplica.

7. **Build, lint y prueba en producción.** Correr `npm run build` y `npm run lint`. Desplegar y mandar un mensaje real desde `/contacto` en producción. **Verificación:** el correo llega a la bandeja que recibe `contacto@ferredip.com.mx`, y pulsar «Responder» prellena la dirección del visitante, no `noreply@`.

## Criterios de aceptación

- [ ] `POST /api/contacto` con `{ nombre, email, mensaje }` válidos devuelve 200 y el correo llega a la bandeja que recibe `contacto@ferredip.com.mx`.
- [ ] Ese correo tiene remitente `Ferredip Web <noreply@ferredip.com.mx>` y asunto `Nuevo mensaje de contacto — {nombre}`.
- [ ] Pulsar «Responder» en ese correo prellena el correo del visitante, no `noreply@` ni `contacto@`.
- [ ] El teléfono aparece en el correo cuando se llenó, y el correo se envía igual cuando se dejó vacío.
- [ ] Un mensaje que contenga `<script>alert(1)</script>` llega como texto literal visible, sin ejecutarse ni desaparecer.
- [ ] `POST /api/contacto` sin `email`, con un `email` malformado, o con un `mensaje` de menos de 10 caracteres devuelve 400 y no genera ningún envío en el panel de Resend.
- [ ] Enviar desde `/contacto` deshabilita el botón y muestra «ENVIANDO...» mientras dura la petición.
- [ ] Al éxito aparece el mensaje en verde y los cuatro campos quedan vacíos.
- [ ] Al error aparece el mensaje en rojo y lo escrito **no** se pierde.
- [ ] El botón «O escríbenos por WhatsApp» abre el chat con nombre, correo y mensaje prellenados, y **no** dispara el envío del formulario.
- [ ] El correo de confirmación de compra sigue funcionando igual: una compra de prueba con tarjeta APRO llega al comprador con copia oculta a `ventas@`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: un route handler nuevo en `app/api/contacto/route.ts`.** Aísla el riesgo. `app/api/send-email/route.ts` son 221 líneas cableadas al recibo de compra —espera `{ orderData, customerEmail, deliveryData }` y su plantilla inline ocupa `:23–206`— y es el único correo que sostiene las ventas; meterle una rama por tipo de correo pondría el flujo de contacto y el de cobro en el mismo archivo crítico. Se descartó también revivir `src/actions/contact.ts` como server action: el repo ya no tiene carpeta `src/actions/` y quedaría con un solo archivo.
- **Sí: se conservan los dos canales.** El submit manda correo y un botón secundario abre WhatsApp. Se descartó reemplazar WhatsApp del todo: es el canal por el que hoy entra el contacto y quitarlo de golpe corta la vía que ya funciona antes de comprobar que la nueva llega.
- **Sí: el botón de WhatsApp va fuera del `<form>`.** Un `<button>` dentro de un `<form>` es `type="submit"` por defecto, y olvidar el `type="button"` explícito haría que abrir WhatsApp también enviara el correo. Sacándolo del `<form>` el error es imposible de cometer, no solo detectable. Se descartó confiar solo en el `type="button"` (frágil, depende de recordarlo) y añadir la regla de ESLint `react/button-has-type` (buen refuerzo, pero obliga a anotar el `type` de todos los demás botones del repo — queda para otro momento).
- **Sí: `replyTo` con el correo del visitante.** Es lo que hace que responder desde Gmail sea un clic. El `from` no puede ser el correo del visitante: Resend solo firma direcciones del dominio verificado, y falsear el remitente rompería DKIM y mandaría el correo a spam.
- **Sí: teléfono opcional.** Para una ferretería, muchos prefieren que les devuelvan la llamada. Se descartó hacerlo obligatorio: sube la fricción de un formulario que hoy solo pide tres datos.
- **Sí: validación en el servidor con límites de largo.** El endpoint es público y cualquiera puede hacerle `POST` saltándose el `required` del navegador. Validar evita 500s por cuerpos malformados y acota el tamaño de lo que se manda a Resend.
- **Sí: escapar el HTML del visitante.** El mensaje se interpola en un cuerpo HTML; sin escapar, cualquiera puede inyectar marcado en un correo que va a leer el equipo de Ferredip.
- **No: ninguna protección anti-spam en este spec.** Decisión explícita del usuario tras plantearle el riesgo. Se descartaron por ahora el honeypot con límite por IP en memoria (cero dependencias y cero costo) y Cloudflare Turnstile (gratis, pero es un servicio externo más, contra el requisito de «sin empresas adicionales»). El costo asumido queda registrado en Riesgos.
- **No: acuse de recibo al visitante.** Un solo correo por envío. Un segundo correo duplicaría el consumo de la cuota y convertiría el formulario en algo que manda correo a direcciones de terceros a voluntad.
- **No: los mensajes no se guardan en la base de datos.** A diferencia de las ventas (SPEC 07), el rastro vive en la bandeja y en el log de Resend. Persistirlos exigiría tabla, endpoint de consulta y pantalla — otro spec.
- **Sí: se reutiliza el andamiaje que ya está en el componente.** `isLoading`, `status` y `formRef` están declarados desde la era del server action y nunca se conectaron. No hay que inventar estados nuevos, solo llamarlos.
- **No: la dirección `contacto@ferredip.com.mx` no se centraliza.** Queda escrita a mano en el endpoint nuevo, además de los tres lugares que ya la tienen (`negocio.ts:21`, `Footer.tsx:33`, `ContactoCliente.tsx:47`). Unificarla en una constante es un trabajo aparte que toca archivos fuera de este alcance.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Sin anti-spam, un bot puede quemar la cuota gratuita de 3,000 correos/mes de Resend — **que es la misma cuota que usan los correos de confirmación de compra**, así que un ataque tumbaría los correos de venta. | Riesgo aceptado por decisión del usuario. La validación de largos acota el tamaño de cada envío pero no la cantidad. Vigilar el panel de Resend las primeras semanas; si aparece spam, abrir un spec con honeypot y límite por IP. |
| El mensaje se pierde si Cloudflare Email Routing falla o si la regla de `contacto@` se desactiva: no se guarda en ningún lado. | El panel de Resend conserva el log de cada envío, así que queda constancia de que el mensaje existió aunque no llegue a la bandeja. El botón de WhatsApp sigue disponible como canal alterno. |
| Un visitante pulsa enviar varias veces y llegan mensajes duplicados. | El botón se deshabilita con `isLoading` mientras dura la petición, y el formulario se limpia al éxito. |
| Inyección de HTML en el cuerpo del correo desde el campo de mensaje. | `escapeHtml` sobre los cuatro campos antes de interpolar (paso 2), con criterio de aceptación propio. |
| Si `RESEND_API_KEY` faltara en Railway, el endpoint devolvería 500 en silencio para el visitante. | La variable ya está configurada y en uso por el correo de compra; si faltara, ese correo también estaría roto y se notaría antes. El visitante ve el mensaje en rojo y el botón de WhatsApp. |
| Un `<button>` dentro de un `<form>` es `type="submit"` por defecto; si el botón de WhatsApp quedara dentro del `<form>` sin `type="button"`, cada clic mandaría el correo además de abrir el chat. | El botón se renderiza **fuera del `<form>`** (paso 5), donde no existe submit que disparar sin importar su `type`. Cubierto además por un criterio de aceptación. |

## Lo que **no** está en este spec

- Protección anti-spam de cualquier tipo.
- Autorespuesta o acuse de recibo al visitante.
- Guardar los mensajes de contacto en la base de datos.
- Tocar el correo de confirmación de compra ni su plantilla.
- Un formulario en `/soy-mayorista`.
- Centralizar `contacto@ferredip.com.mx` en una constante única.

Cada uno de ellos, si se hace, va en su propio spec.
