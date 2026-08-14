# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project overview

Ferredip is an e-commerce storefront for tools/hardware (multiple brands and categories), built with Next.js (App Router) + React + TypeScript. It uses PostgreSQL (hosted on Railway) via Drizzle ORM, Mercado Pago for checkout, Zustand for client state, and Resend/Nodemailer for transactional email. Deployed on Railway.

## Commands

- `npm run dev` — start the dev server (Turbopack). `npm run dev:webpack` is the same command using the classic webpack dev server.
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript).
- `npm run db:studio` — open Drizzle Studio against `DATABASE_URL`.
- `npm run import:csv` — runs `scripts/import-csv.ts` to bulk-insert `productos.csv` into the `productos_` table. The script's own header comment says it currently doesn't work reliably; importing via TablePlus (or another Postgres client) directly is the recommended path instead.
- There is no `test` script and no Jest/Playwright config file, even though `jest`, `@testing-library/*`, and `@playwright/test` are installed as devDependencies — a test runner is not wired up yet.

Drizzle migrations live in `drizzle/` (SQL files + `meta/`), generated from the schema in `src/shared/db/schema` per `drizzle.config.ts`. Use `drizzle-kit` (via `npx drizzle-kit generate` / `push`) when changing the schema — there's no npm script for it currently.

## Environment

Configuration is read from `.env` (see `drizzle.config.ts` and `src/shared/db/index.ts`). Expected variables: `DATABASE_URL`, `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `RESEND_API_KEY`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_APP_PASSWORD`.

## Architecture

### Path alias

`tsconfig.json` maps `@/*` to the **repo root**, not `src/`. Imports look like `@/src/shared/db`, `@/src/store/cartStore`, etc. — don't assume the common `@/` = `src/` convention from other Next.js projects.

### Route groups (`app/`)

- `app/(public)` — the storefront: home, `producto/[id]/[slug]`, `categoria/[slug]`, `marca/[slug]`, `marcas`, `productos` (category overview grid), `resultados/[slug]` (search results), `carrito-de-compra`, `compra` (checkout + `pago-exitoso`/`pago-fallido`/`pago-pendiente` result pages), plus static pages (`contacto`, `soy-mayorista`, `terminos-y-condiciones`, `aviso-de-privacidad`).
- `app/(admin)` — admin panel (currently only `productos/relacionados`, for managing related-product associations). There is no `middleware.ts` and no auth check found in the admin layout/routes — treat admin pages/APIs as currently unprotected rather than assuming they're gated.
- `app/api` — route handlers: `admin/productos` (list/manage products, including `[id]/relacionados`), `mercadopago/preference` and `mercadopago/process-payment` (checkout flow), `search`, `send-email`.
- `app/sitemap.ts`, `app/feed.xml/route.ts`, `app/products.xml/route.ts` — generated SEO/feed endpoints.

### Data layer (`src/shared/db`)

- `index.ts` — single `pg.Pool` + `drizzle()` instance shared app-wide (SSL only in production).
- `schema/productList.ts` — the whole catalog lives in one table, `productos_` (Drizzle table `productos`). There's no separate brands/categories table: `marca` and `categoria` are free-text varchar columns, and product variants are encoded by splitting `descripcion` on `|` (see `getProductsByGroupsofTrademarks`/`getProductsByGroupsofCategories` in `queries.ts`). Sort order is driven by the `orden_prod`/`orden_cat` integer columns, not by insertion order or price.
- `queries.ts` — all product read queries, plus `slugToMarca`/`slugToCategory` helpers that map URL slugs to display names via a hardcoded lookup table (extend these maps when adding a new brand/category slug). Catalog queries hide products whose `precio` is empty or `0` via the shared `precioMayorACero` filter (`gt(sql\`${productos.precio}::numeric\`, 0)`, combined with `and(...)`; the `::numeric` cast is required because `precio` is a `varchar`). It's applied in `getProductsByGroupsofTrademarks`, `getProductsByGroupsofCategories`, `getRecomendedProducts`, `getAllProductosXML`, `getRelatedProducts`, and separately (inlined, not imported) in `app/api/search/route.ts`'s `GET` handler — add it to any new catalog query too. `getProductById` deliberately skips it, since a product page resolves by direct URL regardless of price.
- `marcas.ts`, `resultados.ts`, `contact-info.ts` are **not** query modules despite living alongside `queries.ts`: `marcas.ts` is a static array of brand logos (`/marcas/*.webp`, with commented-out entries awaiting artwork, same pattern as `db/productos.ts`), `resultados.ts` only holds shared TypeScript types (`ResultadosType`, `RelatedProductType`, `VariantOptionType`), and `contact-info.ts` exports the `whatsAppNumber` constant (see Misc below).
- `productos.ts` — not a DB query module despite living in `db/`: it's a static array mapping category slugs to their `/productos/*.webp` image, used by the home page and `app/(public)/productos` to render the category grid. Commented-out entries are categories awaiting artwork — uncomment once the image exists in `public/productos/`.

### State & actions

- `src/store` — Zustand stores: `cartStore.ts` (cart contents, persisted to `localStorage` under key `ferredip-cart`, computes subtotal/shipping/total — free shipping threshold is $5000) and `deliveryStore.ts`.
- `src/actions` — server actions. `contact.ts` (`sendContactEmail`, backed by `app/api/send-email`) still exists, but the `/contacto` form (`ContactoCliente.tsx`) no longer calls it — its submit handler now opens WhatsApp with a pre-filled message instead, leaving the `sendContactEmail` import unused.
- `src/utils` — `formatPrice.ts`, `slugify.ts` (URL slug generation for products/brands/categories), `gtm.ts` (Google Tag Manager event pushes), `orderSnapshot.ts`.
- `src/hooks` — `useDeleteToast.tsx`.

### Components (`src/shared/components`)

Flat-ish by domain rather than by route: top-level components are storefront sections (product cards/lists, brand/category results, sliders), with subfolders for `cart/` (checkout UI incl. `MercadoPagoBrick`/`MercadoPagoButton`), `dashboard/` (admin related-products dashboard, with its own `types/producto.ts`), `header/`, `footer/`, and `analytics/` (`ViewItemListTracker.tsx`, fires GTM view-item-list events).

### Misc

- `src/respaldo/` contains historical CSV data dumps/backups, not application code — don't treat it as a source of truth for the current schema.
- `productos.csv` at the repo root is the bulk-import source file for `scripts/import-csv.ts`.
- This repo was repurposed from an earlier storefront (Dipemsa, a construction-materials retailer) into Ferredip (a general hardware retailer); the git history was reset to a single initial commit once the rebrand landed.
- WhatsApp contact number: `contact-info.ts`'s `whatsAppNumber` (`"525573476687"`, i.e. +52 55 7347 6687, country code included) is the single source of truth — `Header.tsx`'s "COTIZA POR WHATSAPP" button, `ResumenCompra.tsx`'s cart order handoff, `ProductCard.tsx`, `GroupCard.tsx`, `RecommendedProducts.tsx`, `SoyMayorista.tsx`, and `ContactoCliente.tsx` all import it rather than hardcoding the number — do the same for any new WhatsApp link. `app/(public)/terminos-y-condiciones/page.tsx` is the one deliberate exception, still showing Dipemsa-era contact info (old landlines and WhatsApp number) left as-is.
- In `Footer.tsx` and `ContactoCliente.tsx`, the old landline phone numbers and the row of social-media links are commented out, pending Ferredip's own accounts (the commented URLs still point at Dipemsa's).
- **Precios con decimales (2026-08-14, en español):** la columna `precio` (`varchar`) llegó a tener 137 filas con coma decimal (p. ej. `"12,5"`), lo cual rompía el cast `::numeric` usado por `precioMayorACero` (`queries.ts`) y `app/api/search/route.ts`, tumbando cualquier página de marca/categoría que incluyera uno de esos productos. Se corrigieron esas filas directamente en la base de datos (Railway), reemplazando la coma por punto. Como consecuencia, `precio` ya no está garantizado a ser un entero — puede traer decimales (p. ej. `"12.5"`).
- `GroupCard.tsx` mostraba el precio concatenando el string literal `.00` (`` `${selectedVariant.precio}.00` ``), lo que asumía que `precio` siempre era un entero. Con precios decimales esto producía resultados incorrectos (p. ej. `$12.5.00`). Se corrigió para usar `totalxcantidad(selectedVariant.precio, 1)` de `src/utils/formatPrice.ts` — la misma función que ya usaban `ProductCard.tsx`, `ResumenCompra.tsx` y `ProductComponent.tsx` — que hace `parseFloat` + `toFixed(2)` y sí maneja decimales correctamente. Cualquier lugar nuevo que muestre `precio` debe formatear con `totalxcantidad` (o `parsePrecio` de `formatPrice.ts`) en vez de concatenar strings o asumir que es un entero.
