# SPEC 10 — Optimización para motores de IA (AIO)

> **Estado:** Implementado
> **Depende de:** SPEC 08
> **Fecha:** 2026-09-02
> **Objetivo:** Hacer que el catálogo de Ferredip sea legible, verificable y citable por motores generativos de IA, corrigiendo el marcado estructurado que hoy es falso o contradictorio y agregando las señales que hoy no existen.

## Por qué existe este spec

El SEO clásico ya se trabajó: la auditoría del 2026-08-25 (commit `c3fe8c9`) arregló el sitemap, los canonicals y el `metadataBase`. Este spec ataca el otro lado: cómo un modelo de lenguaje entiende el sitio cuando alguien le pregunta «¿dónde compro un taladro Truper?».

Un motor generativo no rankea páginas, extrae hechos y los cita. Para eso necesita tres cosas que Ferredip hoy no le da bien:

1. **Datos que no se contradigan.** El JSON-LD del producto declara devoluciones gratis por paquetería a 30 días; `/terminos-y-condiciones` dice cambios en 1–3 días naturales y nota de crédito sin devolución en efectivo. El JSON-LD declara envío de $300 MXN a todo México; `feed.xml` declara $0; los términos dicen gratis sobre $5,000 solo en CDMX y área metropolitana. Hay tres juegos de teléfonos distintos y dos domicilios distintos en el sitio. Cuando las señales se contradicen, el modelo no cita.

2. **Datos que no sean falsos.** Los 2170 productos emiten el mismo `aggregateRating` de 4.8 con 23 reseñas y una reseña firmada por una persona, sin que exista ninguna reseña real ni ninguna UI de reseñas en la página. Es marcado inventado: incumple las políticas de rich results de Google (motivo típico de acción manual) y es exactamente el patrón que un modelo detecta como fuente de baja confianza.

3. **Estructura que se pueda seguir.** Cinco de las plantillas más importantes — home, `/categoria/[slug]`, `/marca/[slug]`, `/marcas` y `/productos` — no tienen ningún `h1`. Las páginas de listado no emiten JSON-LD de ningún tipo. No existe `llms.txt`, ni `WebSite`+`SearchAction`, ni una declaración explícita para los crawlers de IA en `robots.txt` — que además hoy son **dos archivos distintos** compitiendo por la misma URL, con hosts distintos (`www` vs. sin `www`).

Este spec no escribe contenido nuevo. Corrige lo que está mal, unifica los datos del negocio en una sola fuente y agrega el marcado que falta.

## Alcance

**Dentro:**

- Módulo nuevo `src/shared/seo/negocio.ts`: fuente única de los datos del negocio (sucursales, teléfonos, horarios, correo, redes, política de envío y de devolución), siguiendo el mismo criterio que `src/shared/db/contact-info.ts` para el número de WhatsApp.
- Módulo nuevo `src/shared/seo/jsonLd.ts`: constructores de los bloques JSON-LD (`organizacionJsonLd`, `productoJsonLd`, `listadoJsonLd`, `breadcrumbJsonLd`), para que ninguna página vuelva a escribir un literal a mano.
- Eliminar `aggregateRating` y `review` del JSON-LD de producto.
- Enriquecer el `Product` JSON-LD con datos que **ya existen** en `productos_`: `description` desde `informacion`, `image` como arreglo con las fotos adicionales, `category`, `url`, `itemCondition`, `productID`, `mpn`, `availability` derivado del precio, `priceSpecification` con IVA incluido y `priceValidUntil` calculado.
- Alinear `shippingDetails` y `hasMerchantReturnPolicy` del JSON-LD, y `g:shipping` de `feed.xml`, con lo que dice `/terminos-y-condiciones`.
- Corregir los `name` del `BreadcrumbList` de producto (hoy dicen literalmente `"Marca"` y `"Producto"`).
- `app/robots.ts` que reemplaza a `app/robots.txt` y `app/(public)/robots.txt`, con `Allow` explícito para los crawlers de IA y disallows que correspondan a rutas reales.
- `app/llms.txt/route.ts`: índice en Markdown del sitio, derivado de `src/shared/db/productos.ts` y `src/shared/db/marcas.ts`.
- `WebSite` + `SearchAction` y los dos `HardwareStore` en el JSON-LD del home, unificados en un `@graph`.
- `CollectionPage` + `BreadcrumbList` + `ItemList` (30 primeros productos) en `/categoria/[slug]` y `/marca/[slug]`.
- Un `h1` en home, `/categoria/[slug]`, `/marca/[slug]`, `/marcas` y `/productos`, conservando las clases de Tailwind actuales.
- Canonical de producto derivado de `slugify(producto.descripcion)` en vez del slug de la URL.
- `notFound()` en la página de producto cuando el id no existe (hoy devuelve un `<div>` con status 200).
- `metadata` propia para `/terminos-y-condiciones` y `/aviso-de-privacidad`, que hoy heredan el título del root.
- Corregir las imágenes OpenGraph de `/categoria/[slug]` y `/marca/[slug]`, que apuntan a rutas `.jpg` inexistentes.
- Corregir `openGraph.description` de la página de producto, que interpola `producto.informacion` crudo y escribe literalmente `"null"` cuando el campo está vacío.

**Fuera de alcance (para specs futuros):**

- **Reseñas reales**: tabla, formulario, moderación y UI. Sin eso, no vuelve `aggregateRating`.
- Páginas de contenido nuevas: FAQ con `FAQPage`, «sobre nosotros», página de envíos independiente. El usuario eligió acotar este spec a la capa técnica.
- Columnas nuevas en `productos_` para `gtin`, `mpn` real, peso, dimensiones, color, material o garantía.
- `isVariantOf` / `ProductGroup` con la columna `variante`, e `isRelatedTo` con `related_products`.
- Especificaciones técnicas estructuradas: hoy `ficha` es solo una URL a un PDF externo.
- Reescribir `/terminos-y-condiciones` o `/aviso-de-privacidad`. Este spec ajusta el marcado a lo que ya dicen, no al revés.
- Corregir el `lastModified: new Date()` de `app/sitemap.ts`, que se recalcula en cada request.
- Agregar las fichas de producto a `sitemap.xml` o crear un sitemap index; `products.xml` se queda como está, referenciado desde `robots`.
- Descomentar los iconos de redes sociales del `Footer.tsx` y de `ContactoCliente.tsx`, que hoy siguen apuntando a las cuentas de Dipemsa. El `sameAs` del JSON-LD sí queda completo con las cuentas reales de Ferredip; restaurar los iconos visibles es un cambio de UI.
- Los atributos faltantes de Merchant Center distintos de `g:shipping` y `g:gtin`: `g:google_product_category`, `g:product_type`, `g:item_group_id`, `g:identifier_exists`.
- Los acentos faltantes de `slugToCategory` (`Jardineria`, `Medicion y pesaje`) y la desalineación de `slugToMarca` con las marcas reales del catálogo.
- Redirect 301 cuando el slug de la URL no coincide con el oficial. Este spec solo canonicaliza.

## Modelo de datos

Este spec **no toca la base de datos**. Introduce dos módulos de constantes y funciones puras.

### `src/shared/seo/negocio.ts` — fuente única de los datos del negocio

Los valores salen del JSON-LD que hoy vive inline en `app/(public)/page.tsx` (decisión: es la fuente autoritativa) y de `/terminos-y-condiciones`.

```ts
export const NEGOCIO = {
  nombre: 'Ferredip',
  url: 'https://ferredip.com.mx',
  logo: 'https://ferredip.com.mx/logo.webp',
  imagen: 'https://ferredip.com.mx/nuevologo.jpg',
  telefono: '+52-55-9236-8879',
  email: 'truperdipemsa@gmail.com',
  rangoPrecio: '$$',
  pagos: ['Cash', 'Credit Card', 'Transferencia', 'Mercado Pago'],
  sameAs: [
    'https://www.facebook.com/FerreDipPiramides/',
    'https://www.tiktok.com/@ferredip.tequisis',
  ],
} as const;

export const SUCURSALES = [
  {
    nombre: 'FERREDIP PIRAMIDES',
    calle: 'Carr. Mexico tulancingo Lote kilometro 27-5',
    localidad: 'Teotihuacán de Arista',
    region: 'Estado de México',
    cp: '55800',
    geo: { lat: 19.692939433412597, lng: -98.8239674153464 },
    telefono: '+52-55-7329-0946',
  },
  {
    nombre: 'FERREDIP TEQUISISTLAN',
    calle: 'Carretera Federal Lechería-Los Reyes km.34 Ejidos de Tequisistlán',
    localidad: 'Tequisistlán',
    region: 'Estado de México',
    cp: '56020',
    geo: { lat: 19.58853677394558, lng: -98.92532129999836 },
    telefono: '+52-55-6895-3906',
  },
] as const;

// Horario común a las dos sucursales: Lunes a Domingo 08:30–18:00.
export const HORARIO = { dias: 'Mo-Su', abre: '08:30', cierra: '18:00' } as const;

// Refleja lo que dice /terminos-y-condiciones, no lo que decía el JSON-LD viejo.
export const ENVIO = {
  umbralGratis: 5000,               // MXN — mismo valor que usa src/store/cartStore.ts
  regionGratis: 'CDMX y Área Metropolitana',
  pais: 'MX',
  handlingDias: { min: 1, max: 2 },
  transitoDias: { min: 1, max: 3 },
} as const;

export const DEVOLUCION = {
  diasCambio: 3,                    // «de 1 a 3 días naturales» en los términos
  metodo: 'ReturnInStore',          // reportar con el chofer o en tienda, no por paquetería
  reembolso: 'StoreCredit',         // nota de crédito, no efectivo
  vigenciaNotaCreditoDias: 30,
} as const;
```

`ENVIO.umbralGratis` es el mismo 5000 que ya usa `cartStore.ts`. Si en el futuro cambia, son dos lugares (ver Riesgos).

### `src/shared/seo/jsonLd.ts` — constructores

```ts
export function organizacionJsonLd(): object;                       // @graph: Organization + WebSite + 2 HardwareStore
export function productoJsonLd(producto: ResultadosType): object;   // Product completo
export function listadoJsonLd(args: {
  tipo: 'categoria' | 'marca';
  slug: string;
  nombre: string;
  productos: { id: string; nombre: string; precio: string }[];      // ya recortado a 30
}): object;                                                         // CollectionPage + ItemList
export function breadcrumbJsonLd(items: { nombre: string; url: string }[]): object;
```

Devuelven objetos planos. Cada página los serializa con `JSON.stringify` dentro de su `<script type="application/ld+json">`, igual que hoy.

### Reglas derivadas, no inventadas

- `availability`: `parseFloat(precio) > 0 ? 'InStock' : 'OutOfStock'`. Coherente con el filtro `precioMayorACero` que ya oculta del catálogo los productos sin precio. `getProductById` no aplica ese filtro, así que la rama `OutOfStock` sí se alcanza.
- `priceValidUntil`: fecha de hoy + 365 días, calculada en cada render. Hoy está fija en `"2026-12-31"`.
- `sku` = `clave`, `mpn` = `clave`, `productID` = `id`. `feed.xml` ya manda `g:mpn = clave`, así que queda consistente.
- `image`: `[fotoPrincipalZoom(id), ...fotosAdicionalesDe(id)]` — helpers que ya existen en `src/utils/fotos.ts` (SPEC 08).
- `description`: `producto.informacion` si existe, si no `producto.descripcion`. Es el mismo criterio que ya usa `feed.xml` para `g:description`, y `informacion` es el único texto largo que se renderiza visible en la ficha.

## Plan de implementación

1. **Fuente única de datos del negocio.** Crear `src/shared/seo/negocio.ts` con `NEGOCIO`, `SUCURSALES`, `HORARIO`, `ENVIO` y `DEVOLUCION`, copiando los valores del JSON-LD inline del home y de `/terminos-y-condiciones`. Nadie lo importa todavía; el sitio funciona igual.

2. **Constructores de JSON-LD.** Crear `src/shared/seo/jsonLd.ts` con las cuatro funciones del modelo de datos, alimentadas por `negocio.ts`. Sin `aggregateRating` ni `review` en `productoJsonLd`. Todavía sin montar en ninguna página.

3. **Home: `@graph` + `h1`.** En `app/(public)/page.tsx`, reemplazar el JSON-LD inline por `organizacionJsonLd()`: un `@graph` con `Organization`, `WebSite` (con `SearchAction` apuntando a `/resultados/{search_term_string}`) y los dos `Place` convertidos a `HardwareStore` — `priceRange` y `paymentAccepted` se mueven ahí, que es donde schema.org las define. Agregar un `h1` con el nombre y giro del negocio arriba del slider, con las clases actuales del `h2 CATEGORÍAS`. Agregar `alternates.canonical` (el home no tiene) y corregir la URL `www` de `twitter.images`, que no coincide con el resto del sitio.

4. **Producto: limpiar y enriquecer.** En `app/(public)/producto/[id]/[slug]/page.tsx`: reemplazar los dos bloques inline por `breadcrumbJsonLd()` y `productoJsonLd()`. El breadcrumb pasa a usar `slugToMarca`/`slugToCategory` para los nombres reales en vez de los literales `"Marca"` y `"Producto"`. Cambiar `alternates.canonical` a `slugify(producto.descripcion)`. Cambiar el `return <div>Producto no encontrado</div>` por `notFound()`. Corregir `openGraph.description` para que no interpole `informacion` crudo.

5. **Listados: JSON-LD + `h1`.** En `app/(public)/categoria/[slug]/page.tsx` y `app/(public)/marca/[slug]/page.tsx`, emitir `listadoJsonLd()` y `breadcrumbJsonLd()` con los 30 primeros productos que ya devuelve la query. Corregir las imágenes OpenGraph a las rutas `.webp` reales (`/productos/{slug}.webp` y `/marcas/{slug}.webp`). Promover a `h1` el `h2` de `CategoryResults.tsx:34` y el de `TrademarckResults.tsx:26`, conservando las clases. Este último además pasa a usar `slugToMarca` en vez de su parche `replace('banos','baños')`.

6. **`h1` en `/marcas`.** Agregar el `h1` a nivel de la página `app/(public)/marcas/page.tsx`, no dentro de `Marcas.tsx` (ver Riesgos). El `h1` de `/productos` ya queda cubierto por el paso 5, porque esa página renderiza `CategoryResults`.

7. **`robots.ts` unificado.** Borrar `app/robots.txt` y `app/(public)/robots.txt`. Crear `app/robots.ts` con la API `MetadataRoute.Robots`: `Allow: /` general; `Disallow` a `/api/`, `/resultados/`, `/carrito-de-compra`, `/compra/` y `/productos/relacionados` (la ruta admin real, hoy sin bloquear); reglas `Allow: /` explícitas para GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, meta-externalagent, Amazonbot, Bytespider, cohere-ai, YouBot y Diffbot; y `sitemap` apuntando a `sitemap.xml` y `products.xml` en el host **sin** `www`, el mismo de `metadataBase`.

8. **`llms.txt`.** Crear `app/llms.txt/route.ts` — mismo patrón que `app/feed.xml/route.ts`, que ya existe. Devuelve Markdown con `Content-Type: text/plain; charset=utf-8`: qué es Ferredip, sucursales y horarios desde `negocio.ts`, condiciones de envío y devolución desde `ENVIO`/`DEVOLUCION`, las 20 categorías con su URL derivadas de `src/shared/db/productos.ts`, las 9 marcas con su URL derivadas de `src/shared/db/marcas.ts`, las redes sociales de `NEGOCIO.sameAs`, las páginas clave, y punteros a `/sitemap.xml`, `/products.xml` y `/feed.xml`. Sin consultar la base de datos.

9. **`feed.xml` alineado.** En `app/feed.xml/route.ts`, cambiar `g:shipping` para que refleje `ENVIO` en vez del `0 MXN` fijo, omitir la etiqueta `g:gtin` cuando está vacía (hoy siempre sale `<g:gtin></g:gtin>`, pendiente anotado en la auditoría de agosto) y borrar la variable `slug` muerta de las líneas 27–29.

10. **Metadata de las páginas legales.** Agregar `export const metadata` con `title`, `description` y `alternates.canonical` a `app/(public)/terminos-y-condiciones/page.tsx` y `app/(public)/aviso-de-privacidad/page.tsx`, que hoy heredan `"Ferredip | Bienvenidos"`. Son las páginas que un modelo lee para responder sobre envíos y devoluciones.

## Criterios de aceptación

- [ ] El HTML de cualquier ficha de producto **no** contiene la cadena `aggregateRating` ni `"Jesus Peralta"`.
- [ ] El `Product` JSON-LD de un producto con `informacion` no vacía usa ese texto como `description`, no `"varios modelos"`.
- [ ] El `Product` JSON-LD trae `image` como arreglo, con tantas entradas como fotos tenga el producto según `src/shared/db/fotos-adicionales.json`.
- [ ] El `Product` JSON-LD declara `category`, `url`, `itemCondition`, `productID`, `sku` y `mpn`.
- [ ] `priceValidUntil` es una fecha posterior a hoy y cambia si se vuelve a cargar la página un año después.
- [ ] Un producto con `precio` mayor a 0 declara `availability: InStock`.
- [ ] El `BreadcrumbList` de `/producto/{id}/{slug}` muestra el nombre real de la marca y de la categoría, no `"Marca"` ni `"Producto"`.
- [ ] `shippingDetails` del JSON-LD y `g:shipping` de `/feed.xml` coinciden entre sí y con lo que dice `/terminos-y-condiciones`.
- [ ] `hasMerchantReturnPolicy` declara 3 días y nota de crédito, no 30 días y devolución gratis por paquetería.
- [ ] `/feed.xml` no contiene ninguna etiqueta `<g:gtin>` vacía.
- [ ] El validador de resultados enriquecidos de Google (`search.google.com/test/rich-results`) reporta cero errores en una ficha de producto, en `/categoria/cerrajeria` y en el home.
- [ ] El home emite un `@graph` con `Organization`, `WebSite` y dos `HardwareStore`.
- [ ] El `Organization` declara `sameAs` con las dos cuentas reales: `https://www.facebook.com/FerreDipPiramides/` y `https://www.tiktok.com/@ferredip.tequisis`.
- [ ] `/llms.txt` incluye esas dos URLs de redes sociales.
- [ ] El `WebSite` declara un `SearchAction` cuyo `urlTemplate` apunta a `/resultados/{search_term_string}`.
- [ ] `/categoria/cerrajeria` emite `CollectionPage` con un `ItemList` de como máximo 30 `ListItem`, cada uno con `name`, `url` e `image`.
- [ ] `/marca/truper` emite el mismo marcado con `ItemList`.
- [ ] Home, `/categoria/cerrajeria`, `/marca/truper`, `/marcas` y `/productos` tienen **exactamente un** `<h1>` cada una.
- [ ] Ninguna de esas cinco páginas cambia visualmente respecto de la versión anterior, salvo el `h1` nuevo del home.
- [ ] `curl -s https://ferredip.com.mx/robots.txt` devuelve un solo documento, con los `Sitemap:` sin `www`.
- [ ] Ese `robots.txt` contiene un bloque `User-agent: GPTBot` con `Allow: /`, y lo mismo para ClaudeBot, PerplexityBot, OAI-SearchBot y Google-Extended.
- [ ] Ese `robots.txt` contiene `Disallow: /productos/relacionados` y **no** contiene `/admin/`, `/dashboard/`, `/checkout/` ni `/cart/success`.
- [ ] Los archivos `app/robots.txt` y `app/(public)/robots.txt` ya no existen en el repo.
- [ ] `curl -s https://ferredip.com.mx/llms.txt` devuelve Markdown con las 20 categorías y las 9 marcas, cada una con su URL absoluta.
- [ ] Agregar una categoría a `src/shared/db/productos.ts` la hace aparecer en `/llms.txt` sin editar ningún otro archivo.
- [ ] `/producto/12345/texto-inventado` declara el mismo canonical que `/producto/12345/{slug-oficial}`.
- [ ] `/producto/999999999/x` devuelve status 404, no 200.
- [ ] El `<title>` de `/terminos-y-condiciones` no es `"Ferredip | Bienvenidos"`.
- [ ] Las imágenes OpenGraph de `/categoria/cerrajeria` y `/marca/truper` devuelven 200, no 404.
- [ ] Ningún archivo de `app/` ni `src/` contiene un literal `"@context": "https://schema.org"` fuera de `src/shared/seo/jsonLd.ts`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: quitar `aggregateRating` y `review`.** El marcado debe respaldar contenido visible, y no hay ni una reseña real en el sitio. Reseñas idénticas en 2170 productos son el caso de libro de *spammy structured markup*: riesgo de acción manual en Google y señal de baja confianza para cualquier modelo que evalúe la fuente. Se pierden las estrellas en resultados; recuperarlas legítimamente requiere el spec de reseñas reales, que queda anotado fuera de alcance.
- **No: derivar un rating de algún otro dato** (`destacado`, número de ventas). Sería inventar igual, solo que con más pasos.
- **Sí: el JSON-LD del home es la fuente autoritativa del NAP.** Es el único de los tres juegos de datos que trae domicilios completos, coordenadas y horarios. `/contacto` solo tiene WhatsApp y correo, y los teléfonos de `/terminos-y-condiciones` están marcados en `CLAUDE.md` como heredados de la era Dipemsa.
- **Sí: `sameAs` con Facebook y TikTok.** `sameAs` es la principal señal de entidad: es como un modelo confirma que la Ferredip de la que habla el sitio es la misma cuenta que ve en otras plataformas. El JSON-LD actual solo traía Facebook; el usuario aportó también `https://www.tiktok.com/@ferredip.tequisis`. Ambas se declaran aunque los iconos del footer sigan comentados — `sameAs` no exige un enlace visible, solo que los perfiles sean reales y de la misma entidad.
- **Sí: extraer ese NAP a `src/shared/seo/negocio.ts`.** Hoy vive como literal dentro de un componente de página, que es precisamente por lo que se desincronizó de `/contacto` y de los términos. Mismo criterio que `contact-info.ts` con el número de WhatsApp.
- **Sí: alinear el marcado a `/terminos-y-condiciones`, no al revés.** El texto legal es el compromiso real con el cliente; el JSON-LD era una plantilla copiada con valores de ejemplo (`300 MXN`, `FreeReturn`, `2026-12-31`). Reescribir los términos para que encajen con el marcado habría sido cambiar la política comercial desde un spec técnico.
- **No: quitar `shippingDetails` y `hasMerchantReturnPolicy`.** Son dos de los atributos que más pesan en e-commerce para Google y para las IAs; corregirlos cuesta lo mismo que borrarlos.
- **Sí: los dos `Place` del home pasan a `HardwareStore`.** `priceRange` y `paymentAccepted` ya estaban en el `Organization`, donde schema.org no las define — pertenecen a `LocalBusiness`. `HardwareStore` es el subtipo exacto del giro y es la señal que un modelo usa para responder consultas locales.
- **Sí: `@graph` en vez de varios `<script>` sueltos.** Permite que `WebSite` referencie al `Organization` por `@id` en vez de repetirlo, y es como Google documenta el caso de múltiples entidades en una página.
- **Sí: `llms.txt` como ruta generada.** `app/feed.xml/route.ts` ya establece el patrón en este repo, y derivarlo de `productos.ts` y `marcas.ts` evita el problema que tuvo `sitemap.ts` antes de la auditoría de agosto: una lista hardcodeada que se desincroniza. Se descartó `public/llms.txt` estático por eso mismo.
- **No: `llms-full.txt` con el catálogo completo.** 2170 productos con precio en Markdown es un archivo de varios MB regenerado en cada request, en un servicio que ya tuvo problemas de memoria y latencia bajo crawl agresivo (nota del 2026-08-24 en `CLAUDE.md`). El catálogo completo ya está disponible en `/products.xml` y `/feed.xml`.
- **Sí: unificar en `app/robots.ts`.** Hoy hay dos `.txt` resolviendo a la misma URL con contenido distinto — cuál gana es ambiguo. Generarlo desde TypeScript deja un solo archivo, permite derivar el host del mismo lugar que `metadataBase`, y sigue el patrón de `app/sitemap.ts`.
- **Sí: `Allow` explícito para todos los bots de IA, incluidos los de entrenamiento.** El catálogo ya es público y el objetivo del spec es aparecer citado. Se descartó separar bots de búsqueda y de entrenamiento porque la frontera no es estable y hoy no hay nada que proteger.
- **Sí: bloquear `/productos/relacionados`.** Es la única ruta admin real y hoy solo está protegida por su `meta robots`. Los disallows actuales (`/admin/`, `/dashboard/`, `/checkout/`, `/cart/success`, `/private/`) no corresponden a ninguna ruta de este sitio.
- **Sí: `ItemList` recortado a 30.** Cubre lo que un modelo necesita para entender de qué trata la página sin sumar cientos de KB de JSON-LD a cada respuesta de una categoría grande. El listado completo sigue siendo rastreable siguiendo los enlaces.
- **Sí: canonical del producto desde `slugify(producto.descripcion)`.** Es el mismo slug que ya generan `products.xml` y `feed.xml`, así que las tres señales apuntan a la misma URL. Hoy el canonical se construye con el slug que venga en la URL, o sea que un bot puede fabricar infinitas URLs canónicas del mismo producto.
- **No: redirect 301 al slug oficial.** Es la señal más fuerte, pero `descripcion` es una columna editable: si cambia, todos los enlaces existentes de ese producto empiezan a redirigir. El canonical consolida igual sin ese riesgo.
- **Sí: `notFound()` en la ficha de producto.** Un id inexistente devuelve hoy un `<div>` con status 200 — un soft 404 que ensucia el índice y que un modelo puede llegar a citar como si fuera una página real.
- **Sí: `h1` en las cinco plantillas, con las clases actuales.** El cambio es de semántica, no de diseño: el `h2` que ya existe pasa a `h1` conservando su `className`. El único agregado visible es el `h1` del home, que hoy no tiene ninguno.
- **No: escribir páginas de contenido (FAQ, «sobre nosotros», envíos).** Es lo que más movería la aguja en citación por IA, pero exige textos reales del negocio y convierte un spec técnico en uno de contenido. Queda como el siguiente spec natural.
- **Sí: `availability` derivado del precio.** El catálogo ya oculta los productos sin precio vía `precioMayorACero`, así que precio > 0 es la definición operativa de «disponible» que el sitio ya usa. Se descartó marcar disponibilidad real desde `existencias`/`disponible`: son columnas que existen pero que ningún proceso mantiene actualizadas hoy.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Quitar `aggregateRating` elimina las estrellas de los resultados de Google y puede bajar el CTR a corto plazo. | Es el costo de eliminar marcado que hoy expone al sitio a una acción manual. La alternativa legítima queda anotada como spec futuro de reseñas reales. |
| `ENVIO.umbralGratis` (5000) duplica el valor que ya vive en `src/store/cartStore.ts`. Si uno cambia y el otro no, el marcado vuelve a contradecir al sitio. | Queda anotado en `negocio.ts` con un comentario que apunta al store. Unificarlos exigiría que el store importe del módulo de SEO, un acoplamiento que este spec no quiere introducir. |
| `Marcas.tsx` se renderiza tanto en `/marcas` como dentro del home (`page.tsx:5` importa el componente de página de `/marcas`). Promover su `h2` a `h1` metería un segundo `h1` en el home. | El `h1` de `/marcas` se agrega a nivel de página, no dentro de `Marcas.tsx`. Está en los criterios de aceptación como «exactamente un `h1`». |
| Borrar los dos `robots.txt` y generar uno nuevo es un cambio que solo se verifica en producción; un error deja el sitio sin robots o bloqueando de más. | El paso 7 es commitable solo, y el criterio de aceptación es un `curl` directo contra producción tras el deploy. `next build` además falla si coexisten `robots.ts` y `robots.txt`. |
| El `ItemList` recortado a 30 puede sugerirle a un modelo que la categoría solo tiene 30 productos. | El `ItemList` parcial no declara `numberOfItems`, así que no se afirma un total falso. |
| `slugify(producto.descripcion)` puede producir un slug distinto del que hoy circula enlazado, si `descripcion` cambió desde que se generó el enlace. | Es exactamente el slug que ya publican `products.xml` y `feed.xml`, o sea el que Google ya conoce. El id sigue resolviendo la página bajo cualquier slug, así que ningún enlace se rompe. |
| Las páginas de listado pasan a serializar 30 productos en JSON-LD por render, en un servicio con historial de problemas de memoria bajo crawl. | Es serialización de objetos ya cargados en memoria por la query existente — no agrega consultas ni invoca `sharp`, que era el origen real del problema del 2026-08-24. |

## Lo que **no** está en este spec

- Reseñas reales de producto (tabla, formulario, moderación, UI) y el regreso de `aggregateRating`.
- Páginas de contenido nuevas: FAQ con `FAQPage`, «sobre nosotros», envíos y devoluciones como página propia.
- Columnas nuevas en `productos_`: `gtin`, `mpn` real, peso, dimensiones, color, material, garantía, especificaciones estructuradas.
- `isVariantOf` / `ProductGroup` e `isRelatedTo` en el `Product` JSON-LD.
- Reescribir `/terminos-y-condiciones` o `/aviso-de-privacidad`.
- Redirect 301 del slug de producto al slug oficial.
- Fichas de producto en `sitemap.xml`, sitemap index, y el `lastModified` recalculado en cada request.
- Los atributos de Merchant Center distintos de `g:shipping` y `g:gtin`.
- Descomentar los iconos de redes sociales del footer y de `/contacto` (el `sameAs` del JSON-LD sí queda completo).
- Los acentos de `slugToCategory` y la desalineación de `slugToMarca` con el catálogo real.

Cada uno de ellos, si se hace, va en su propio spec.
