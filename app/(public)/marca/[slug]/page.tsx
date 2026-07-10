import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import TrademarckResults from "@/src/shared/components/TrademarckResults";
import { slugToMarca } from "@/src/shared/db/queries";
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
      images: [
      {
        url: `https://www.dipemsa.com.mx/marcas/${ slug }.webp`,
        width: 683,
        height: 400,
      },
    ],
    },
  };
}

export default async function MarcaResultPage(props: PageProps<'/marca/[slug]'>) {

  const { slug } = await props.params
  
  return (
      <>
        <TrademarckResults slug={ slug } />
        <RecommendedProductsServer />
      </>

  )
}
