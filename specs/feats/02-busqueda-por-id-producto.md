# SPEC 02 — Búsqueda de productos por id

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-08-17
> **Objetivo:** Permitir que el buscador del header encuentre un producto tecleando su `id` exacto (p. ej. `10303`), además de la búsqueda actual por clave, descripción y marca.

## Por qué existe este spec

El `id` es el identificador que aparece en la URL del producto (`/producto/{id}/{slug}`), en los correos de confirmación y en el nombre de archivo de su foto (`/fotos/webp/{id}.webp`). Es el dato con el que el equipo interno y los clientes mayoristas se refieren a un producto, pero es el único de esos identificadores que el buscador **no** consulta: `app/api/search/route.ts` sólo hace `ILIKE` sobre `clave`, `descripcion` y `marca`.

Al revisar el flujo apareció un segundo problema, prerequisito del primero: `cmdk` vuelve a filtrar en el cliente los resultados que ya filtró el servidor. `Command.Dialog` no define `shouldFilter`, así que usa el default `true` y puntúa cada `Command.Item` por su `value`, que hoy es `product.descripcion`. Aunque la API devuelva el producto del id `10303`, cmdk lo descarta porque la descripción no contiene esos dígitos. El mismo defecto ya degrada hoy la búsqueda por `clave`. Sin arreglar esto, la búsqueda por id no se vería en la UI aunque la query del servidor fuera correcta.

## Alcance

**Dentro:**

- `app/api/search/route.ts`: añadir match **exacto** por `id` al `OR` existente, y prioridad 0 en el `ORDER BY`.
- `src/shared/components/header/SearchBar.tsx`:
  - `shouldFilter={false}` en `Command.Dialog` para desactivar el filtrado cliente de cmdk.
  - `value={product.id}` en cada `Command.Item` (identidad estable en vez de descripciones repetidas).
  - Mostrar `#{id} · {clave}` en cada fila de resultado.
  - Añadir `clave` al tipo local `ProductSearch` (la API ya la devuelve, sólo no se tipaba ni se usaba).
  - Unificar el umbral mínimo en 3 caracteres (hoy: dispara con 2, la API exige 3, el mensaje de «sin resultados» usa `> 2`).

**Fuera de alcance (para specs futuros):**

- Match parcial o por prefijo de `id`.
- Navegación automática al detectar un id exacto.
- Búsqueda por `categoria`, `variante` o `informacion`.
- Full-text search de Postgres, `pg_trgm`, índices o cualquier trabajo de performance sobre la query.
- Saltar el filtro `precio > 0` para el match por id.
- Cambios de esquema en `productos_`.
- La página `resultados/[slug]`, que usa otro camino de datos.
- Rediseño visual del buscador más allá de la línea `#{id} · {clave}`.

## Modelo de datos

Este spec **no introduce estructuras nuevas**. Usa la columna existente `productos_.id` (`varchar(10)`, primary key). Los ids reales en producción son numéricos de 5–6 dígitos (`100103`, `21641`), verificado en `fotos-truper/_reporte.csv`.

Único cambio de tipo, en `SearchBar.tsx`:

```ts
type ProductSearch = {
  id: string;
  clave: string;        // <- nuevo: la API ya lo devolvía
  descripcion: string;
  precioant: string;
  precio: string;
  marca: string;
};
```

Comparación: `eq(productos.id, search.trim())`. Como `id` es `varchar`, es comparación de texto — sin casts a numérico y sin riesgo de romperse si algún día un id trae letras.

## Plan de implementación

1. **API — match exacto por id.** En `app/api/search/route.ts`, añadir `eq(productos.id, search.trim())` como primera rama del `or(...)`, dejándolo dentro del mismo `and(...)` que `gt(sql\`${productos.precio}::numeric\`, 0)`. Importar `eq` de `drizzle-orm`.
   *Verificación:* `curl "localhost:3000/api/search?q=10303"` devuelve ese producto (asumiendo que existe y tiene precio).

2. **API — prioridad en el orden.** Añadir al `CASE` del `ORDER BY` una rama previa: `WHEN id = ${search} THEN 0`, corriendo el resto (`clave` 1, `descripcion` 2, `marca` 3, `ELSE` 4).
   *Verificación:* si un id coincide y además hay matches por descripción, el producto del id sale primero en el JSON.

3. **UI — desactivar el filtrado cliente de cmdk.** `shouldFilter={false}` en `Command.Dialog` y `value={product.id}` en `Command.Item`.
   *Verificación:* teclear `10303` en el buscador muestra la fila; teclear una `clave` (p. ej. `ST-724X`) también, cosa que hoy no ocurre.

4. **UI — mostrar id y clave.** Añadir `clave` al tipo `ProductSearch` y renderizar `#{product.id} · {product.clave}` en cada fila, con el mismo estilo tenue que ya usa la línea de marca (`text-xs text-gray-500`).
   *Verificación:* cada resultado muestra su id y clave; una fila con `clave` nula no imprime `· null` ni el separador suelto.

5. **UI — unificar el umbral en 3.** En `SearchBar.tsx`, cambiar el guard del `useEffect` a `query.length < 3` y el mensaje de «sin resultados» a `query.length >= 3`, para que coincidan con el `search.length < 3` de la API.
   *Verificación:* con 2 caracteres no se dispara ninguna petición (pestaña Network); con 3 sí.

## Criterios de aceptación

- [ ] `curl "localhost:3000/api/search?q={id_existente}"` devuelve el producto de ese id.
- [ ] Ese producto aparece **primero** en el arreglo cuando la consulta también matchea por descripción o marca.
- [ ] Teclear un id completo en el buscador del header muestra el producto como primer resultado de la lista.
- [ ] Hacer clic en ese resultado navega a `/producto/{id}/{slug}`.
- [ ] Teclear una `clave` existente (p. ej. `ST-724X`) muestra resultados — hoy cmdk los oculta.
- [ ] Un id de un producto con `precio` vacío o `0` no devuelve nada (el filtro `precio > 0` sigue aplicando).
- [ ] Un id parcial (`103` de `10303`) **no** devuelve el producto por la rama de id.
- [ ] Cada fila de resultado muestra `#{id} · {clave}`.
- [ ] Con 2 caracteres el buscador no dispara ninguna petición a `/api/search`.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** match exacto (`eq`) en vez de `ILIKE '%texto%'`. Con ids de 5–6 dígitos, un parcial haría que teclear `103` arrastre decenas de productos irrelevantes y ahogue los matches por nombre.
- **No:** navegación automática al detectar un id exacto. Secuestraría el input mientras el usuario todavía escribe, y un id es prefijo de otros ids.
- **Sí:** mantener el filtro `precio > 0` también para el match por id. El buscador es una superficie de venta; ser consistente con el resto del catálogo pesa más que poder rescatar un producto sin precio. (`getProductById` sí lo salta, pero ahí el usuario ya llegó por URL directa.)
- **Sí:** `shouldFilter={false}` en vez de meter id y clave dentro del `value` de cada item. El servidor ya filtra y ordena con su `CASE` de prioridad; dejar activo el score fuzzy de cmdk significa que reordena por su cuenta y pisa esa prioridad. Además el bug se arregla de raíz, no por casualidad de que el texto quepa en el `value`.
- **Sí:** `value={product.id}` en `Command.Item`. Con el filtro apagado el `value` ya sólo sirve como identidad del item seleccionado, y las descripciones se repiten entre variantes.
- **Sí:** unificar el umbral en 3. Ya existía la inconsistencia (2 en el cliente, 3 en la API), son dos líneas del mismo archivo que se toca, y no estorba a esta función porque ningún id tiene menos de 5 dígitos.
- **No:** índice sobre `id`. Ya es primary key, así que el match exacto lo aprovecha sin trabajo adicional.
- **No:** full-text search / `pg_trgm`. Es otro problema (calidad y performance de la búsqueda por texto) y merece su propio spec.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Apagar `shouldFilter` cambia el orden que hoy ve el usuario en toda búsqueda, no sólo por id | Es intencional: pasa a mandar el `CASE` del servidor, que es explícito y revisable. Los criterios de aceptación cubren búsqueda por nombre, por marca y por clave para detectar regresiones. |
| Un id que también aparece dentro de alguna `descripcion` genera dos filas del mismo producto | No puede: el `OR` es una sola condición sobre la misma fila, y una fila aparece una vez. |
| `clave` es nullable en el esquema | La fila renderiza el id solo, sin el separador `·`, cuando `clave` viene vacía. |
| Espacios al pegar el id desde un correo o una URL | `search.trim()` antes de comparar. |

## Lo que **no** está en este spec

- Match parcial o por prefijo de id.
- Navegación automática al id exacto.
- Full-text search, `pg_trgm` o índices de búsqueda.
- La página `resultados/[slug]`.
- Rediseño del buscador.
