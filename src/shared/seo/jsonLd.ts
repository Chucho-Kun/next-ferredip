/**
 * Constructores de los bloques JSON-LD del sitio (SEO / AIO).
 *
 * Ninguna página vuelve a escribir un literal de schema.org a mano: importan una
 * de estas funciones y la serializan con `JSON.stringify` dentro de su
 * `<script type="application/ld+json">`.
 *
 * Todos los datos del negocio salen de `./negocio.ts` (fuente única).
 */

import type { ResultadosType } from '@/src/shared/db/resultados';
import { slugify } from '@/src/utils/slugify';
import {
  fotoPrincipal,
  fotoPrincipalZoom,
  fotosAdicionalesDe,
} from '@/src/utils/fotos';
import { NEGOCIO, SUCURSALES, HORARIO, ENVIO, DEVOLUCION } from './negocio';

const SCHEMA = 'https://schema.org';

const ORG_ID = `${NEGOCIO.url}/#organization`;
const WEBSITE_ID = `${NEGOCIO.url}/#website`;

const DIAS_SEMANA = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────────────────────

/** Convierte el `precio` (varchar, puede traer `$` o comas) a número. */
function precioNumero(precio: string | null | undefined): number {
  return parseFloat(precio?.replace(/[$,]/g, '') || '0');
}

/** Fecha de hoy + 365 días en formato YYYY-MM-DD. Se recalcula en cada render. */
function fechaValidezPrecio(): string {
  const d = new Date();
  d.setDate(d.getDate() + 365);
  return d.toISOString().split('T')[0];
}

/** Primer segmento de `descripcion` (antes del `|`), sin comillas. */
function tituloDe(descripcion: string | null | undefined): string {
  return (
    (descripcion ?? '').split('|')[0].replace(/"/g, '').trim() || NEGOCIO.nombre
  );
}

/**
 * Envío común a `productoJsonLd` y a `feed.xml`: refleja `ENVIO` y lo que dice
 * `/terminos-y-condiciones` (gratis sobre $5,000 MXN en CDMX y Área
 * Metropolitana), no el `300 MXN` de ejemplo del marcado viejo.
 */
export function envioJsonLd(): object {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: 0,
      currency: 'MXN',
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: ENVIO.pais,
      addressRegion: ['Ciudad de México', 'Estado de México'],
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: ENVIO.handlingDias.min,
        maxValue: ENVIO.handlingDias.max,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: ENVIO.transitoDias.min,
        maxValue: ENVIO.transitoDias.max,
        unitCode: 'DAY',
      },
    },
  };
}

/**
 * Política de devolución: refleja `/terminos-y-condiciones` (de 1 a 3 días
 * naturales, se reporta con el chofer o en tienda, nota de crédito — no
 * efectivo), no el `30 días / FreeReturn` de ejemplo del marcado viejo.
 */
export function devolucionJsonLd(): object {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: [ENVIO.pais],
    returnPolicyCategory: `${SCHEMA}/MerchantReturnFiniteReturnWindow`,
    merchantReturnDays: DEVOLUCION.diasCambio,
    returnMethod: [`${SCHEMA}/${DEVOLUCION.metodo}`],
    returnFees: `${SCHEMA}/FreeReturn`,
    refundType: `${SCHEMA}/${DEVOLUCION.reembolso}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructores públicos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `@graph` del home: `Organization` + `WebSite` (con `SearchAction`) + las dos
 * sucursales como `HardwareStore`. `WebSite` referencia al `Organization` por
 * `@id` en vez de repetirlo.
 */
export function organizacionJsonLd(): object {
  const organization = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: NEGOCIO.nombre,
    description: NEGOCIO.descripcion,
    url: NEGOCIO.url,
    logo: NEGOCIO.logo,
    image: NEGOCIO.imagen,
    telephone: NEGOCIO.telefono,
    email: NEGOCIO.email,
    sameAs: [...NEGOCIO.sameAs],
  };

  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: NEGOCIO.url,
    name: NEGOCIO.nombre,
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${NEGOCIO.url}/resultados/{search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const tiendas = SUCURSALES.map((sucursal) => ({
    '@type': 'HardwareStore',
    '@id': `${NEGOCIO.url}/#store-${slugify(sucursal.nombre)}`,
    name: sucursal.nombre,
    parentOrganization: { '@id': ORG_ID },
    url: NEGOCIO.url,
    image: NEGOCIO.imagen,
    telephone: sucursal.telefono,
    email: NEGOCIO.email,
    priceRange: NEGOCIO.rangoPrecio,
    paymentAccepted: [...NEGOCIO.pagos],
    address: {
      '@type': 'PostalAddress',
      streetAddress: sucursal.calle,
      addressLocality: sucursal.localidad,
      addressRegion: sucursal.region,
      postalCode: sucursal.cp,
      addressCountry: 'MX',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: sucursal.geo.lat,
      longitude: sucursal.geo.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DIAS_SEMANA,
        opens: HORARIO.abre,
        closes: HORARIO.cierra,
      },
    ],
  }));

  return {
    '@context': SCHEMA,
    '@graph': [organization, website, ...tiendas],
  };
}

/**
 * `Product` completo. Sin `aggregateRating` ni `review`: no hay ni una reseña
 * real en el sitio. Todo lo demás sale de columnas que ya existen en
 * `productos_` o se deriva de ellas (ver «Reglas derivadas» del spec).
 */
export function productoJsonLd(producto: ResultadosType): object {
  const id = producto.id ?? '';
  const nombre = tituloDe(producto.descripcion);
  const precio = precioNumero(producto.precio);
  const url = `${NEGOCIO.url}/producto/${id}/${slugify(producto.descripcion ?? '')}`;

  const imagenes = [
    fotoPrincipalZoom(id),
    ...fotosAdicionalesDe(id).map((foto) => foto.zoom),
  ];

  return {
    '@context': SCHEMA,
    '@type': 'Product',
    name: nombre,
    description: producto.informacion || producto.descripcion || nombre,
    image: imagenes,
    sku: producto.clave ?? '',
    mpn: producto.clave ?? '',
    productID: id,
    category: producto.categoria ?? undefined,
    url,
    itemCondition: `${SCHEMA}/NewCondition`,
    brand: {
      '@type': 'Brand',
      name: producto.marca || NEGOCIO.nombre,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'MXN',
      price: precio,
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: precio,
        priceCurrency: 'MXN',
        valueAddedTaxIncluded: true,
      },
      priceValidUntil: fechaValidezPrecio(),
      availability: precio > 0 ? `${SCHEMA}/InStock` : `${SCHEMA}/OutOfStock`,
      itemCondition: `${SCHEMA}/NewCondition`,
      seller: {
        '@type': 'Organization',
        name: NEGOCIO.nombre,
        url: NEGOCIO.url,
      },
      shippingDetails: envioJsonLd(),
      hasMerchantReturnPolicy: devolucionJsonLd(),
    },
  };
}

/**
 * `CollectionPage` + `ItemList` para `/categoria/[slug]` y `/marca/[slug]`.
 * `productos` ya viene recortado a 30 por la página. El `ItemList` parcial no
 * declara `numberOfItems`, así que no afirma un total falso.
 */
export function listadoJsonLd(args: {
  tipo: 'categoria' | 'marca';
  slug: string;
  nombre: string;
  productos: { id: string; nombre: string; precio: string }[];
}): object {
  return {
    '@context': SCHEMA,
    '@type': 'CollectionPage',
    name: args.nombre,
    url: `${NEGOCIO.url}/${args.tipo}/${args.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: args.productos.map((producto, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: producto.nombre,
        url: `${NEGOCIO.url}/producto/${producto.id}/${slugify(producto.nombre)}`,
        image: fotoPrincipal(producto.id),
      })),
    },
  };
}

/** `BreadcrumbList` genérico. Cada item ya trae su nombre real y su URL absoluta. */
export function breadcrumbJsonLd(
  items: { nombre: string; url: string }[],
): object {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: item.nombre,
      item: item.url,
    })),
  };
}
