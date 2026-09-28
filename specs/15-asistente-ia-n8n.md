# SPEC 15 — Asistente IA de búsqueda de productos con n8n y ChatGPT

> **Estado:** Implementado
> **Depende de:** SPEC 10, SPEC 14
> **Fecha:** 2026-09-28
> **Objetivo:** Integrar un chat flotante en el sitio que responde preguntas de productos consultando el catálogo real a través de una ruta de solo lectura y un agente GPT-4o-mini orquestado en n8n.

## Por qué existe este spec

El catálogo tiene 2170 productos y la navegación por categorías/buscador resulta engorrosa. SPEC 10 y SPEC 14 ya dejaron la base citable (llms.txt, JSON-LD, FAQ, NAP). Este spec agrega la capa conversacional: un agente que entiende "busco un taladro inalámbrico barato" y devuelve productos reales con precio y enlace, sin inventar datos. Si el producto exacto no existe, recomienda parecidos o variantes antes de rendirse.

## Alcance

**Dentro:**

- Workflow de n8n con trigger de chat, nodo OpenAI GPT-4o-mini y llamadas HTTP a una ruta nueva del sitio.
- Ruta nueva `app/api/agente-productos/route.ts` de solo lectura que busca en `productos_` por texto, marca y categoría y devuelve máximo 5 resultados con `id, nombre, precio, marca, categoria, imagen, url`.
- Segunda fuente de respuesta con info de tienda derivada de `src/shared/seo/negocio.ts` (envíos, devoluciones, sucursales, FAQ) sin inventar datos.
- Widget flotante global con el paquete `@n8n/chat` apuntando al webhook de n8n, montado desde el layout raíz.
- Memoria de ventana por sesión (10 mensajes por `sessionId`) y system prompt en español con regla "nunca inventar precios/stock".
- Recomendación de variantes: si la búsqueda exacta devuelve 0 resultados, el agente reintenta con una búsqueda más amplia (por categoría o marca) y presenta máximo 3 variantes con la frase obligatoria "No encontré [X] exacto, pero estas variantes te pueden servir:".
- Fallback final: solo si la búsqueda amplia también viene vacía, decirlo y enlazar a `/contacto` o WhatsApp.
- `npm run build` y `npm run lint` en verde.

**Fuera de alcance (para specs futuros):**

- Agregar productos al carrito o generar pedidos desde el chat.
- Memoria persistente entre visitas en Postgres de n8n.
- Página dedicada `/asistente` a pantalla completa.
- Consolidar los 5 teléfonos en uno oficial (pendiente desde SPEC 14).
- Sucursal CDMX en el marcado o en las respuestas del agente.
- Entrenamiento/fine-tuning propio o embeddings vectoriales del catálogo.

## Modelo de datos

No se toca la base de datos. Se agrega una ruta y un componente; el workflow de n8n vive fuera del repo y se versiona como JSON exportado.

```ts
// GET /api/agente-productos?q=taladro&marca=truper&categoria=herramientas&limit=5
type AgenteProducto = {
  id: string;
  nombre: string;
  precio: number | null;
  marca: string | null;
  categoria: string | null;
  imagen: string | null;
  url: string; // /producto/{id} canónico
};
type AgenteResponse = { query: string; total: number; items: AgenteProducto[] };
```

```ts
// Componente cliente (nombre propuesto)
src/shared/components/ChatAsistente.tsx
// Lee process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL y monta @n8n/chat
```

Convenciones:

- La ruta es `GET` pública de solo lectura, sin autenticación, con `limit` acotado a 1–5.
- El workflow exportado se guarda en `n8n/workflow-agente-ferredip.json` como referencia versionada.
- La clave de OpenAI vive como credencial dentro de n8n, nunca en el repo ni en `NEXT_PUBLIC_*`.

## Plan de implementación

1. **Crear `app/api/agente-productos/route.ts`.** Busca en `productos_` con `ilike` sobre nombre/marca/categoría, ordena por relevancia simple, limita a 5. Sin `ficha` ni campos internos.
   *Verificación:* `curl '/api/agente-productos?q=taladro&limit=5'` devuelve JSON con `items` de máximo 5 y cada uno con `url` válida.
2. **Exportar y documentar el workflow n8n.** Nodos: Chat Trigger → Agente OpenAI (GPT-4o-mini) → tool HTTP `buscar_productos` (la ruta del paso 1) → tool estática `info_tienda` (texto derivado de `negocio.ts`/`FAQ`) → memoria Window Buffer (10 mensajes). Guardar el JSON en `n8n/workflow-agente-ferredip.json`.
   *Verificación:* el JSON importado en n8n muestra los 4 nodos conectados y la credencial OpenAI en verde.
3. **System prompt en español con reintento de variantes.** Reglas: responder en español, máximo 5 productos con nombre/precio/enlace, nunca inventar precio/stock. Si la primera búsqueda devuelve 0 resultados, hacer una segunda búsqueda más amplia (por categoría o marca, sin el modelo específico) y responder con la frase "No encontré [X] exacto, pero estas variantes te pueden servir:" seguida de máximo 3 productos. Solo si la segunda búsqueda también viene vacía, usar el fallback a `/contacto`/WhatsApp. Nunca presentar una variante como si fuera el producto exacto.
   *Verificación:* preguntar por un modelo inexistente devuelve la frase obligatoria con variantes reales; preguntar por algo sin ninguna relación devuelve el fallback a contacto.
4. **Crear `ChatAsistente.tsx` con `@n8n/chat`.** Componente cliente `"use client"` que lee `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` y pinta la burbuja flotante con título "Asistente Ferredip".
   *Verificación:* el componente renderiza sin errores en dev y apunta al webhook configurado.
5. **Montar el widget en el layout raíz y configurar env.** Importar el componente en `app/layout.tsx` y agregar `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` a `.env.example` y al entorno de producción.
   *Verificación:* la burbuja aparece en home, `/productos` y una ficha de producto; no aparece doble.
6. **Prueba end-to-end y build.** Preguntar "busco taladro inalámbrico" en el widget y comprobar productos reales; preguntar por un modelo inexistente y comprobar variantes; correr `npm run build` y `npm run lint`.
   *Verificación:* ambos terminan sin errores y las respuestas contienen enlaces `/producto/{id}` que resuelven 200.

## Criterios de aceptación

- [ ] `GET /api/agente-productos?q=taladro` devuelve máximo 5 items con `id, nombre, precio, url`.
- [ ] La ruta no permite escritura: solo responde a `GET`, sin parámetros que muten datos.
- [ ] El workflow n8n usa GPT-4o-mini y dos tools: `buscar_productos` e `info_tienda`.
- [ ] La burbuja de chat es visible en home, `/productos` y una ficha de producto.
- [ ] Preguntar "taladro inalámbrico barato" devuelve productos reales del catálogo con precio y enlace.
- [ ] Preguntar por envíos/devoluciones/horario responde con datos de `negocio.ts`, sin inventar.
- [ ] Buscar un modelo inexistente (ej. "taladro modelo ZX-9999") responde "No encontré… exacto, pero estas variantes te pueden servir:" con 1–3 productos de la misma categoría/marca, cada uno con precio real y enlace `/producto/{id}` que resuelve 200.
- [ ] Ninguna variante se presenta como el producto exacto (el texto distingue "variante/similar" del pedido original).
- [ ] Solo cuando la búsqueda amplia también devuelve 0, responde con enlace a `/contacto`/WhatsApp y sin precios inventados.
- [ ] Ninguna clave de OpenAI aparece en el repo ni en variables `NEXT_PUBLIC_*`.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones

- **Sí: widget `@n8n/chat` global en Next.js.** El usuario lo eligió; da la mejor UX frente al chat hosted aislado de n8n.
- **Sí: n8n consulta la API nueva, no Postgres directo.** El usuario lo eligió; evita exponer `DATABASE_URL` en n8n y reutiliza la lógica de búsqueda del sitio.
- **Sí: GPT-4o-mini con credencial en n8n.** El usuario lo eligió; costo bajo para búsquedas de catálogo, suficiente calidad con el system prompt acotado. Se descartó GPT-4o por costo ~10x.
- **Sí: buscar + info de tienda, sin carrito.** El usuario lo eligió; tocar carrito/pedidos desde el chat es un riesgo de integridad que merece su propio spec.
- **Sí: ruta nueva `/api/agente-productos` en vez de reutilizar queries sin ruta.** Necesaria para que n8n tenga un contrato HTTP estable, acotado y cacheable.
- **Sí: dos tools (productos + negocio).** Separa el catálogo vivo de la info estática de SPEC 10/14 y evita mezclar fuentes en una sola respuesta.
- **Sí: memoria de ventana de 10 por sesión.** Permite repreguntas ("y en marca Truper?") sin el costo de un historial persistente.
- **Sí: recomendar variante antes del fallback a contacto.** El usuario lo pidió en esta sesión; reduce callejones sin salida en un catálogo de 2170 productos. Se descarta presentar la variante como exacta: el texto debe marcarla como similar para no engañar al comprador.
- **Sí: fallback final honesto + contacto.** Coherente con SPEC 10 (no inventar `aggregateRating`): el agente nunca inventa precio/stock.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La ruta pública de búsqueda es scrapeable o abusada por bots. | `limit` acotado a 5, solo `GET`, sin datos internos; rate-limit o bloqueo por IP se evalúa en otro spec si aparece abuso. |
| El agente alucina un precio o un producto que no existe. | System prompt con prohibición explícita + tool que solo devuelve filas reales; aceptación lo verifica con producto inexistente. |
| La variante sugerida no guarda relación real con lo pedido. | El reintento usa categoría/marca de la primera query, no productos aleatorios; la aceptación lo verifica con un modelo inexistente de categoría conocida. |
| Caída o latencia de n8n/OpenAI deja el chat muerto. | El widget falla cerrado: muestra mensaje de error con enlace a `/contacto`; el sitio sigue funcional sin el chat. |
| Costo OpenAI por mensajes largos o bucles. | Tope de 5 productos por respuesta y ventana de 10 mensajes; sin historial persistente. |

## Lo que **no** está en este spec

- Agregar al carrito o crear pedidos desde el chat.
- Historial persistente entre visitas.
- Página `/asistente` dedicada.
- Embeddings vectoriales o fine-tuning del catálogo.
- Consolidación de teléfonos o datos de sucursal CDMX.
- Rate-limit avanzado o autenticación de la ruta del agente.

Cada uno de ellos, si se hace, va en su propio spec.
