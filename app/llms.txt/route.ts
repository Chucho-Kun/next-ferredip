// app/llms.txt/route.ts — índice del sitio en Markdown para motores de IA.
// Mismo patrón que app/feed.xml/route.ts. NO consulta la base de datos:
// las categorías y marcas se derivan de src/shared/db/productos.ts y
// src/shared/db/marcas.ts (las mismas fuentes que las grillas del sitio).
import { NextResponse } from 'next/server';
import { productos as categorias } from '@/src/shared/db/productos';
import { marcas } from '@/src/shared/db/marcas';
import { slugToCategory, slugToMarca } from '@/src/shared/db/slugs';
import {
  NEGOCIO,
  SUCURSALES,
  HORARIO,
  ENVIO,
  DEVOLUCION,
} from '@/src/shared/seo/negocio';

export const revalidate = 3600;

function nombreRed(url: string): string {
  if (url.includes('facebook')) return 'Facebook';
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('instagram')) return 'Instagram';
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function GET() {
  const { url } = NEGOCIO;

  const sucursales = SUCURSALES.map(
    (s) => `### ${s.nombre}
- Dirección: ${s.calle}, ${s.localidad}, ${s.region}, C.P. ${s.cp}
- Teléfono: ${s.telefono}
- Coordenadas: ${s.geo.lat}, ${s.geo.lng}`,
  ).join('\n\n');

  const listaCategorias = categorias
    .map(({ name }) => `- [${slugToCategory(name)}](${url}/categoria/${name})`)
    .join('\n');

  const listaMarcas = marcas
    .map(({ name }) => `- [${slugToMarca(name)}](${url}/marca/${name})`)
    .join('\n');

  const redes = NEGOCIO.sameAs
    .map((red) => `- ${nombreRed(red)}: ${red}`)
    .join('\n');

  const md = `# Ferredip

> ${NEGOCIO.descripcion}

Ferredip es una distribuidora de herramientas y ferretería en el Estado de México,
con tienda en línea en ${url} y dos sucursales físicas. Catálogo de múltiples marcas
(Truper, Pretul, Fiero, Foset, Hermex, Volteck y más), desde una pieza hasta una obra completa.

## Contacto

- Teléfono: ${NEGOCIO.telefono}
- Correo: ${NEGOCIO.email}
- Cotizaciones por WhatsApp: ${url}/contacto

## Sucursales

${sucursales}

Horario (ambas sucursales): Lunes a Domingo, ${HORARIO.abre} a ${HORARIO.cierra}.

## Envíos

- Envío gratis en compras mayores a $${ENVIO.umbralGratis.toLocaleString('es-MX')} MXN, únicamente en ${ENVIO.regionGratis}, para pedidos hechos en ${url}.
- Tiempo de preparación: de ${ENVIO.handlingDias.min} a ${ENVIO.handlingDias.max} días hábiles.
- Tiempo de tránsito: de ${ENVIO.transitoDias.min} a ${ENVIO.transitoDias.max} días hábiles.
- Para envíos a otros estados de la república, cotizar con el equipo de ventas.

## Cambios y devoluciones

- Plazo para cambios: de 1 a ${DEVOLUCION.diasCambio} días naturales desde la recepción del producto.
- Los cambios se reportan con el chofer al recibir o directamente en tienda, no por paquetería.
- No hay devoluciones en efectivo, transferencia ni cheque: se otorga una nota de crédito vigente por ${DEVOLUCION.vigenciaNotaCreditoDias} días naturales.
- No se aceptan cambios ni devoluciones en: plafones, suspensión, polvos, aislantes, químicos epóxicos, resinas, cempanel, y productos de fabricación especial o descontinuados.

## Categorías

${listaCategorias}

## Marcas

${listaMarcas}

## Páginas clave

- [Inicio](${url})
- [Todas las marcas](${url}/marcas)
- [Catálogo por categoría](${url}/productos)
- [Contacto](${url}/contacto)
- [Términos y condiciones](${url}/terminos-y-condiciones)
- [Aviso de privacidad](${url}/aviso-de-privacidad)

## Redes sociales

${redes}

## Recursos para máquinas

- Sitemap: ${url}/sitemap.xml
- Catálogo completo (XML): ${url}/products.xml
- Feed de productos (Google Merchant Center): ${url}/feed.xml
`;

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
