# SPEC 14 — NAP visible, FAQ básica y fixes de indexación (auditoría IA)

> **Estado:** Implementado
> **Depende de:** SPEC 10
> **Fecha:** 2026-09-15
> **Objetivo:** Hacer visible el nombre/dirección/teléfono real de las sucursales en Footer y `/contacto`, agregar una página de preguntas frecuentes con `FAQPage` respaldada en datos ya existentes, y corregir dos contradicciones de indexación (`/carrito-de-compra` y `/productos`), a partir de una auditoría del sitio en producción enfocada en qué tan citable es Ferredip para motores de IA generativa.

## Por qué existe este spec

SPEC 10 y la corrección del 2026-09-10 ya resolvieron la capa estructural de AIO: `llms.txt` completo y derivado de datos reales, `robots.txt` unificado con `Allow` explícito para GPTBot/ClaudeBot/PerplexityBot/etc., JSON-LD sin `aggregateRating` falso, sitemap con imágenes. Una auditoría en vivo del 2026-09-15 (`curl` contra `https://ferredip.com.mx/` — robots.txt, llms.txt, sitemap.xml, home, `/contacto`, una ficha de producto, `/categoria/cerrajeria`, `/carrito-de-compra`, `feed.xml`) confirmó que eso sigue en verde, pero encontró seis huecos reales. De esos seis, este spec ataca los que no requieren datos de negocio que hoy no existen:

1. **Ningún NAP visible como texto en ninguna página.** El nombre, dirección y teléfono de las sucursales solo viven en JSON-LD (`organizacionJsonLd()`) y en `llms.txt`. `Footer.tsx` solo muestra WhatsApp y correo — el párrafo "Atención telefónica inmediata" está vacío (línea 28), y los teléfonos que había comentados (líneas 29-31) son números de la era Dipemsa que ni siquiera coinciden con los actuales. Las sucursales sí están linkeadas a Google Maps por su nombre, pero sin dirección ni teléfono en texto plano. Un modelo que lee el HTML visible (no todos leen o pesan igual el JSON-LD) no tiene con qué responder "¿dónde está la tienda?" o "¿a qué teléfono marco?".
2. **Cinco teléfonos publicados, ninguno mostrado como "el" teléfono de Ferredip.** `NEGOCIO.telefono` (`+52-55-9236-8879`) no aparece visible en ningún lado; los de cada sucursal (`+52-55-7329-0946` Pirámides, `+52-55-6895-3906` Texcoco) tampoco; el único visible es el WhatsApp (`55 7347 6687`); y `/terminos-y-condiciones` conserva teléfonos fijos de Dipemsa comentados. Mostrar el NAP existente resuelve la falta de visibilidad sin agregar un teléfono nuevo a la lista.
3. **No existe ninguna página de contenido en prosa** (FAQ, garantías explicadas) — confirmado con `curl -I` devolviendo 404 en `/faq` y `/sobre-nosotros`. SPEC 10 ya lo anotó como "el siguiente spec natural": los motores generativos citan mejor una fuente con contenido explicativo que un catálogo puro.
4. **`/carrito-de-compra` es indexable según su propio HTML pero está bloqueada en `robots.txt`.** Declara `alternates.canonical: '/carrito-de-compra'` sin ningún `robots: { index: false }`, mientras `robots.txt` la deshabilita con `Disallow: /carrito-de-compra`. Es la combinación que Google documenta como incorrecta: un `Disallow` le impide al crawler llegar a leer un eventual `noindex`, así que si la URL ya quedó indexada por un enlace externo, queda listada sin contenido ("no se pudo mostrar información de esta página") en vez de excluirse limpiamente.
5. **`/productos` sigue en `app/paginas/sitemap.ts` con un `canonical` que apunta a otra URL** (`/categoria/{primeraCategoria}`, hoy `/categoria/acabados-y-remodelacion`, ver `CLAUDE.md` — nota de SPEC 09). Un sitemap que anuncia una URL que la propia página dice "no soy yo, canonicaliza hacia allá" es una señal contradictoria para cualquier crawler.
6. El sexto hallazgo de la auditoría (sucursal CDMX sin ficha de Google Business real) queda **fuera de este spec** — no hay dirección ni teléfono verificable todavía, así que no hay nada que agregar al marcado estructurado. Sí se corrige, dentro de este spec, el síntoma visible de ese hueco: el link muerto `href="#"` de `Footer.tsx:95`.

## Alcance

**Dentro:**

- NAP visible (dirección completa + teléfono) de las dos sucursales reales (Pirámides, Texcoco) en `Footer.tsx` y en `ContactoCliente.tsx` (`/contacto`), derivado de `src/shared/seo/negocio.ts` (`SUCURSALES`, `HORARIO`) — sin capturar ni inventar ningún dato nuevo.
- Quitar la línea "FERREDIP CDMX" del Footer (no solo el link muerto) mientras esa sucursal no tenga dirección/teléfono verificables.
- Página nueva `/preguntas-frecuentes` con 8 preguntas y respuestas derivadas exclusivamente de constantes ya existentes (`ENVIO`, `DEVOLUCION`, `NEGOCIO.pagos`, `HORARIO`, `SUCURSALES`) y del texto de exclusiones de cambios que hoy vive hardcodeado en `app/llms.txt/route.ts`.
- `FAQPage` JSON-LD para esa página, generado por una función nueva `faqJsonLd()` en `src/shared/seo/jsonLd.ts`, alimentada por el mismo arreglo `FAQ` que renderiza la página (una sola fuente para lo visible y lo estructurado).
- Enlace a `/preguntas-frecuentes` en la columna "NOSOTROS" del Footer, en `llms.txt` (sección "Páginas clave") y en `app/paginas/sitemap.ts`.
- Extraer a `DEVOLUCION.exclusiones: string[]` (en `negocio.ts`) el texto de productos sin cambio/devolución, y que `app/llms.txt/route.ts` lo consuma desde ahí en vez del literal hardcodeado — para que la FAQ y `llms.txt` no puedan desincronizarse en el futuro.
- Corregir `/carrito-de-compra`: agregar `robots: { index: false, follow: false }` a su `metadata` y quitar el `Disallow: /carrito-de-compra` de `robots.txt`, para que el crawler pueda leer el `noindex` en vez de topar con el bloqueo.
- Quitar `/productos` de `app/paginas/sitemap.ts` (su `canonical` ya apunta a `/categoria/{primeraCategoria}`, que si está en el sitemap).
- De paso, en `ContactoCliente.tsx:85`, usar `whatsAppNumber` (ya importado en ese archivo) para el texto mostrado en vez del literal `"55 7347 6687"` — mismo bug de duplicación de constante que ya se corrigió en otros componentes.

**Fuera de alcance (para specs futuros):**

- Sucursal CDMX en JSON-LD/`llms.txt`: requiere dirección, teléfono y horario reales, que hoy no existen (el usuario confirmó que aún no tiene ficha de Google Business).
- Consolidar los 5 teléfonos en uno solo "oficial": es una decisión de negocio (cuál usar, si se dan de baja los demás) que el usuario decidió no resolver en esta sesión.
- Reescribir `/terminos-y-condiciones` para quitar los teléfonos fijos de Dipemsa comentados.
- Preguntas de FAQ adicionales a las 8 de envíos/devoluciones/pagos-horarios (el usuario decidió no aportar preguntas propias en esta sesión).
- `HowTo`, guías de compra, o cualquier otro contenido en prosa más allá de la FAQ.
- Cambiar el nombre comercial "FERREDIP TEXCOCO" o cualquier otro dato de `SUCURSALES` — se muestran tal cual ya viven en `negocio.ts`.

## Modelo de datos

No se toca la base de datos. Se agrega un arreglo de constantes y se extiende uno existente en `src/shared/seo/negocio.ts`:

```ts
// Extiende el DEVOLUCION ya existente:
export const DEVOLUCION = {
  diasCambio: 3,
  metodo: 'ReturnInStore',
  reembolso: 'StoreCredit',
  vigenciaNotaCreditoDias: 30,
  exclusiones: [
    'plafones',
    'suspensión',
    'polvos',
    'aislantes',
    'químicos epóxicos',
    'resinas',
    'cempanel',
    'productos de fabricación especial o descontinuados',
  ],
} as const;

// Nuevo:
export const FAQ: { pregunta: string; respuesta: string }[] = [
  { pregunta: '¿Cuánto tarda mi pedido en llegar?', respuesta: '...' },
  // 7 más — ver plan de implementación, paso 2
];
```

`faqJsonLd()` en `jsonLd.ts` mapea `FAQ` a la forma que exige schema.org:

```ts
export function faqJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
    })),
  };
}
```

## Plan de implementación

1. **Extender `DEVOLUCION` con `exclusiones`.** En `src/shared/seo/negocio.ts`, agregar el campo `exclusiones: string[]` con la lista que hoy está hardcodeada en `app/llms.txt/route.ts:84`. En `route.ts`, reemplazar el literal por `DEVOLUCION.exclusiones.join(', ')` (o el `.map` que corresponda) dentro de la misma línea de Markdown.
   *Verificación:* `curl -s https://ferredip.com.mx/llms.txt` (en dev, `next dev`) muestra la misma lista de exclusiones que antes, ahora derivada de `negocio.ts`.

2. **Redactar `FAQ` en `negocio.ts`.** Ocho preguntas, todas derivadas de constantes ya existentes, sin inventar datos:
   - ¿Cuánto tarda mi pedido en llegar? → `ENVIO.handlingDias` + `ENVIO.transitoDias`.
   - ¿El envío es gratis? → `ENVIO.umbralGratis`, `ENVIO.regionGratis`, `ENVIO.costoBase`.
   - ¿A qué zonas del país envían? → `ENVIO.pais` + nota de cotización fuera de la región gratis (mismo texto que ya usa `llms.txt`).
   - ¿Puedo devolver un producto? → `DEVOLUCION.reembolso`, `DEVOLUCION.vigenciaNotaCreditoDias`.
   - ¿Cómo hago un cambio de producto? → `DEVOLUCION.metodo`, `DEVOLUCION.diasCambio`.
   - ¿Qué productos no aceptan cambios ni devoluciones? → `DEVOLUCION.exclusiones`.
   - ¿Qué métodos de pago aceptan? → `NEGOCIO.pagos`.
   - ¿Cuál es su horario de atención y dónde están ubicados? → `HORARIO`, `SUCURSALES[].nombre` + `localidad`.
   *Verificación:* ningún texto de `FAQ` contiene un dato que no exista ya en `negocio.ts` antes de este paso (excepto `exclusiones`, agregado en el paso 1).

3. **`faqJsonLd()` en `jsonLd.ts`.** Función nueva, sin `aggregateRating` ni nada fuera de `FAQPage`/`Question`/`Answer`.
   *Verificación:* `JSON.stringify(faqJsonLd())` valida contra el schema de `FAQPage` en el validador de resultados enriquecidos de Google.

4. **Página `/preguntas-frecuentes`.** Crear `app/(public)/preguntas-frecuentes/page.tsx` con el mismo patrón que `terminos-y-condiciones/page.tsx`: `metadata` propia (`title`, `description`, `alternates.canonical` absoluto), un `<h1>Preguntas frecuentes</h1>`, y un bloque por cada entrada de `FAQ` (pregunta como `<h2>` o `<summary>`, respuesta como `<p>`). Insertar `<script type="application/ld+json">{JSON.stringify(faqJsonLd())}</script>`.
   *Verificación:* `curl -s https://ferredip.com.mx/preguntas-frecuentes` devuelve 200, un único `<h1>`, y el bloque `"@type":"FAQPage"` con 8 `Question`.

5. **Enlazar la página nueva.** Agregar `<Link href="/preguntas-frecuentes">Preguntas Frecuentes</Link>` en la columna "NOSOTROS" del Footer (junto a Aviso de Privacidad y Términos y Condiciones); agregar la entrada en `app/paginas/sitemap.ts` (`priority: 0.5`, `changeFrequency: 'monthly'`); agregar `- [Preguntas frecuentes](${url}/preguntas-frecuentes)` a la sección "Páginas clave" de `app/llms.txt/route.ts`.
   *Verificación:* `/paginas/sitemap.xml` y `/llms.txt` incluyen la URL nueva.

6. **NAP visible en `Footer.tsx`.** Importar `SUCURSALES` y `HORARIO` de `src/shared/seo/negocio.ts`. En la columna "SUCURSALES", debajo de cada `<a>` que ya enlaza a Google Maps, agregar la dirección (`calle`, `localidad`, `cp`) y el teléfono de esa sucursal como texto plano. Quitar por completo la línea `<li><a href="#">FERREDIP CDMX</a></li>`. En la columna 1, llenar el párrafo vacío "Atención telefónica inmediata" con el horario (`HORARIO.dias`, `HORARIO.abre`–`HORARIO.cierra`) en vez de dejarlo en blanco.
   *Verificación:* el HTML renderizado de cualquier página (el Footer es global) contiene, fuera de cualquier `<script>`, el texto `Teotihuacán de Arista` y `+52-55-7329-0946` (o su formato local `55 7329 0946`), y ya no contiene `FERREDIP CDMX`.

7. **NAP visible en `ContactoCliente.tsx`.** Agregar un bloque con la misma información de sucursales (dirección + teléfono, importado de `negocio.ts`) cerca del formulario de contacto. Cambiar la línea 85 (`<p><strong>WhatsApp:</strong> 55 7347 6687</p>`) para interpolar `whatsAppNumber` formateado en vez del literal.
   *Verificación:* `/contacto` muestra, fuera de `<script>`, la dirección y teléfono de ambas sucursales.

8. **Fix `/carrito-de-compra`.** En `app/(public)/carrito-de-compra/page.tsx`, agregar `robots: { index: false, follow: false }` al objeto `metadata`. En `app/robots.ts` (o donde se genere `robots.txt`), quitar la entrada `Disallow: /carrito-de-compra` del bloque `User-Agent: *`.
   *Verificación:* `curl -s https://ferredip.com.mx/carrito-de-compra` contiene `<meta name="robots" content="noindex, nofollow"/>`; `curl -s https://ferredip.com.mx/robots.txt` ya no contiene esa línea.

9. **Fix `/productos` en el sitemap.** En `app/paginas/sitemap.ts`, quitar la entrada `${BASE_URL}/productos`.
   *Verificación:* `/paginas/sitemap.xml` ya no contiene `<loc>https://ferredip.com.mx/productos</loc>`; sigue conteniendo `/categoria/acabados-y-remodelacion` (a donde canonicaliza).

10. **Build y lint.** Correr `npm run build` y `npm run lint`.
    *Verificación:* ambos terminan sin errores.

## Criterios de aceptación

- [ ] El Footer (visible en cualquier página) muestra, como texto fuera de `<script>`, la dirección y el teléfono de FERREDIP PIRÁMIDES y de FERREDIP TEXCOCO.
- [ ] El Footer ya no contiene la cadena `FERREDIP CDMX` ni ningún `href="#"`.
- [ ] `/contacto` muestra, como texto visible, la dirección y el teléfono de ambas sucursales.
- [ ] `ContactoCliente.tsx` ya no contiene el literal `"55 7347 6687"` — usa `whatsAppNumber`.
- [ ] `/preguntas-frecuentes` devuelve 200, con exactamente un `<h1>` y 8 preguntas visibles con su respuesta.
- [ ] El HTML de `/preguntas-frecuentes` contiene un bloque `"@type":"FAQPage"` con 8 entradas `Question`/`Answer`, y ninguna contradice lo que dice `/terminos-y-condiciones`.
- [ ] El validador de resultados enriquecidos de Google reporta cero errores para `/preguntas-frecuentes`.
- [ ] `/paginas/sitemap.xml` incluye `/preguntas-frecuentes` y ya **no** incluye `/productos`.
- [ ] `/llms.txt` incluye `/preguntas-frecuentes` en "Páginas clave", y la sección "Cambios y devoluciones" sigue mostrando la misma lista de exclusiones que antes (ahora derivada de `DEVOLUCION.exclusiones`).
- [ ] `curl -s https://ferredip.com.mx/carrito-de-compra` contiene `<meta name="robots" content="noindex, nofollow"/>`.
- [ ] `curl -s https://ferredip.com.mx/robots.txt` ya no contiene `Disallow: /carrito-de-compra`.
- [ ] Ninguna página cambia visualmente salvo: el Footer (NAP nuevo, sin línea CDMX), `/contacto` (bloque NAP nuevo) y la página nueva `/preguntas-frecuentes`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: mostrar solo el NAP que ya existe en `negocio.ts`, sin pedir ni inventar un teléfono "general" nuevo.** El usuario decidió no resolver en esta sesión cuál de los 5 teléfonos es "el oficial"; consolidarlos queda para otra sesión. Mostrar dirección + teléfono por sucursal ya resuelve el hallazgo principal (nada visible) sin tomar esa decisión pendiente.
- **No: agregar la sucursal CDMX al marcado estructural.** No hay dirección, teléfono ni horario verificables — agregarla sería repetir el mismo problema (marcado que no coincide con la realidad) que SPEC 10 corrigió con `aggregateRating`.
- **Sí: quitar la línea "FERREDIP CDMX" del Footer en vez de solo arreglar el link.** El usuario lo eligió explícitamente: listar una sucursal sin ninguna forma de contactarla (ni dirección, ni teléfono, ni link) es peor que no mencionarla.
- **Sí: FAQ derivada 100% de constantes ya existentes en `negocio.ts`, sin preguntas nuevas aportadas por el usuario.** El usuario decidió no alargar esta sesión escribiendo preguntas propias; las 8 preguntas de envíos/devoluciones/pagos-horarios ya representan las dudas más comunes de un comprador y no requieren inventar ningún dato.
- **Sí: una sola fuente (`FAQ` en `negocio.ts`) para el texto visible y para `faqJsonLd()`.** Mismo criterio que el resto de `jsonLd.ts`: evita que la página y el marcado estructurado se desincronicen con el tiempo, que fue exactamente el problema que motivó SPEC 10.
- **Sí: extraer `DEVOLUCION.exclusiones` de `llms.txt/route.ts`.** Ya existía el texto, solo vivía hardcodeado en un solo lugar; con la FAQ necesitándolo también, centralizarlo en `negocio.ts` es el mismo criterio que ya se aplicó a `ENVIO`/`DEVOLUCION`/`HORARIO` en SPEC 10.
- **Sí: corregir `/carrito-de-compra` quitando el `Disallow` y agregando `noindex`, no al revés.** Es la combinación que Google documenta como correcta: un `Disallow` sin más impide que el crawler vea el `noindex`. Se descartó dejarlo solo con `Disallow` (el estado actual) porque no protege contra una URL ya indexada por enlaces externos.
- **Sí: quitar `/productos` del sitemap en vez de quitarle su `canonical` a `/categoria/{primeraCategoria}`.** El `canonical` ya se decidió en SPEC 09 como la forma de evitar contenido duplicado sin un redirect 301; lo consistente es que el sitemap no anuncie una URL que la propia página declara que no es la canónica.
- **No: agregar un link a `/preguntas-frecuentes` en el menú principal del Header.** Se agrega en el Footer (mismo lugar que Términos y Aviso de Privacidad) y en `llms.txt`/sitemap, suficiente para que usuarios y crawlers la encuentren sin sumar un ítem más a la navegación principal — decisión de alcance, no de negocio.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Quitar `Disallow: /carrito-de-compra` permite que crawlers agresivos rastreen una página que antes no tocaban, en un servicio con historial de problemas de memoria bajo crawl (nota del 2026-08-24 en `CLAUDE.md`). | `/carrito-de-compra` no invoca `sharp` ni el optimizador de imágenes por sí sola — es una página de carrito sin fotos propias; el origen real de aquel incidente fue `/_next/image`, ya resuelto por SPEC 08. |
| Mostrar la dirección exacta de las sucursales como texto plano las expone a scraping más agresivo que hoy, cuando solo vivían en JSON-LD. | Las direcciones ya son públicas hoy: están en el JSON-LD que cualquier navegador descarga, en `llms.txt`, y los nombres de sucursal ya enlazan a Google Maps. No se expone nada nuevo, solo se hace legible sin parsear JSON. |
| `DEVOLUCION.exclusiones` como `string[]` puede desalinearse de `/terminos-y-condiciones` si el texto legal cambia ahí sin actualizar `negocio.ts`. | Mismo riesgo que ya aceptó SPEC 10 para el resto de `DEVOLUCION`/`ENVIO`; no se resuelve aquí, se documenta igual que los demás campos derivados de los términos. |

## Lo que **no** está en este spec

- Sucursal CDMX en JSON-LD, `llms.txt` o cualquier dato estructurado.
- Consolidar los 5 teléfonos publicados en uno solo "oficial".
- Reescribir `/terminos-y-condiciones`.
- Preguntas de FAQ más allá de las 8 de envíos/devoluciones/pagos-horarios.
- `HowTo`, guías de compra u otro contenido en prosa distinto de la FAQ.
- Cualquier cambio a los datos de `SUCURSALES` (nombre, dirección, coordenadas) — se muestran tal cual ya existen.

Cada uno de ellos, si se hace, va en su propio spec.
