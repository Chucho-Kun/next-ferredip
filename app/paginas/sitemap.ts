// app/paginas/sitemap.ts — sub-sitemap de páginas navegables (home, estáticas,
// marcas y categorías). Servido en /paginas/sitemap.xml y referenciado desde el
// índice /sitemap.xml (app/sitemap.xml/route.ts), junto con /products.xml.
//
// Las URLs de marca/categoría se derivan de las mismas fuentes que las grillas
// del sitio (src/shared/db/marcas.ts y src/shared/db/productos.ts): agregar una
// marca o categoría ahí ya la suma aquí sin tocar este archivo.
import { MetadataRoute } from 'next';
import { marcas } from '@/src/shared/db/marcas';
import { productos as categorias } from '@/src/shared/db/productos';

const BASE_URL = 'https://ferredip.com.mx';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/marcas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/productos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/terminos-y-condiciones`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/aviso-de-privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Cada página de marca tiene su logo en public/marcas/{slug}.webp — se declara
  // como imagen del sitemap para dar presencia en Google Imágenes.
  const marcaPages: MetadataRoute.Sitemap = marcas.map((marca) => ({
    url: `${BASE_URL}/marca/${marca.name}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
    images: [`${BASE_URL}/marcas/${marca.name}.webp`],
  }));

  // Cada página de categoría tiene su imagen en public/productos/{slug}.webp.
  const categoriaPages: MetadataRoute.Sitemap = categorias.map((categoria) => ({
    url: `${BASE_URL}/categoria/${categoria.name}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
    images: [`${BASE_URL}/productos/${categoria.name}.webp`],
  }));

  return [...staticPages, ...marcaPages, ...categoriaPages];
}
