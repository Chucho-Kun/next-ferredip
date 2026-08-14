import RecentViewProducts from "@/src/shared/components/RecentViewProducts";
import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import TrademarckResults from "@/src/shared/components/TrademarckResults";
import { slugToMarca } from "@/src/shared/db/queries";
import { slugify } from "@/src/utils/slugify";
import { Metadata } from "next";

// Metadata dinámica
export async function generateMetadata(props: PageProps<'/marca/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const marcaNombre = slugToMarca(slug);

  return {
    title: `Dipemsa | ${marcaNombre}`,
    description: `Explora productos de la marca ${ marcaNombre }`,
    openGraph: {
      title: `${marcaNombre}`,
      description: `Explora productos de la marca ${ marcaNombre }`,
      url: `https://www.dipemsa.com.mx/marca/${ slug }`,
      images: [
      {
        url: `https://www.dipemsa.com.mx/marcas/jpg/${ slug }.jpg`,  // https://www.dipemsa.com.mx/marcas/jpg/trim-tex.jpg
        width: 683,
        height: 400,
      },
    ],
    },
    alternates: {
          canonical: `https://www.dipemsa.com.mx/marca/${ slugify(slug) }`,
    },
  };
}

export default async function MarcaResultPage(props: PageProps<'/marca/[slug]'>) {

  const { slug } = await props.params
  
  return (
      <>

        <TrademarckResults slug={ slug } />
        
        <RecommendedProductsServer />
        
        <RecentViewProducts />
      </>

  )
}
