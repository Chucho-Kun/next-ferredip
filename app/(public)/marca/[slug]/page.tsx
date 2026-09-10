import RecentViewProducts from "@/src/shared/components/RecentViewProducts";
import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import TrademarckResults from "@/src/shared/components/TrademarckResults";
import { slugToMarca } from "@/src/shared/db/queries";
import { marcas } from "@/src/shared/db/marcas";
import { slugify } from "@/src/utils/slugify";
import { Metadata } from "next";

// Prerenderiza una página estática por marca a partir de la misma lista que usa
// la grilla de marcas (src/shared/db/marcas.ts) y app/paginas/sitemap.ts.
// `revalidate` mantiene el listado y los precios frescos sin depender de un redeploy.
export const revalidate = 3600;

export function generateStaticParams() {
  return marcas.map(({ name }) => ({ slug: name }));
}

// Metadata dinámica
export async function generateMetadata(props: PageProps<'/marca/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const marcaNombre = slugToMarca(slug);

  const description = `Catálogo ${marcaNombre} en Ferredip: herramienta, ferretería y accesorios con stock en existencia. Envíos a todo México y sucursales en Texcoco, Teotihuacán y CDMX. Surtimos desde una pieza.`;

  return {
    title: `Ferredip | ${marcaNombre}`,
    description,
    openGraph: {
      title: `${marcaNombre} | Ferredip`,
      description,
      url: `https://ferredip.com.mx/marca/${ slugify(slug) }`,
      images: [
      {
        url: `https://ferredip.com.mx/marcas/${ slug }.webp`,
        width: 683,
        height: 400,
      },
    ],
    },
    alternates: {
          canonical: `https://ferredip.com.mx/marca/${ slugify(slug) }`,
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
