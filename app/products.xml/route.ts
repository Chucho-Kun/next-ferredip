// app/products.xml/route.ts — sub-sitemap con una <url> por producto del
// catálogo. Referenciado desde el índice /sitemap.xml (app/sitemap.xml/route.ts).
import { getAllProductosXML } from '@/src/shared/db/queries';
import { slugify } from '@/src/utils/slugify';
import { fotoPrincipal } from '@/src/utils/fotos';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

// Escapa los 5 caracteres que rompen un atributo/nodo XML.
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const products = await getAllProductosXML();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        ${products
          .map((product) => {
            const slug = slugify( product.descripcion! );
            const url = `https://ferredip.com.mx/producto/${product.id}/${slug}`;
            // Imagen principal del producto (misma URL del CDN que muestra la
            // ficha) — da presencia en Google Imágenes para búsquedas de
            // herramientas específicas.
            const imagen = fotoPrincipal(product.id ?? '');

            return `
        <url>
          <loc>${url}</loc>
          <lastmod>${product.createdat ? new Date(product.createdat).toISOString() : new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <image:image>
            <image:loc>${escapeXml(imagen)}</image:loc>
          </image:image>
        </url>`;
          })
          .join('')}
      </urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generando products.xml:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
