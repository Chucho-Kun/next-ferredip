// app/products.xml/route.ts
import { getAllProductosXML } from '@/src/shared/db/queries';
import { slugify } from '@/src/utils/slugify';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await getAllProductosXML();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${products
          .map((product) => {
            const slug = slugify( product.descripcion! );
            const url = `https://www.dipemsa.com.mx/producto/${product.id}/${slug}`;

            return `
        <url>
          <loc>${url}</loc>
          <lastmod>${product.createdat ? new Date(product.createdat).toISOString() : new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
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