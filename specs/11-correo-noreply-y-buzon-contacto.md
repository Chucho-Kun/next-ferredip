# SPEC 11 — Remitente `noreply@ferredip.com.mx` y buzón `contacto@ferredip.com.mx`

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-09-02
> **Objetivo:** Mover el remitente del correo transaccional del subdominio `noreply.ferredip.com.mx` al dominio raíz `ferredip.com.mx`, y dar de alta un buzón `contacto@ferredip.com.mx` que reciba en Gmail vía Cloudflare Email Routing y pueda responder firmado con DKIM del dominio vía el SMTP de Resend.

## Por qué existe este spec

El correo de confirmación de compra sale hoy de `Ferredip Web <avisos@noreply.ferredip.com.mx>` (`app/api/send-email/route.ts:18`). Esa dirección es un accidente de la puesta en marcha: lo que se verificó en Resend fue el subdominio `noreply.ferredip.com.mx`, así que la parte local del correo tuvo que ser otra cosa (`avisos@`). El resultado es una dirección larga que el cliente lee como poco confiable y que ninguna persona vigila.

Peor: el envío **no tiene `reply_to`**. Si el comprador da «Responder» a su confirmación, el mensaje va a `avisos@noreply.ferredip.com.mx` y se pierde en silencio. La única dirección de contacto que publica el sitio es `truperdipemsa@gmail.com` — en el footer, en `/contacto` y en el JSON-LD del negocio — una cuenta de Gmail personal que no dice nada de la marca.

Al mismo tiempo, el dominio ya está en Cloudflare y su raíz está limpia: sin MX y sin SPF. Y Resend coloca su registro MX en `send.<dominio>`, no en la raíz. Eso permite que **un mismo dominio** envíe por Resend y reciba por Cloudflare Email Routing sin que los dos servicios se estorben, todo dentro de los planes gratuitos que el usuario ya tiene.

Este spec ejecuta ese cambio: verifica el dominio raíz en Resend (reemplazando al subdominio, porque el plan gratuito admite un solo dominio), enciende Email Routing para `contacto@` y `ventas@` hacia `truperdipemsa@gmail.com`, configura «Enviar como» de Gmail contra el SMTP de Resend para poder responder desde `contacto@`, y actualiza el código que menciona el correo viejo.

## Alcance

**Dentro:**

- Sustituir en Resend el dominio verificado `noreply.ferredip.com.mx` por el dominio raíz `ferredip.com.mx`, con sus registros DNS en Cloudflare.
- Activar Cloudflare Email Routing en `ferredip.com.mx` con dos reglas: `contacto@ferredip.com.mx` y `ventas@ferredip.com.mx`, ambas hacia `truperdipemsa@gmail.com`.
- Configurar «Enviar como» en Gmail para `contacto@ferredip.com.mx`, usando el SMTP de Resend como relay para que la respuesta salga firmada con DKIM del dominio.
- `app/api/send-email/route.ts`: cambiar `from` a `Ferredip Web <noreply@ferredip.com.mx>` y agregar `replyTo: 'contacto@ferredip.com.mx'`.
- Cambiar el correo público del sitio a `contacto@ferredip.com.mx` en `src/shared/seo/negocio.ts`, `src/shared/components/footer/Footer.tsx` y `src/shared/components/ContactoCliente.tsx`.
- Borrar el código muerto de la era Nodemailer: `src/actions/contact.ts`, su import sin usar en `ContactoCliente.tsx`, las dependencias `nodemailer` y `@types/nodemailer`, y las variables `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_APP_PASSWORD` de `.env`, de Railway y de la lista en `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- Reconectar el formulario de `/contacto` al correo. Sigue abriendo WhatsApp con un mensaje prellenado, tal cual hoy.
- Cambiar el `bcc` del correo de compra. Se queda en `truperdipemsa@gmail.com`, por decisión explícita del usuario.
- Un buzón real con IMAP (Google Workspace, Zoho). La recepción es reenvío, no almacenamiento propio.
- Rediseñar o extraer la plantilla HTML del correo de confirmación, que sigue inline en `app/api/send-email/route.ts:23–206`.
- Mover el envío del correo al servidor. Hoy sale *fire and forget* desde el navegador (`MercadoPagoBrick.tsx:59–81`) y así se queda.
- Endurecer DMARC. `_dmarc` queda en `p=none`, como está hoy.
- El fallback `payer.email || "truperdipemsa@gmail.com"` de `app/api/mercadopago/process-payment/route.ts:64`.
- Catch-all de correo, o una regla de recepción para `noreply@`.
- El pendiente de SPEC 08 sobre proxear la raíz en Cloudflare. Email Routing opera a nivel DNS (MX) y no depende del estado del proxy.

## Modelo de datos

Este spec **no introduce estructuras de datos nuevas** ni toca la base de datos. Lo que cambia son registros DNS, configuración de dos paneles y unas pocas constantes en el código.

### Registros DNS — estado actual en Cloudflare

La zona tiene hoy **9 registros de los 200 disponibles**:

| Tipo | Nombre | Contenido | Proxy |
| --- | --- | --- | --- |
| R2 | `cdn` | bucket `ferredip-fotos` | Proxied |
| CNAME | `@` | `xia7c5jp.up.railway.app` | DNS only |
| CNAME | `www` | `xia7c5jp.up.railway.app` | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | — |
| TXT | `_railway-verify` | `railway-verify=7c1956e11b378a12be1386…` | — |
| TXT | `_railway-verify.www` | `railway-verify=a3b4ac2410e8f44a2e636d…` | — |
| MX | `send.noreply` (prio 10) | `feedback-smtp.us-east-1.amazonses.com` | — |
| TXT | `send.noreply` | `v=spf1 include:amazonses.com ~all` | — |
| TXT | `resend._domainkey.noreply` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ…` | — |

**El apex es un CNAME, no un registro A.** Cloudflare lo aplana (`ferredip.com.mx` responde `69.46.46.14`, la misma IP que `xia7c5jp.up.railway.app`), y ese aplanamiento es lo que permite agregar MX y TXT en la raíz sin tocar el CNAME de Railway ni el sitio. Los cuatro registros que no son de correo — el R2 de `cdn`, los dos CNAME de Railway y los dos `_railway-verify` — **no se tocan**.

### Registros DNS — estado final en Cloudflare

**Se borran** (quedan del subdominio viejo de Resend):

| Tipo | Nombre |
| --- | --- |
| TXT | `resend._domainkey.noreply` |
| MX | `send.noreply` |
| TXT | `send.noreply` |

**Se agregan para Resend** (los valores exactos los da el panel al registrar el dominio; el nombre se escribe sin el sufijo del dominio):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| MX | `send` (prioridad 10) | `feedback-smtp.us-east-1.amazonses.com` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey` | `p=…` (clave nueva, distinta a la del subdominio) |

**Se agregan para Cloudflare Email Routing** (los crea el asistente automáticamente):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| MX ×3 | `@` | `route1.mx.cloudflare.net`, `route2…`, `route3…` |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` |

**No se toca:** `_dmarc` → `v=DMARC1; p=none;`, que ya existe.

La zona queda con **13 registros** (9 actuales − 3 del subdominio viejo + 3 de Resend + 4 de Email Routing), muy por debajo del límite de 200.

**Por qué no chocan los MX:** Resend pide su MX en `send.ferredip.com.mx`; Email Routing pide los suyos en la raíz. Son nombres distintos, así que el correo entrante del dominio lo maneja Cloudflare y las notificaciones de rebote de Resend llegan a su propio subdominio.

**Por qué se puede poner MX en la raíz si ahí ya hay un CNAME:** porque el CNAME del apex está aplanado por Cloudflare. Los registros MX y TXT en `@` conviven con él sin conflicto, y los destinos `route*.mx.cloudflare.net` son nombres de host reales, no alias.

### Direcciones — estado final

| Dirección | Envía | Recibe |
| --- | --- | --- |
| `noreply@ferredip.com.mx` | Sí, desde la app vía API de Resend | No (los rebotes se pierden) |
| `contacto@ferredip.com.mx` | Sí, desde Gmail vía SMTP de Resend | Sí → `truperdipemsa@gmail.com` |
| `ventas@ferredip.com.mx` | No | Sí → `truperdipemsa@gmail.com` |

### Credenciales SMTP para «Enviar como» de Gmail

```
Servidor:    smtp.resend.com
Puerto:      587 (TLS)
Usuario:     resend          ← literal, en minúsculas, para todas las cuentas
Contraseña:  re_…            ← una API key de Resend con permiso de envío
```

La API key no entra al repo ni a `.env`: vive solo en la configuración de la cuenta de Gmail.

## Plan de implementación

El orden importa. Los pasos 1 y 4 no se pueden intercambiar: Gmail manda un código de confirmación a `contacto@ferredip.com.mx`, que solo puede llegar si la recepción ya funciona.

1. **Recepción con Cloudflare Email Routing.** En el panel de Cloudflare, zona `ferredip.com.mx` → Email → Email Routing → habilitar. Aceptar que cree los tres MX de la raíz y el TXT de SPF; convivirán con el CNAME aplanado del apex sin tocarlo. Dar de alta `truperdipemsa@gmail.com` como *destination address* y confirmar el correo de verificación que Cloudflare le envía. Crear dos *custom addresses*: `contacto@` y `ventas@`, ambas hacia ese destino. **Verificación:** mandar un correo desde una cuenta externa a `contacto@ferredip.com.mx` y verlo llegar a Gmail, y comprobar con `curl -I https://ferredip.com.mx` que el sitio sigue respondiendo 200. No afecta el correo transaccional, que sigue saliendo del subdominio viejo.

2. **Cambio de dominio en Resend.** El plan gratuito admite un solo dominio, así que hay que soltar el viejo antes de registrar el nuevo. En el panel de Resend: borrar `noreply.ferredip.com.mx`, agregar `ferredip.com.mx`, y copiar a Cloudflare los tres registros que pide (tabla de arriba), escribiendo el nombre sin el sufijo del dominio. Esperar a que el dominio quede en *Verified*. Luego borrar de Cloudflare los tres registros huérfanos del subdominio. **Aquí abre la ventana en la que el correo de compra falla** — ver Riesgos.

3. **Remitente y `reply_to` en el código.** En `app/api/send-email/route.ts`: cambiar la línea 18 a `from: 'Ferredip Web <noreply@ferredip.com.mx>'`, agregar `replyTo: 'contacto@ferredip.com.mx'` junto al `to`, y borrar el comentario `// ← AQUÍ ES EL CAMBIO IMPORTANTE` de la línea 17, que ya no señala nada. El `bcc` no se toca. Desplegar. **Verificación:** una compra de prueba con tarjeta APRO de Mercado Pago debe llegar con el remitente nuevo y con `contacto@` prellenado al responder.

4. **Envío desde Gmail como `contacto@`.** En Gmail: Configuración → Cuentas e importación → «Enviar como» → Añadir otra dirección de correo. Poner `Ferredip` / `contacto@ferredip.com.mx` y **desmarcar** «Tratarla como un alias». En el paso de SMTP, usar los datos de la sección anterior. Gmail manda un código a `contacto@`, que llega por el paso 1. **Verificación:** escribir desde Gmail con «De: contacto@ferredip.com.mx» a una cuenta externa y revisar en el encabezado original que aparezcan `dkim=pass header.d=ferredip.com.mx` y `spf=pass`.

5. **Correo público del sitio.** Cambiar `email` a `'contacto@ferredip.com.mx'` en `src/shared/seo/negocio.ts:21`. Eso propaga solo a `src/shared/seo/jsonLd.ts:130` y `:158` (schema de `Organization` y `LocalBusiness`) y a `app/llms.txt/route.ts:63`, sin editar esos archivos. Cambiar además el texto visible en `src/shared/components/footer/Footer.tsx:33` y `src/shared/components/ContactoCliente.tsx:48`, que hardcodean la dirección.

6. **Limpieza del código muerto de Nodemailer.** Borrar `src/actions/contact.ts` (transporte SMTP de Hospedalia con usuario de Gmail y `html: '...'` literalmente vacío, nunca ejecutado). Borrar su import en `src/shared/components/ContactoCliente.tsx:4`. Quitar `nodemailer` y `@types/nodemailer` de `package.json` y correr `npm install`. El `handleSubmit` que abre WhatsApp no se toca.

7. **Limpieza de variables de entorno y documentación.** Quitar `EMAIL_USER` (declarada dos veces), `EMAIL_PASSWORD` y `EMAIL_APP_PASSWORD` de `.env` y de las variables de Railway — ningún archivo las lee. Actualizar la lista de variables esperadas en `CLAUDE.md` para que solo mencione `RESEND_API_KEY`.

## Criterios de aceptación

**DNS**

- [ ] `dig +short MX ferredip.com.mx` devuelve los tres `route*.mx.cloudflare.net`.
- [ ] `dig +short TXT ferredip.com.mx` incluye `v=spf1 include:_spf.mx.cloudflare.net ~all`.
- [ ] `dig +short MX send.ferredip.com.mx` devuelve `feedback-smtp.us-east-1.amazonses.com`.
- [ ] `dig +short TXT resend._domainkey.ferredip.com.mx` devuelve una clave `p=…`.
- [ ] `dig +short TXT resend._domainkey.noreply.ferredip.com.mx` no devuelve nada.
- [ ] `dig +short MX send.noreply.ferredip.com.mx` no devuelve nada.
- [ ] `dig +short TXT _dmarc.ferredip.com.mx` sigue devolviendo `v=DMARC1; p=none;`.
- [ ] `dig +short A ferredip.com.mx` sigue devolviendo la IP de Railway y `curl -I https://ferredip.com.mx` responde 200: los MX nuevos en la raíz no afectaron al sitio.
- [ ] Los cuatro registros ajenos al correo — el R2 de `cdn`, los dos CNAME de Railway y los dos `_railway-verify` — siguen intactos.

**Paneles**

- [ ] En Resend, `ferredip.com.mx` aparece en estado *Verified* y `noreply.ferredip.com.mx` ya no está en la lista.
- [ ] En Cloudflare, Email Routing está *Enabled* con dos reglas activas y `truperdipemsa@gmail.com` como destino verificado.

**Correo**

- [ ] Un correo enviado desde una cuenta externa a `contacto@ferredip.com.mx` llega a `truperdipemsa@gmail.com`.
- [ ] Lo mismo para `ventas@ferredip.com.mx`.
- [ ] Un correo enviado desde Gmail con «De: contacto@ferredip.com.mx» llega a una cuenta externa, y su encabezado original muestra `dkim=pass header.d=ferredip.com.mx` y `spf=pass`.
- [ ] Una compra de prueba con tarjeta APRO llega con remitente `Ferredip Web <noreply@ferredip.com.mx>`.
- [ ] Ese mismo correo llega también a `truperdipemsa@gmail.com` por copia oculta.
- [ ] Pulsar «Responder» en ese correo prellena `contacto@ferredip.com.mx`, no `noreply@`.
- [ ] Ninguno de los correos de prueba cae en la carpeta de spam de Gmail.

**Código**

- [ ] `/contacto` y el footer muestran `contacto@ferredip.com.mx`.
- [ ] `curl -s https://ferredip.com.mx/llms.txt | grep Correo` devuelve `contacto@ferredip.com.mx`.
- [ ] El JSON-LD del home contiene `"email":"contacto@ferredip.com.mx"` en los dos bloques que lo declaran.
- [ ] `grep -rn "nodemailer\|sendContactEmail\|EMAIL_USER\|EMAIL_APP_PASSWORD\|avisos@" app src package.json` no devuelve nada.
- [ ] El formulario de `/contacto` sigue abriendo WhatsApp al enviarse.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: verificar el dominio raíz `ferredip.com.mx` en Resend.** Es la única forma de que el remitente sea `noreply@ferredip.com.mx` literal, y una sola verificación habilita también `contacto@` y `ventas@` para el SMTP. Se descartó registrar otro subdominio (`mail.ferredip.com.mx`), que habría vuelto a forzar una dirección larga.
- **No: conservar `noreply.ferredip.com.mx` en paralelo.** El plan gratuito de Resend admite un dominio. Tener los dos exigiría el plan de pago.
- **No: pagar Resend Pro para hacer el cambio sin ventana de caída.** El único beneficio sería evitar unos minutos de fallo en un sitio de bajo volumen; no justifica una suscripción mensual.
- **Sí: Cloudflare Email Routing para recibir.** Es gratis, el dominio ya vive en Cloudflare (`lennon/athena.ns.cloudflare.com`), permite 200 reglas de ruteo, y su MX en la raíz no compite con el de Resend, que va en `send.`.
- **No: Resend Inbound.** Entrega por webhook a un endpoint, no a un buzón, así que habría que escribir y mantener código para algo que Cloudflare resuelve con dos clics. Además la propia documentación de Resend advierte que activar Inbound sobre un dominio captura *todo* el correo entrante según la prioridad del MX.
- **No: Google Workspace.** Da un buzón real con IMAP, pero cuesta por usuario al mes y el usuario pidió explícitamente una solución sobre las cuentas gratuitas que ya tiene.
- **No: Zoho Mail gratuito.** Su plan gratuito es solo acceso web y app móvil; sin IMAP/POP no se puede leer ni responder desde Gmail, que es el requisito central.
- **Sí: «Enviar como» de Gmail con el SMTP de Resend como relay.** Es lo que hace que la respuesta salga firmada con DKIM de `ferredip.com.mx` y alineada con DMARC.
- **No: «Enviar como» dejando que Gmail use su propio servidor.** Gmail reescribiría el sobre y el mensaje saldría sin alineación DMARC del dominio, con más probabilidad de caer en spam.
- **Sí: el `bcc` se queda en `truperdipemsa@gmail.com`.** Decisión del usuario: la copia de cada venta llega directo, sin depender del salto de reenvío de Cloudflare, que es una pieza más que puede fallar.
- **Sí: `replyTo` apuntando a `contacto@ferredip.com.mx`.** Es la razón de existir del buzón nuevo. Se descartó apuntarlo a `truperdipemsa@gmail.com`, que habría dejado una dirección de gmail.com visible en el cliente de correo del comprador.
- **Sí: el correo público del sitio pasa a `contacto@`, en tres lugares.** `NEGOCIO.email` cubre el JSON-LD y `llms.txt` sin tocar esos archivos; Footer y `/contacto` hardcodean el texto y hay que editarlos a mano.
- **No: se toca el formulario de `/contacto`.** Hoy abre WhatsApp y así se queda. Conectarlo al correo exige un endpoint nuevo, una plantilla y manejo de estados de carga y error — otro spec.
- **Sí: el nombre visible del remitente sigue siendo «Ferredip Web».** Solo cambia la dirección, así el cambio es de una sola cadena y no altera cómo reconoce el cliente el correo en su bandeja.
- **Sí: alias `ventas@` además de `contacto@`.** Cuesta una regla y separa cotizaciones de dudas generales.
- **No: catch-all.** Reenviaría cualquier dirección inventada del dominio y atraería spam a la bandeja.
- **No: regla de recepción para `noreply@`.** El nombre promete que nadie lee; darle buzón contradice la convención y llenaría Gmail de respuestas automáticas.
- **Sí: se borra `src/actions/contact.ts` y sus dependencias.** No se ejecuta desde ningún lado, su `html` es la cadena `'...'`, y mezcla un usuario de Gmail con un SMTP de Hospedalia. Dejarlo invita a que alguien lo «arregle» en vez de usar Resend.
- **No: se endurece DMARC a `quarantine` o `reject`.** Conviene dejar `p=none` mientras se estrena el envío desde la raíz y desde Gmail, para no bloquear correo legítimo por un error de configuración. Subirlo es un spec propio, con reportes agregados de por medio.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Entre borrar `noreply.ferredip.com.mx` de Resend y desplegar el remitente nuevo, el correo de confirmación falla: el código sigue pidiendo enviar desde un dominio ya no verificado. | Hacer los pasos 2 y 3 seguidos y en horario de bajo tráfico. La venta no se pierde: `registrarOrden()` ya deja la fila en `ordenes` (SPEC 07) con la respuesta autoritativa de Mercado Pago, independientemente del correo. |
| Resend recomienda enviar desde un subdominio para aislar la reputación; este spec envía desde la raíz. | El volumen es bajo y solo transaccional (100 correos/día, 3000/mes del plan gratuito), y `_dmarc` ya está en `p=none`. Si la entregabilidad se degrada, la salida es volver a un subdominio dedicado, que es reversible. |
| El envío manual desde Gmail como `contacto@` consume la misma cuota gratuita de Resend que las confirmaciones de compra. | 3000 correos al mes dan mucho margen frente al volumen actual. El panel de Resend muestra el consumo; si se acerca al límite, el plan de pago o un relay distinto para Gmail son las salidas. |
| El reenvío de Cloudflare rompe SPF del remitente original, y Gmail puede marcar como spam correo legítimo reenviado. | Email Routing reescribe el sobre (SRS) precisamente para esto. Aun así, el primer correo de prueba debe revisarse en la carpeta de spam antes de dar el paso por bueno, y marcarse como «no es spam» si aparece ahí. |
| Si alguien activa Inbound de Resend sobre `ferredip.com.mx` en el futuro, sus MX competirían con los de Email Routing y el correo entrante dejaría de llegar a Gmail. | Queda documentado aquí como algo que no se debe activar. La recepción del dominio es responsabilidad de Cloudflare. |
| Los registros de Resend y las reglas de Email Routing viven en dos paneles, no en el repo. Nadie que lea el código sabe por qué el `from` es el que es. | La tabla de DNS y las direcciones de este spec son la fuente escrita. Mismo criterio ya asumido con las Redirect Rules de Cloudflare en SPEC 08. |
| Agregar MX en la raíz, donde ya vive el CNAME del apex hacia Railway, podría parecer un conflicto de tipos de registro. | El *CNAME flattening* de Cloudflare está pensado exactamente para esto: el apex se sirve como A y admite MX y TXT en paralelo. Aun así, el paso 1 termina comprobando con `curl -I https://ferredip.com.mx` que el sitio sigue respondiendo. |

## Lo que **no** está en este spec

- Reconectar el formulario de `/contacto` al correo: sigue abriendo WhatsApp.
- Cambiar el `bcc` del correo de compra.
- Un buzón real con IMAP (Google Workspace, Zoho).
- Rediseñar o extraer la plantilla HTML del correo de confirmación.
- Mover el envío del correo del navegador al servidor.
- Endurecer DMARC más allá de `p=none`.
- Catch-all de correo o buzón para `noreply@`.
- El proxy de la raíz en Cloudflare, pendiente de SPEC 08.

Cada uno de ellos, si se hace, va en su propio spec.
