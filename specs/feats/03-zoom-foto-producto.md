# SPEC 03 — Zoom con lupa en la foto del producto

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-17
> **Objetivo:** Al pasar el cursor sobre la foto de la página de producto, mostrar una lente semitransparente sobre ella y un panel contiguo con esa zona ampliada a píxel real desde `/fotos/{id}.jpg`.

## Por qué existe este spec

La página de producto (`src/shared/components/ProductCard.tsx:170`) muestra la foto a 366 px de ancho
desde `/fotos/webp/{id}.webp`. Para herramienta y ferretería ese tamaño no alcanza: el cliente no
distingue el tipo de cuerda, el acabado del mango ni lo que dice la etiqueta, y esa duda se traduce
en una llamada o en un carrito abandonado. La foto grande ya está en hosting propio como
`/fotos/{id}.jpg` (SPEC 01), pero hoy no la consume nadie.

## Alcance

**Dentro:**

- Componente nuevo `src/shared/components/ProductImageZoom.tsx` (cliente).
- `src/shared/components/ProductCard.tsx`: sustituir el bloque `<Image>` por ese componente,
  conservando el estado `imgSrc` / `handleImageError` que ya vive en la tarjeta.
- Escritorio (`lg` en adelante, puntero fino): lente semitransparente que sigue al cursor sobre la
  foto + panel de 366×366 px a su derecha con el recorte ampliado.
- Factor de ampliación derivado del `naturalWidth` real de la `.jpg`, no fijo.
- Táctil: al tocar la foto se abre un lightbox con la `.jpg` grande ajustada a la pantalla, usando
  `@radix-ui/react-dialog` (ya instalado).
- Degradación silenciosa: si `/fotos/{id}.jpg` da 404, o no es más grande que lo que ya se ve, no
  aparece lente, ni panel, ni cursor de zoom, ni se abre lightbox.

**Fuera de alcance (para specs futuros):**

- Reemplazar las 2171 `.jpg` de 366×366 por versiones grandes — lo hace el usuario a mano, igual que
  la conversión a WebP del SPEC 01.
- Zoom en tarjetas de listado (`GroupCard.tsx`, `RelatedProducts.tsx`, `RecommendedProducts.tsx`,
  `RecentViewProducts.tsx`) y en el panel de administración (`dashboard/`).
- Galería de varias fotos por producto (hoy hay exactamente una por `id`).
- Pan y pinch dentro del lightbox.
- Lightbox en escritorio al hacer clic (en escritorio manda el hover).
- Unificar el helper `fotoDe()` + `LOGO_SRC` + `onError` duplicado en 4 componentes — sigue pendiente
  del SPEC 01.
- Mover las imágenes a un CDN, generar múltiples tamaños o `remotePatterns` en `next.config.ts`.
- Cambios de esquema en `productos_` (una columna `foto` o dimensiones).

## Modelo de datos

Este spec **no introduce estructuras en la base de datos**. Usa la convención de nombre de archivo ya
existente:

```
public/fotos/
  {id}.jpg        <- foto grande, la que amplía este spec  (usuario la reemplaza)
  webp/{id}.webp  <- 366x366, la que ya se muestra hoy     (sin cambios)
```

Estado local del componente nuevo:

```ts
type ZoomSource = {
  src: string;           // `/fotos/${id}.jpg`
  naturalWidth: number;  // leído del archivo real, no asumido
  naturalHeight: number;
};

// null = todavía no se intentó cargar, o falló, o no amplía lo suficiente -> sin zoom
const [zoom, setZoom] = useState<ZoomSource | null>(null);
```

Constantes y geometría:

- `PANEL_PX = 366` — lado del panel ampliado, igual al ancho al que se muestra la foto.
- `rect = imagenRef.current.getBoundingClientRect()` — el tamaño mostrado se **mide**, no se asume,
  para que la matemática siga siendo correcta si el layout encoge la foto.
- `factor = zoom.naturalWidth / rect.width`.
- `lente = PANEL_PX / factor` px de lado, y su esquina superior izquierda se limita a
  `[0, rect.width − lente]` × `[0, rect.height − lente]` para que nunca se salga de la foto.
- `backgroundSize = zoom.naturalWidth × zoom.naturalHeight` px y
  `backgroundPosition = −(lenteX × factor) −(lenteY × factor)` px. Con esa combinación el panel
  muestra píxel real, sin interpolar.
- Umbral de activación: `zoom.naturalWidth >= rect.width * 1.2`. Por debajo de eso ampliar solo
  emborrona, así que el zoom queda desactivado.

## Plan de implementación

1. **Componente vacío que solo dibuja la foto.** Crear `src/shared/components/ProductImageZoom.tsx`
   (`'use client'`) con props `{ id: string; src: string; alt: string; onError: () => void }`, que
   renderiza el mismo `<Image>` que hoy tiene `ProductCard.tsx:170-181` (mismos `width`, `height`,
   `className`, `priority`, `sizes`, `quality`) dentro de un contenedor `relative inline-block` con
   `ref`. En `ProductCard.tsx`, sustituir ese bloque por
   `<ProductImageZoom key={producto.id} id={producto.id ?? ''} src={imgSrc} alt={...} onError={handleImageError} />`.
   *Verificación:* la página de producto se ve idéntica a antes, incluido el fallback al logo cuando
   falta el `.webp`.

2. **Precarga y detección de la foto grande.** En el componente, un `useEffect` que al primer
   `pointerenter` (o al primer toque) crea un `new window.Image()` con `/fotos/${id}.jpg`; en `load`
   guarda `{ src, naturalWidth, naturalHeight }` si supera el umbral de 1.2×, y en `error` deja
   `zoom` en `null`. Cancelar los handlers al desmontar. Aplicar `cursor-zoom-in` solo cuando `zoom`
   no es `null`.
   *Verificación:* con un `id` que tiene `.jpg` grande el cursor cambia al pasar por encima; con uno
   que no la tiene, el cursor sigue normal y la pestaña Red muestra un solo 404, no un bucle.

3. **Lente semitransparente.** `onMouseMove` sobre el contenedor calcula la posición del cursor
   relativa al `rect`, la limita al recuadro y pinta un `div` absoluto de `lente × lente` px, con
   fondo blanco al 30 %, borde de 1 px y `pointer-events-none`. Se muestra en `mouseenter` y se oculta
   en `mouseleave`.
   *Verificación:* la lente sigue al cursor sin salirse de la foto ni parpadear en los bordes.

4. **Panel ampliado.** `div` absoluto de 366×366 px a la derecha de la foto, `hidden lg:block`,
   `z-20`, borde gris y fondo blanco, con `backgroundImage` apuntando a la `.jpg` y
   `backgroundSize` / `backgroundPosition` según la fórmula del modelo de datos. Visible solo mientras
   el cursor está sobre la foto. Se quita `overflow-hidden` del wrapper `div` de la foto en
   `ProductCard.tsx` para que el panel no quede recortado (ver «Decisiones» sobre el conflicto de
   ancho con la columna de info).
   *Verificación:* mover la lente a una esquina muestra esa misma esquina en el panel; en pantallas
   donde no cabe junto a la foto, el panel se superpone a la columna de info mientras dura el hover y
   desaparece al quitar el cursor.

5. **Lightbox táctil.** Detectar puntero grueso con `window.matchMedia('(pointer: coarse)')` dentro
   de un `useEffect` (estado inicial `false` para no romper la hidratación). Si es grueso, se
   desactivan lente y panel y el `onClick` abre un `Dialog` de `@radix-ui/react-dialog` con la `.jpg`
   a `max-h-[85vh] w-auto object-contain`, botón de cerrar, título en `VisuallyHidden`, cierre con
   Esc y con clic en el overlay.
   *Verificación:* en el emulador móvil de Chrome, tocar la foto abre el modal y el hover ya no
   dispara nada; en escritorio el modal nunca aparece.

6. **Limpieza de bordes.** Ocultar lente y panel también en `blur`/`pointercancel`, y no montar nada
   de zoom cuando `src` es `/logo.webp` (producto sin foto).
   *Verificación:* `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] En escritorio, pasar el cursor sobre la foto de un producto con `.jpg` grande muestra la lente
      sobre la foto y el panel de 366×366 px a su derecha.
- [ ] Mover el cursor a la esquina inferior derecha de la foto muestra esa esquina en el panel.
- [ ] La lente nunca se sale del recuadro de la foto.
- [ ] El panel se muestra completo (366×366) junto a la foto; en anchos de columna donde no cabe sin
      tocar la información del producto, se superpone temporalmente a esa columna mientras dura el
      hover y desaparece por completo al quitar el cursor.
- [ ] Salir de la foto con el cursor oculta lente y panel de inmediato.
- [ ] Con una `.jpg` de 1200 px el contenido del panel se ve a píxel real (no interpolado).
- [ ] Un producto **sin** `/fotos/{id}.jpg` no muestra lente, ni panel, ni `cursor-zoom-in`, y la foto
      normal se sigue viendo como hoy.
- [ ] Un producto cuya `.jpg` mide 366×366 (las actuales) tampoco activa el zoom.
- [ ] En pantalla táctil, tocar la foto abre el lightbox; Esc, el botón de cerrar y el clic fuera lo
      cierran.
- [ ] En escritorio, hacer clic en la foto **no** abre el lightbox.
- [ ] Cambiar de variante en el selector recarga la foto y su zoom apunta al `id` nuevo, sin quedarse
      con la imagen anterior.
- [ ] La `.jpg` grande no se descarga hasta el primer hover o toque sobre la foto (pestaña Red).
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** componente aparte `ProductImageZoom.tsx`. `ProductCard.tsx` ya tiene 314 líneas y mezcla
  carrito, GTM, variantes y breadcrumb; el zoom es autocontenido y así se puede reutilizar en las
  tarjetas de listado en otro spec.
- **Sí:** `key={producto.id}` en el componente. La navegación entre variantes reutiliza la misma
  instancia de `ProductCard` sin remontar (ver comentario en `ProductCard.tsx:32-40`); la `key` fuerza
  el remonte y limpia el estado del zoom sin repetir el patrón de reset en render.
- **Sí:** dejar `imgSrc` y `handleImageError` en `ProductCard`. Mover ese estado obligaría a duplicar
  la lógica de `renderedId` que ya está documentada ahí.
- **Sí:** factor derivado de `naturalWidth`. El usuario todavía no ha subido las fotos grandes y no
  hay garantía de que todas midan lo mismo; leer el archivo real hace que 800, 1200 o 1500 px
  funcionen sin tocar código.
- **Sí:** umbral de 1.2×. Hoy `public/fotos/*.jpg` mide 366×366, igual que lo mostrado; sin umbral el
  zoom se activaría para no ampliar nada. Además cubre el periodo en que convivan fotos reemplazadas
  y sin reemplazar.
- **Sí:** `backgroundImage` con la URL cruda `/fotos/{id}.jpg`. Pasar por `next/image` reescalaría y
  recomprimiría justo lo que queremos ver a píxel real; el `Cache-Control` de `/fotos/:path*` en
  `next.config.ts` ya cachea esa ruta 24 h.
- **Sí:** precargar en el primer hover o toque, no al montar. Evita bajar cientos de KB en cada visita
  a una página de producto para una función que muchos usuarios no usan; el coste es un retardo de una
  sola vez, sobre archivo del mismo origen.
- **Sí:** medir con `getBoundingClientRect()` en vez de asumir 366 px. La foto usa `h-auto` y
  `sizes="(max-width: 768px) 100vw, ..."`, así que su tamaño real depende del viewport.
- **Sí:** panel de 366×366, incluso si eso implica superponerse a la columna de info. Se verificó
  durante la implementación que la columna de la foto (`grid lg:grid-cols-2 gap-10 lg:gap-16` dentro
  de `max-w-7xl`) mide entre ~456 px y ~584 px, y foto (366) + separación (16) + panel (366) = 748 px
  nunca cabe ahí — el diseño original de este spec asumía que sí cabía, sin haber hecho la cuenta. Ante
  el conflicto entre "panel de 366×366 exactos" y "no tapa el precio ni el botón", el usuario priorizó
  el tamaño del panel: se acepta que, en ese rango de anchos, el panel se dibuje encima de la columna de
  info mientras dura el hover. Se quita `overflow-hidden` del wrapper de la foto en `ProductCard.tsx`
  para que esto sea visible en vez de quedar recortado.
- **No:** lightbox también con clic en escritorio. Dos caminos a la misma foto confunden y el hover ya
  resuelve el caso; queda anotado como fuera de alcance.
- **No:** pan y pinch dentro del lightbox. Los navegadores móviles ya permiten pellizcar la imagen del
  modal; escribir gestos propios agrega casos borde por poca ganancia.
- **No:** librería de zoom (`react-image-magnify`, `react-inner-image-zoom`). Son ~15 KB y varias sin
  mantenimiento reciente para algo que son unas 80 líneas de `getBoundingClientRect` y
  `backgroundPosition`.
- **Sí:** `@radix-ui/react-dialog` para el lightbox. Ya es dependencia directa (lo usa `cmdk` en
  `SearchBar.tsx`) y trae foco atrapado, Esc y accesibilidad resueltos.
- **No:** aplicar el zoom a las tarjetas de listado. En un grid el panel no tiene dónde caber y el
  hover ya se usa para otras interacciones.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Las `.jpg` grandes todavía no existen: hoy todas miden 366×366 | El umbral de 1.2× hace que la función quede simplemente inactiva hasta que el usuario suba las fotos. Ningún producto se rompe mientras tanto. |
| Peso del repo al reemplazar 2171 `.jpg` por versiones de 1200 px | Anotado, no resuelto aquí: la salida es mover a CDN, ya listado como pendiente desde el SPEC 01. |
| `matchMedia` no existe en el render del servidor | Se lee dentro de un `useEffect` con estado inicial `false`; el primer render del cliente coincide con el del servidor y no hay error de hidratación. |
| Portátiles táctiles reportan puntero grueso y pierden el zoom de hover | Comportamiento aceptado: en esos equipos abre el lightbox, que muestra la misma foto grande. |
| `mousemove` a 60 Hz recalculando estilos | Solo se escriben estilos inline en dos `div` ya montados; sin `setState` por píxel si se escribe con `ref.current.style`. Si aparece jank, `requestAnimationFrame`. |
| La foto grande tarda en el primer hover | Es del mismo origen, con caché de 24 h ya configurada; la lente aparece cuando la imagen resuelve, sin estado intermedio roto. |
| El panel (366×366) tapa temporalmente el precio/cantidad/botón en columnas angostas | Aceptado por decisión explícita del usuario ante el conflicto de ancho documentado en «Decisiones». Es transitorio: solo mientras el cursor está sobre la foto, y desaparece de inmediato al salir. |

## Lo que **no** está en este spec

- Reemplazar las `.jpg` de `public/fotos/` por versiones grandes.
- Zoom en tarjetas de listado o en el panel de administración.
- Galería de varias fotos por producto.
- Pan, pinch o lightbox en escritorio.
- Unificar el helper `fotoDe()` duplicado en 4 componentes.
- Mover las imágenes a un CDN.

Cada uno, si se hace, va en su propio spec.
