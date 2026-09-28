# SPEC 09 — Menú de categorías en la página de productos

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-08-31
> **Objetivo:** Convertir `/productos` de un índice de imágenes de categoría en un catálogo con fichas de producto, agregando un menú de categorías lateral en escritorio y desplegable en móvil, compartido con las páginas `/categoria/[slug]`.

## Por qué existe este spec

Hoy `/productos` — enlazada desde el menú principal del header, en escritorio y en móvil — no muestra ni un solo producto. Renderiza `ProductsSection`, una grilla de 20 imágenes de categoría alimentada por `src/shared/db/productos.ts`. El usuario que entra buscando qué vende Ferredip tiene que dar un segundo clic para ver la primera ficha con precio.

Al mismo tiempo, `/categoria/[slug]` ya hace exactamente lo que falta: `CategoryResults` consulta `getProductsByGroupsofCategories(slug)` y pinta las fichas con `GroupCard`. Lo que no tiene es navegación lateral: una vez dentro de una categoría, la única forma de saltar a otra es volver atrás hasta `/productos` o el home.

Este spec resuelve ambos problemas con un solo componente: un menú de categorías que vive dentro de `CategoryResults`, de modo que aparece tanto en `/categoria/[slug]` como en `/productos`, y que hace que `/productos` muestre las fichas de la primera categoría en vez del índice de imágenes.

La referencia visual es el layout de resultados de Mercado Libre: columna izquierda de texto plano con el título de la faceta, grilla de fichas a la derecha.

## Alcance

**Dentro:**

- Componente nuevo `src/shared/components/CategoriasMenu.tsx`, client component, único responsable del menú en sus dos formas (sidebar de escritorio y acordeón móvil).
- `src/shared/components/CategoryResults.tsx`: pasa a un layout de dos columnas con el menú a la izquierda, y su grilla baja de 4 a 3 columnas en escritorio.
- `app/(public)/productos/page.tsx`: deja de renderizar `ProductsSection` y pasa a renderizar `CategoryResults` con la primera categoría de `src/shared/db/productos.ts`.
- Canonical de `/productos` apuntando a `https://ferredip.com.mx/categoria/{primera-categoría}`.
- Actualizar las `keywords` de `/productos`, que hoy siguen listando categorías de la era Dipemsa (`tablaroca`, `cempanel`, `plafones`, `liner panel`…) que ya no existen en el catálogo.

**Fuera de alcance (para specs futuros):**

- El menú en `/marca/[slug]` (`TrademarckResults.tsx`). Este spec solo toca categorías.
- Un menú de marcas equivalente, o filtros combinados (categoría + marca, rango de precio, orden por precio) como en la captura de referencia.
- Paginación o scroll infinito. `getProductsByGroupsofCategories` sigue devolviendo todos los productos de la categoría de una sola vez, igual que hoy.
- Contador de productos por categoría junto a cada nombre del menú (exigiría una consulta agregada nueva).
- Búsqueda dentro del menú o el patrón «Mostrar más» de la captura: las 20 categorías se listan completas.
- Cualquier cambio al home (`app/(public)/page.tsx`), que conserva su grilla de imágenes de categoría intacta.
- Borrar `ProductsSection.tsx` o `src/shared/db/productos.ts`: ambos se siguen usando (el home renderiza el primero, `app/sitemap.ts` importa el segundo).
- Reordenar las categorías o cambiar cuál es la primera.

## Modelo de datos

Este spec **no introduce estructuras de datos nuevas**. Reutiliza las que ya existen:

- `productos: ProductosType[]` de `src/shared/db/productos.ts` — las 20 categorías con imagen, en el orden en que se listan en `listaCatego`. Es la misma fuente que ya consumen el home y `app/sitemap.ts`. El campo `src` (la imagen) no se usa en el menú; solo `name` (el slug).
- `slugToCategory(slug)` de `src/shared/db/queries.ts` — mapa slug → nombre legible con acentos (`"cerrajeria"` → `"Cerrajería"`).
- `getProductsByGroupsofCategories(slug)` — sin cambios.

**La primera categoría se deriva, no se escribe a mano:**

```ts
// app/(public)/productos/page.tsx
import { productos } from '@/src/shared/db/productos';

const primeraCategoria = productos[0].name;   // hoy: "acabados-y-remodelacion"
```

El canonical se construye con esa misma constante. Reordenar `listaCatego` cambia qué categoría muestra `/productos` y su canonical de forma coherente, sin tocar dos lugares.

**Contrato del componente nuevo:**

```ts
// src/shared/components/CategoriasMenu.tsx
type Props = {
  activeSlug: string;   // slug de la categoría que se está viendo
};
```

`activeSlug` llega como prop desde el servidor en vez de derivarse de `usePathname()`, porque en `/productos` el pathname no contiene el slug de la categoría que se está mostrando.

## Plan de implementación

1. **Componente del menú.** Crear `src/shared/components/CategoriasMenu.tsx` (`'use client'`, `useState` solo para el abierto/cerrado del acordeón móvil). Renderiza el título `CATEGORÍAS` y un `<Link href={`/categoria/${name}`}>` por cada entrada de `productos`, con el nombre vía `slugToCategory(name)`. La entrada cuyo slug coincide con `activeSlug` va en `#FF5E00` y `font-bold`; el resto en gris con `hover:text-[#FF5E00]`. Todavía no se monta en ninguna página: el sitio sigue funcionando igual.

2. **Las dos formas del menú.** Dentro del mismo componente:
   - **Escritorio (`md:` en adelante):** `<aside>` de ancho fijo ~260px, `md:sticky` con `top` igual al alto del header y `max-height` + `overflow-y-auto` para que las 20 entradas quepan. El header del sitio es `md:sticky md:top-0 md:z-50` (`Header.tsx:17`) y mide ~280px, así que sin ese offset el menú queda debajo de él al hacer scroll.
   - **Móvil (por debajo de `md`):** botón a ancho completo, `sticky top-0 z-30`, que muestra `CATEGORÍAS` y el nombre de la categoría activa con un chevron; al hacer clic despliega la lista debajo. Se cierra al elegir una categoría. Por debajo de `md` el header **no** es sticky, así que `top-0` es seguro. El botón lleva `aria-expanded` y `aria-controls`, siguiendo el criterio de `aria-label` que ya usa el botón de menú móvil del header.

3. **Montarlo en `CategoryResults`.** Envolver el contenido actual de `CategoryResults.tsx` en un contenedor `flex` dentro del mismo `max-w-7xl`: `<CategoriasMenu activeSlug={slug} />` a la izquierda y la columna de fichas a la derecha. La grilla pasa de `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. El `<h2>` con el nombre de la categoría se mueve a la columna derecha y deja de estar centrado a lo ancho de la página. `ViewItemListTracker` y sus props (`listId`, `listName`) no cambian. Verificable de inmediato en cualquier `/categoria/[slug]`.

4. **Reconvertir `/productos`.** En `app/(public)/productos/page.tsx`: quitar el import de `ProductsSection`, importar `productos` y `CategoryResults`, derivar `primeraCategoria` y renderizar `<CategoryResults slug={primeraCategoria} />`. Se elimina el `<h2>PRODUCTOS</h2>` y su `<section>` contenedora, porque `CategoryResults` ya trae su propio título y su propio `py-16 bg-gray-50`.

5. **Metadata de `/productos`.** Cambiar `alternates.canonical` de `'/productos'` a `` `https://ferredip.com.mx/categoria/${primeraCategoria}` `` (absoluto, como ya lo hace `/categoria/[slug]`). Reemplazar la lista de `keywords` por las 20 categorías reales del catálogo. `title` y `openGraph` se conservan.

## Criterios de aceptación

- [ ] `/productos` muestra fichas de producto con precio, no la grilla de imágenes de categoría.
- [ ] El título arriba de las fichas en `/productos` dice `ACABADOS Y REMODELACIÓN`, y no `PRODUCTOS`.
- [ ] `/productos` muestra el menú de categorías con `Acabados y remodelación` resaltada en `#FF5E00`.
- [ ] `/productos` **no** muestra los bloques de recomendados ni de vistos recientemente.
- [ ] `/categoria/cerrajeria` muestra el mismo menú, con `Cerrajería` resaltada, y **sí** conserva los bloques de recomendados y vistos recientemente.
- [ ] Hacer clic en `Plomería` desde `/productos` navega a `/categoria/plomeria` y deja `Plomería` resaltada.
- [ ] El menú lista las 20 categorías de `src/shared/db/productos.ts`, con acentos (`Cerrajería`, `Iluminación`, `Plomería`).
- [ ] En una ventana de 1440px de ancho, la grilla muestra 3 fichas por fila y el menú queda a la izquierda dentro del mismo ancho de página que el resto del sitio.
- [ ] Al hacer scroll en escritorio, el menú permanece visible y no queda oculto detrás del header sticky.
- [ ] En una ventana de 390px de ancho, el menú lateral no se muestra y en su lugar aparece una barra superior con el nombre de la categoría activa.
- [ ] Esa barra permanece visible al hacer scroll, y al hacer clic despliega las 20 categorías; elegir una navega y cierra el desplegable.
- [ ] El `<head>` de `/productos` declara `<link rel="canonical" href="https://ferredip.com.mx/categoria/acabados-y-remodelacion">`.
- [ ] El home (`/`) sigue mostrando su grilla de imágenes de categoría sin cambios.
- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] En `/productos` se dispara un evento `view_item_list` de GTM con `item_list_id` = `categoria_acabados-y-remodelacion`.

## Decisiones

- **Sí: el menú enlaza a `/categoria/[slug]`.** No genera ninguna URL nueva ni contenido duplicado, reusa páginas que ya están indexadas y en el sitemap, y el botón «atrás» del navegador funciona sin escribir nada. Se descartó `/productos?categoria=slug`, que habría creado una segunda URL indexable por cada categoría con contenido idéntico al de `/categoria/[slug]`, obligando a decidir canonicals para 20 páginas en vez de una.
- **No: estado solo en cliente.** Cambiar las fichas sin tocar la URL habría impedido compartir un link a una categoría, roto el botón «atrás» y dejado a Google viendo únicamente la primera categoría.
- **Sí: el menú vive dentro de `CategoryResults`, no en un layout.** `CategoryResults` es el único componente que renderiza fichas de categoría, así que ponerlo ahí lo hace aparecer en las dos páginas del alcance con un solo cambio. Un `layout.tsx` compartido habría exigido mover `/productos` y `/categoria/[slug]` bajo un mismo segmento de ruta — un cambio de URLs que este spec no quiere.
- **Sí: `activeSlug` como prop, no `usePathname()`.** En `/productos` el pathname no contiene el slug de la categoría mostrada; derivarlo del pathname habría exigido un caso especial dentro del componente por cada ruta que lo monte.
- **Sí: `/productos` se queda como página y declara canonical a la categoría.** Está enlazada desde el menú del header en escritorio y en móvil, así que redirigir con 301 habría dejado ese enlace apuntando de hecho a una categoría concreta, algo confuso al pasar el cursor. El canonical evita el duplicado sin tocar la navegación.
- **No: redirect 301 de `/productos` a la categoría.** Habría sido lo más simple en SEO, pero elimina una URL que el sitio usa como entrada principal a su catálogo.
- **Sí: la primera categoría se deriva de `productos[0].name`.** Escribir `"acabados-y-remodelacion"` a mano en la página y otra vez en el canonical habría creado dos lugares que se desincronizan al reordenar `listaCatego`.
- **Sí: el título de `/productos` es el nombre de la categoría.** Deja `CategoryResults` sin condicionales por ruta, y el título siempre describe lo que se está viendo. Se descartó un título fijo `PRODUCTOS`, que habría dejado la página sin decir qué categoría está mostrando salvo por el resaltado del menú.
- **Sí: `/productos` sin recomendados ni vistos recientemente.** Es la página de catálogo a la que llega el usuario desde el menú principal; se prioriza que las fichas ocupen la pantalla. `/categoria/[slug]` los conserva porque ahí el usuario ya viene navegando y esos bloques ayudan a seguir explorando.
- **Sí: 3 columnas dentro de `max-w-7xl`.** Conserva el ancho de página del resto del sitio y el tamaño actual de las fichas. Se descartó ensanchar el contenedor a `max-w-[1600px]` para conservar 4 columnas, porque `/productos` y `/categoria/[slug]` se verían más anchas que cualquier otra página; y se descartó comprimir las fichas, porque achica las fotos de producto, que son el argumento de venta.
- **Sí: menú de texto plano, sin miniaturas.** Sigue la captura de referencia, y 20 miniaturas habrían hecho la columna varias veces más alta que el viewport. Las imágenes de `public/productos/` siguen usándose en el home.
- **Sí: el corte entre las dos formas del menú es `md` (768px), no `lg`.** El header es `md:sticky md:top-0 md:z-50`: por debajo de `md` no es sticky y la barra móvil puede posicionarse en `top-0` sin conflicto, y desde `md` aparece el sidebar. Cortar en `lg` habría dejado la banda de 768–1023px con una barra sticky compitiendo con un header sticky de mayor `z-index`.
- **Sí: acordeón desplegable en móvil, no drawer lateral.** Es lo que pidió el usuario y no requiere overlay, bloqueo de scroll del `body`, ni manejo de foco. El drawer queda disponible como mejora futura si el menú crece con filtros.
- **No: se toca `app/sitemap.ts`.** `/productos` se queda listada aunque declare un canonical distinto. Es una inconsistencia menor y consciente (ver Riesgos); sacarla del sitemap se puede hacer después sin tocar nada de este spec.
- **No: se toca `TrademarckResults.tsx` ni `/marca/[slug]`.** El mismo menú tiene sentido ahí, pero mezclar categorías y marcas en una sola pasada abre la pregunta de los filtros combinados, que es otro spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El header sticky mide ~280px; un `top` mal calculado deja el sidebar tapado al hacer scroll. | El offset se verifica a mano en el paso 3 y está en los criterios de aceptación. El `max-height` + `overflow-y-auto` evita además que las 20 entradas desborden el viewport. |
| `/productos` sigue en `app/sitemap.ts` mientras declara un canonical hacia otra URL. Google desaconseja listar URLs no canónicas en un sitemap. | Es una señal débil y no penalizable: Google respeta el canonical. Queda anotado por si en el futuro se decide sacarla del sitemap. |
| `productos[0]` asume que `listaCatego` nunca queda vacío. Si se vacía, `/productos` rompe en build. | El arreglo es un literal en el repo con 20 entradas; vaciarlo también rompería el home y el sitemap, que lo consumen igual. |
| Una categoría sin productos con precio > 0 mostraría la grilla vacía sin ningún mensaje. Ya pasa hoy en `/categoria/[slug]`. | Comportamiento preexistente, no lo introduce este spec. Con el menú siempre visible el usuario tiene ahora una salida evidente hacia otra categoría. |
| Las 20 categorías del menú se listan aunque alguna no tenga productos, porque `src/shared/db/productos.ts` refleja qué categorías tienen imagen, no cuáles tienen catálogo. | Es la misma fuente que ya usan el home y el sitemap; unificarla con el catálogo real exigiría una consulta agregada, fuera del alcance. |

## Lo que **no** está en este spec

- Menú de categorías en `/marca/[slug]`.
- Filtros combinados (marca, precio, orden), «Mostrar más» y contadores por categoría, como en la captura de referencia.
- Paginación o scroll infinito en las páginas de categoría.
- Cambios al home o eliminación de `ProductsSection.tsx` / `src/shared/db/productos.ts`.
- Sacar `/productos` de `app/sitemap.ts`.

Cada uno de ellos, si se hace, va en su propio spec.
