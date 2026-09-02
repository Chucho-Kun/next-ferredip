// app/feed.xml/route.ts
import { getAllProductosXML } from '@/src/shared/db/queries';
import { slugify } from '@/src/utils/slugify';
import { fotoPrincipal } from '@/src/utils/fotos';
import { ENVIO } from '@/src/shared/seo/negocio';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const products = await getAllProductosXML();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
        <channel>
            <title>Ferredip - Productos</title>
            <description>Catálogo de productos Ferredip para Google Merchant Center</description>
            <link>https://ferredip.com.mx</link>
            <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>

            ${products
            .map((product) => {
                const precioLimpio = product.precio
                ?.replace(/[$,]/g, '')
                .trim() || '0';

                return `
                    <item>
                    <g:id>${product.id}</g:id>
                    <g:title>${escapeXml( product.descripcion || '')}</g:title>
                    <g:description>${escapeXml(product.informacion || product.descripcion || '')}</g:description>
                    <g:link>https://ferredip.com.mx/producto/${product.id}/${ slugify( product.descripcion! ) }</g:link>
                    <g:image_link>${fotoPrincipal(product.id ?? '')}</g:image_link>
                    
                    <g:condition>new</g:condition>
                    <g:availability>in stock</g:availability>
                    <g:price>${precioLimpio} MXN</g:price>
                    
                    <g:brand>${escapeXml(product.marca || 'Ferredip')}</g:brand>
                    <g:mpn>${product.clave || ''}</g:mpn>
                    
                    <g:shipping>
                        <g:country>MX</g:country>
                        <g:region>Ciudad de México</g:region>
                        <g:service>Estándar</g:service>
                        <g:price>0 MXN</g:price>
                        <g:min_handling_time>${ENVIO.handlingDias.min}</g:min_handling_time>
                        <g:max_handling_time>${ENVIO.handlingDias.max}</g:max_handling_time>
                        <g:min_transit_time>${ENVIO.transitoDias.min}</g:min_transit_time>
                        <g:max_transit_time>${ENVIO.transitoDias.max}</g:max_transit_time>
                    </g:shipping>
                    </item>`;
            })
            .join('')}
        </channel>
        </rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generando feed Merchant Center:', error);
    return new NextResponse('Error generando feed', { status: 500 });
  }
}

// Función para escapar caracteres especiales en XML
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}