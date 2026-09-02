import CategoryResults from '@/src/shared/components/CategoryResults';
import RecentViewProducts from '@/src/shared/components/RecentViewProducts';
import RecommendedProductsServer from '@/src/shared/components/RecommendedProductsServer';
import { slugToCategory } from '@/src/shared/db/queries';
import { slugify } from '@/src/utils/slugify';
import { Metadata } from 'next';

// Metadata dinámica
export async function generateMetadata(props: PageProps<'/categoria/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const categoriaNombre = slugToCategory(slug); // "perfiles-plasticos" → "Perfiles Plásticos"

  return {
    title: `Ferredip | ${categoriaNombre}`,
    description: `Explora nuestra selección de ${ categoriaNombre } de las mejores marcas`,
    openGraph: {
      title: `${ categoriaNombre }`,
      description: `Explora nuestra selección de ${ categoriaNombre } de las mejores marcas`,
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