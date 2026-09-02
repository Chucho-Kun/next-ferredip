import ProductCardsServer from "@/src/shared/components/ProductCardsServer";
import RecentViewProducts from "@/src/shared/components/RecentViewProducts";
import TrackRecentProduct from "@/src/shared/components/TrackRecentProduct";
import { getProductById } from "@/src/shared/db/queries";
import { slugify } from "@/src/utils/slugify";
import { formatPrecio } from "@/src/utils/formatPrice";
import { fotoPrincipalZoom } from "@/src/utils/fotos";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, productoJsonLd } from "@/src/shared/seo/jsonLd";
import { slugToMarca, slugToCategory } from "@/src/shared/db/slugs";

type Props = {
  params: Promise<{ id: string; slug: string }>;
};

// Metadata Dinámica con datos reales del producto
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const producto = await getProductById(id);

  if (!producto) {
    notFound();
  }

  const tituloProducto = producto.descripcion
    ? producto.descripcion.split('|')[0].trim()
    : producto.descripcion || "Producto Ferredip";

  const canonical = `https://ferredip.com.mx/producto/${id}/${slugify(producto.descripcion ?? '')}`;
  const descripcionSocial =
    producto.informacion?.trim() || `${tituloProducto} — ${producto.marca ?? 'Ferredip'}`;

  return {
    title: `${tituloProducto} | Ferredip`,
    description: `${tituloProducto} - Marca: ${producto.marca || 'Ferredip'}. Precio: $${formatPrecio(producto.precio)}. Disponible en nuestra tienda en línea.`,

    openGraph: {
      title: `${tituloProducto} | ${ producto.marca }`,
      description: descripcionSocial,
      url: canonical,
      images: [
        {
          url: fotoPrincipalZoom(id),
          width: 1800,
          height: 1800,
          alt: tituloProducto,
        },
      ],
      type: "website",
      siteName: "Ferredip",
    },

    twitter: {
      card: "summary_large_image",
      title: `${tituloProducto} | Ferredip`,
      description: descripcionSocial,
      images: [fotoPrincipalZoom(id)],
    },
    alternates: {
      canonical,
    },
  };
}

export default async function ProductoPage(props: PageProps<'/producto/[id]/[slug]'>) {

  const { id } = await props.params
  const producto = await getProductById(id)

  if (!producto) {
    notFound()
  }

  const marcaSlug = slugify(producto.marca ?? '')
  const categoriaSlug = slugify(producto.categoria ?? '')
  const canonical = `https://ferredip.com.mx/producto/${id}/${slugify(producto.descripcion ?? '')}`
  const tituloProducto = (producto.descripcion ?? '').split('|')[0].replace(/"/g, '').trim()

  return (
    <>
        {/* BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              breadcrumbJsonLd([
                { nombre: "Inicio", url: "https://ferredip.com.mx" },
                { nombre: slugToMarca(marcaSlug), url: `https://ferredip.com.mx/marca/${marcaSlug}` },
                { nombre: slugToCategory(categoriaSlug), url: `https://ferredip.com.mx/categoria/${categoriaSlug}` },
                { nombre: tituloProducto, url: canonical },
              ]),
            ),
          }}
        />

        {/* Schema.org JSON-LD para Producto */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productoJsonLd(producto)) }}
        />

        <TrackRecentProduct
          producto={{
            id,
            descripcion: producto.descripcion ?? '',
            precio: producto.precio ?? '',
            precioant: producto.precioant ?? '',
            clave: producto.clave ?? '',
            marca: producto.marca ?? '',
          }}
        />

        <section>
          {/* <ProductCard slug={ slug } /> */}
          <ProductCardsServer id={id} />
        </section>

        {/* <section>
          <RecommendedProductsServer />
        </section> */}

        <section>
          <RecentViewProducts currentId={id} />
        </section>
    </>
  )
}
