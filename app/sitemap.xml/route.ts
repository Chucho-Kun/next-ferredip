// app/sitemap.xml/route.ts — índice de sitemaps (<sitemapindex>).
//
// El convention file de Next (app/sitemap.ts) sólo sabe emitir <urlset>, no un
// índice, así que éste se arma a mano como Route Handler — mismo patrón que
// app/feed.xml/route.ts y app/products.xml/route.ts.
//
// Referencia los dos sub-sitemaps del sitio:
//   - /paginas/sitemap.xml  → home, estáticas, marcas y categorías (app/paginas/sitemap.ts)
//   - /products.xml         → una <url> por producto del catálogo (app/products.xml/route.ts)
import { NextResponse } from 'next/server';

export const revalidate = 3600;

const BASE_URL = 'https://ferredip.com.mx';

const SUB_SITEMAPS = [`${BASE_URL}/paginas/sitemap.xml`, `${BASE_URL}/products.xml`];

export async function GET() {
  const lastmod = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SUB_SITEMAPS.map(
  (loc) => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
).join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
