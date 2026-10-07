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
    const PAGE_SIZE = 500;

    const header = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        `;
    const footer = `
      </urlset>`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(header));
          let offset = 0;
          for (;;) {
            const products = await getAllProductosXML(PAGE_SIZE, offset);
            if (products.length === 0) break;
            let buf = '';
            for (const product of products) {
            const slug = slugify( product.descripcion! );
            const url = `https://ferredip.com.mx/producto/${product.id}/${slug}`;
            // Imagen principal del producto (misma URL del CDN que muestra la
            // ficha) — da presencia en Google Imágenes para búsquedas de
            // herramientas específicas.
            const imagen = fotoPrincipal(product.id ?? '');

            buf += `
        <url>
          <loc>${url}</loc>
          <lastmod>${product.createdat ? new Date(product.createdat).toISOString() : new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <image:image>
            <image:loc>${escapeXml(imagen)}</image:loc>
          </image:image>
        </url>`;
            // Vaciar por chunks de ~64KB en vez de un solo .join('') gigante
            if (buf.length >= 64 * 1024) {
              controller.enqueue(encoder.encode(buf));
              buf = '';
            }
          }
          if (buf) controller.enqueue(encoder.encode(buf));
            if (products.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
          }
          controller.enqueue(encoder.encode(footer));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error generando products.xml:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
