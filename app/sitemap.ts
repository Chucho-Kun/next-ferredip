// app/sitemap.ts
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

  // Misma fuente que usa la grilla de marcas (src/shared/db/marcas.ts) —
  // agregar una marca ahí ya la suma aquí sin tocar este archivo.
  const marcaPages: MetadataRoute.Sitemap = marcas.map((marca) => ({
    url: `${BASE_URL}/marca/${marca.name}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // Misma fuente que usa la grilla de categorías (src/shared/db/productos.ts).
  const categoriaPages: MetadataRoute.Sitemap = categorias.map((categoria) => ({
    url: `${BASE_URL}/categoria/${categoria.name}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticPages, ...marcaPages, ...categoriaPages];
}
