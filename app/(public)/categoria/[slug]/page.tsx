import CategoryResults from '@/src/shared/components/CategoryResults';
import RecentViewProducts from '@/src/shared/components/RecentViewProducts';
import RecommendedProductsServer from '@/src/shared/components/RecommendedProductsServer';
import { slugToCategory } from '@/src/shared/db/queries';
import { productos as categorias } from '@/src/shared/db/productos';
import { slugify } from '@/src/utils/slugify';
import { Metadata } from 'next';

// Prerenderiza una página estática por categoría a partir de la misma lista que
// usa la grilla (src/shared/db/productos.ts) y app/paginas/sitemap.ts.
// `revalidate` mantiene el listado y los precios frescos sin depender de un redeploy.
export const revalidate = 3600;

export function generateStaticParams() {
  return categorias.map(({ name }) => ({ slug: name }));
}

// Metadata dinámica
export async function generateMetadata(props: PageProps<'/categoria/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const categoriaNombre = slugToCategory(slug); // "perfiles-plasticos" → "Perfiles Plásticos"

  const description = `Compra ${categoriaNombre} de marcas como Truper, Pretul, Fiero y Foset en Ferredip. Envíos a todo México y sucursales en Texcoco, Teotihuacán y CDMX. Surtimos desde una pieza.`;

  return {
    title: `Ferredip | ${categoriaNombre}`,
    description,
    openGraph: {
      title: `${ categoriaNombre } | Ferredip`,
      description,
      url: `https://ferredip.com.mx/categoria/${ slugify(slug) }`,
      images: [
        {
          url: `https://ferredip.com.mx/productos/${ slug }.webp`,
          width: 363,
          height: 197,
        },
      ],
    },
    alternates: {
      canonical: `https://ferredip.com.mx/categoria/${ slugify(slug) }`,
    },
  };
}

export default async function CategoriaResultPage(props: PageProps<'/categoria/[slug]'>) {

  const { slug } = await props.params

  return (
    <>
      <CategoryResults slug={ slug } />

      <RecommendedProductsServer />

      <RecentViewProducts />
    </>
  );
}