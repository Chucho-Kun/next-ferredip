# SPEC 13 — Botón «Ver ficha técnica» en la página de producto

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-11
> **Objetivo:** Dejar funcional el botón «Ver ficha técnica» de `ProductCard.tsx` ampliando la columna `ficha` a 150 caracteres, normalizando sus datos vacíos y agregando una guarda de validación para que una URL mal capturada no pinte un botón roto.

## Por qué existe este spec

El usuario pidió agregar un botón «Ver ficha técnica» con el diseño del screenshot adjunto (`screenshots/Captura de Pantalla 2026-09-11 a la(s) 9.55.12.png`) y una columna nueva de 150 caracteres en `productos_` para guardar la URL.

Al explorar el repo y consultar la base de Railway se encontró que **casi todo ya existe**:

| Pieza | Estado real |
|---|---|
| Botón con el diseño del screenshot | Ya implementado — `src/shared/components/ProductCard.tsx:262-275` (fondo `#0033A0`, icono `Eye` de lucide, texto «Ver ficha técnica», `rounded-lg`, ubicado entre la descripción y el precio) |
| Columna en la base | Ya existe: `ficha` `character varying(100)` en `productos_` (Railway, verificado con `information_schema.columns`) |
| Columna en el schema Drizzle | `src/shared/db/schema/productList.ts:23` — `ficha: varchar('ficha', { length: 100 })` |
| Campo en el tipo TS | `src/shared/db/resultados.ts:18` — `ficha: string \| null` |
| Migración | `drizzle/0005_little_celestials.sql` — `ALTER TABLE "productos_" ADD COLUMN "ficha" varchar(100);` |
| **Datos** | **2170 de 2170 filas tienen `ficha = ''`** (cadena vacía, no `NULL` — verificado con `count(ficha)` vs `count(nullif(trim(ficha),''))`) |

`getProductById` (`src/shared/db/queries.ts:114-121`) hace `select()` sin columnas explícitas, así que ya trae `ficha` hasta el componente. El render es `{ producto.ficha && (<a href={producto.ficha} ...>...</a>) }` — como una cadena vacía es *falsy* en JavaScript, el botón nunca aparece hoy, independientemente de que el markup ya esté listo. No falta el botón: faltan los datos, y la columna se quedó corta en 100 caracteres frente a los 150 pedidos.

Este spec cierra esa brecha: amplía la columna, limpia los vacíos, y endurece el render para que cargar 2170 URLs a mano en TablePlus no deje botones apuntando a basura si algún valor queda mal escrito.

## Alcance

**Dentro:**

- Ampliar la columna `ficha` de `productos_` de `varchar(100)` a `varchar(150)`, en Railway, en el schema de Drizzle y en una migración generada.
- Normalizar las 2170 filas con `ficha = ''` a `ficha = NULL`.
- Agregar una guarda de validación en `ProductCard.tsx`: el botón solo se pinta si `producto.ficha`, después de `trim()`, no queda vacío y empieza con `http://` o `https://`.
- `npm run build` y `npm run lint` en verde al terminar.

**Fuera de alcance (para specs futuros):**

- Renombrar la columna (`ficha` se queda como está — ver Decisiones).
- Cargar las URLs reales de las 2170 fichas técnicas. Se hace a mano en TablePlus, fuera de este spec, igual que el import del catálogo (documentado en `CLAUDE.md`).
- Un script que derive o descargue las URLs de ficha técnica desde Truper (al estilo de `scripts/download-truper-images.mjs`).
- Un campo editable de `ficha` en `app/(admin)/productos/`. Ese panel hoy solo gestiona `related_products` y no tiene ningún tipo de autenticación (ver `CLAUDE.md`) — exponer edición de catálogo ahí es un riesgo que merece resolverse aparte.
- Mostrar el botón en `GroupCard.tsx` (tarjetas de listado de categoría/marca), en `RelatedProducts.tsx`, `RecommendedProducts.tsx` o `RecentViewProducts.tsx`. Estos tres últimos usan `RelatedProductType`, que hoy no incluye `ficha`, y `getRelatedProducts` (`queries.ts:154`) hace un `select()` explícito que tampoco la trae — extenderlos es trabajo aparte.
- Incluir `ficha` en JSON-LD (`src/shared/seo/jsonLd.ts`) o en `app/feed.xml/route.ts`.
- Cualquier protección o `CHECK constraint` en la base más allá de la guarda en el componente.

## Modelo de datos

No se introduce ninguna tabla ni tipo nuevo. Se modifica la columna existente `ficha` de `productos_`.

| Campo | Antes | Después |
|---|---|---|
| `productos_.ficha` (Postgres) | `character varying(100)`, 2170 filas en `''` | `character varying(150)`, filas vacías en `NULL` |
| `src/shared/db/schema/productList.ts:23` | `varchar('ficha', { length: 100 })` | `varchar('ficha', { length: 150 })` |
| `src/shared/db/resultados.ts:18` | `ficha: string \| null` | sin cambio — el tipo ya admite `null` |

DDL a ejecutar a mano contra `DATABASE_URL`:

```sql
ALTER TABLE "productos_" ALTER COLUMN "ficha" TYPE varchar(150);
UPDATE "productos_" SET "ficha" = NULL WHERE trim("ficha") = '';
```

## Plan de implementación

1. **Ampliar la columna en Railway.** Ejecutar `ALTER TABLE "productos_" ALTER COLUMN "ficha" TYPE varchar(150);` a mano contra `DATABASE_URL` (TablePlus o un script node de una sola vez con el driver `pg`, mismo camino que ya usa `CLAUDE.md` para cambios puntuales de esta tabla). **No correr `npx drizzle-kit migrate`**: `drizzle.__drizzle_migrations` está vacía (0 filas, verificado en SPEC 07), así que intentaría re-aplicar las 6 migraciones desde `0000_worried_manta.sql` y reventaría al crear `productos_` de nuevo. `drizzle-kit push` tampoco: compara todo el schema contra la base y cualquier drift se convertiría en un `ALTER TABLE` no pedido. Ampliar un `varchar` en Postgres ≥ 9.2 no reescribe la tabla — es una operación de catálogo instantánea que no bloquea lecturas concurrentes.
   *Verificación:* `select character_maximum_length from information_schema.columns where table_name='productos_' and column_name='ficha'` devuelve `150`.

2. **Normalizar los vacíos.** Ejecutar `UPDATE "productos_" SET "ficha" = NULL WHERE trim("ficha") = '';` contra la misma conexión. Es idempotente: una segunda ejecución no afecta ninguna fila.
   *Verificación:* `select count(ficha) from productos_` pasa de 2170 a 0; `select count(*) from productos_` sigue en 2170 (no se borró ninguna fila).

3. **Actualizar el schema de Drizzle.** En `src/shared/db/schema/productList.ts:23`, cambiar `varchar('ficha', { length: 100 })` por `varchar('ficha', { length: 150 })`.
   *Verificación:* `npm run lint` no reporta nada nuevo sobre este archivo.

4. **Generar la migración.** Correr `npx drizzle-kit generate`. Esto solo escribe archivos en `drizzle/` (un `.sql` nuevo, un snapshot y una entrada en `meta/_journal.json`) — no toca la base, que ya se alteró a mano en el paso 1. El diff parte de `drizzle/meta/0005_snapshot.json`, que ya incluye `related_products` y el resto de columnas actuales, así que el `.sql` generado debe contener una única sentencia.
   *Verificación:* el archivo nuevo (`drizzle/0006_*.sql`) contiene solo `ALTER TABLE "productos_" ALTER COLUMN "ficha" TYPE varchar(150);` y nada más.

5. **Guarda de validación en el componente.** En `src/shared/components/ProductCard.tsx`, antes del `return`, calcular:

   ```ts
   const fichaUrl = producto.ficha?.trim();
   const fichaValida = fichaUrl && /^https?:\/\//.test(fichaUrl);
   ```

   y cambiar la condición del bloque `:263` de `{ producto.ficha && ( ... ) }` a `{ fichaValida && ( ... ) }`, usando `fichaUrl` en el `href` en vez de `producto.ficha`. El markup del botón (icono `Eye`, clases, `target="_blank"`, `rel="noopener noreferrer"`) no se toca — ya coincide con el diseño del screenshot.
   *Verificación:* con un valor de prueba `"  https://ejemplo.com/ficha.pdf  "` el botón aparece y el `href` no lleva espacios; con `"solo-un-nombre.pdf"` o `"   "` el botón no se renderiza.

6. **Build y lint.** Correr `npm run build` y `npm run lint`.
   *Verificación:* ambos terminan sin errores.

## Criterios de aceptación

- [ ] `information_schema.columns` reporta `character_maximum_length = 150` para `productos_.ficha`.
- [ ] Insertar o actualizar una fila con una `ficha` de exactamente 150 caracteres no da error; 151 caracteres sí lo da (comportamiento nativo de `varchar`, no requiere código nuevo).
- [ ] `select count(ficha) from productos_` es `0` tras el `UPDATE` de normalización (ninguna fila en `''`).
- [ ] `select count(*) from productos_` sigue en 2170 tras los pasos 1 y 2 (no se perdió ninguna fila).
- [ ] En un producto de prueba con `ficha = 'https://…'`, la página de producto muestra el botón azul «Ver ficha técnica» con el icono, en el mismo lugar que el screenshot.
- [ ] El botón abre la URL en una pestaña nueva (`target="_blank"`, `rel="noopener noreferrer"`).
- [ ] Un producto con `ficha` en solo espacios, o con un valor que no empieza con `http://`/`https://`, no muestra el botón.
- [ ] Un producto con `ficha = NULL` (la mayoría hoy) se ve exactamente igual que antes de este spec — sin botón, sin hueco visual.
- [ ] `drizzle/` tiene una migración nueva cuyo único cambio es el `ALTER COLUMN` de `ficha`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: la columna se queda con el nombre `ficha`.** Ya existe con ese nombre en la base, el schema, el tipo `ResultadosType` y `ProductCard.tsx`; renombrarla exigiría un `RENAME COLUMN` sobre una tabla de catálogo en producción sin ningún beneficio funcional. Se descartó `ficha-tecnica` (con guion): Postgres lo permite pero obliga a escribir el nombre entre comillas dobles en cualquier SQL manual futuro (TablePlus incluido) y rompe el estilo `snake_case` sin guiones del resto de columnas de `productos_`. Se descartó también `ficha_tecnica` (con guion bajo): es más explícito, pero el costo de renombrar 2170 filas y cuatro archivos no se justifica solo por claridad de nombre cuando `ficha` ya es inequívoco en este contexto.
- **Sí: `varchar(150)`, tal como se pidió**, no `text`. Aunque en Postgres `varchar` y `text` rinden igual y `descripcion`/`informacion` en esta misma tabla ya usan `text`, el usuario pidió explícitamente un tope de 150 caracteres — se respeta esa decisión. El riesgo (una URL de Drive/Dropbox más larga) se documenta abajo.
- **Sí: el botón se limita a `ProductCard.tsx`.** Es el único lugar pedido y el único que muestra el diseño del screenshot. Extenderlo a tarjetas de listado o relacionados exigiría tocar tipos (`RelatedProductType`) y queries (`getRelatedProducts`) que hoy no traen `ficha`, y competiría visualmente con «Agregar al carrito» en una tarjeta chica — mejor evaluarlo aparte si hace falta.
- **Sí: la carga de las 2170 URLs queda fuera de este spec**, a mano en TablePlus. Es trabajo de captura de datos, no de código, y no bloquea que el botón quede funcional y probado con casos de ejemplo.
- **Sí: normalizar `''` a `NULL`.** Es lo que ya expresa el tipo `ficha: string | null`, y evita que una cadena vacía funcione como «sin ficha» por accidente de JavaScript en vez de por diseño explícito. No cambia nada de lo que ve el usuario: una cadena vacía también es *falsy*.
- **Sí: guarda de validación con `trim()` + prefijo `http(s)://`.** Cargar 2170 URLs a mano en TablePlus es proclive a algún dedazo (espacio de más, o pegar solo el nombre del archivo); esta guarda evita que ese error se traduzca en un botón visible que lleva a una URL rota. Se descartó un `CHECK constraint` en Postgres: es más estricto, pero un `CHECK` sobre una tabla de catálogo en producción puede bloquear un import o `UPDATE` masivo futuro que no lo tenga en cuenta — la guarda en el componente ya cubre el riesgo real (mostrar un botón roto) sin ese costo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una URL real de ficha técnica (por ejemplo de Google Drive o Dropbox, con parámetros) supera los 150 caracteres. | Postgres rechaza el `INSERT`/`UPDATE` con error explícito — no trunca en silencio — así que se detecta en el momento de capturar el dato, no después en producción. |
| El `ALTER COLUMN` se corre por error con `drizzle-kit migrate`/`push` en vez de a mano. | Documentado explícitamente en el paso 1, con el mismo razonamiento ya verificado en SPEC 07 (`drizzle.__drizzle_migrations` vacía). |
| El `UPDATE` de normalización se ejecuta sobre una copia desactualizada o afecta más filas de las esperadas. | Es un `UPDATE` acotado por `WHERE trim(ficha) = ''`, idempotente, y no toca `id` ni ninguna otra columna — reversible con un segundo `UPDATE` puntual si hiciera falta. |

## Lo que **no** está en este spec

- Renombrar la columna `ficha`.
- Cargar las URLs reales de las fichas técnicas de los 2170 productos.
- Un script que descargue o derive esas URLs automáticamente.
- Edición de `ficha` desde `app/(admin)/productos/`.
- El botón en tarjetas de listado, relacionados, recomendados o vistos recientemente.
- `ficha` en JSON-LD o en `feed.xml`.

Cada uno de ellos, si se hace, va en su propio spec.
