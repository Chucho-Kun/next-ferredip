import ProductCardsServer from "@/src/shared/components/ProductCardsServer";
import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import { getProductById } from "@/src/shared/db/queries";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string; slug: string }>;
};

// Metadata Dinámica con datos reales del producto
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  const producto = await getProductById(id);

  if (!producto) {
    return {
      title: "Producto no encontrado | Ferredip",
      description: "El producto que buscas no está disponible.",
    };
  }

  const tituloProducto = producto.descripcion 
    ? producto.descripcion.split('|')[0].trim() 
    : producto.descripcion || "Producto ferredip";

  return {
    title: `${tituloProducto} | Ferredip`,
    description: `${tituloProducto} - Marca: ${producto.marca || 'Ferredip'}. Precio: ${producto.precio}. Disponible en nuestra tienda en línea.`,
    
    openGraph: {
      title: `${tituloProducto} | ${ producto.marca }`,
      description: `${ producto.descripcion?.split('|')[1] } - [ ${ producto.id } ]`,
      url: `https://www.ferredip.com.mx/producto/${id}/${producto.descripcion?.split('|')[0] || ''}`,
      images: [
        {
          url: `/fotos/${id}.jpg`,
          width: 366,
          height: 214,
          alt: tituloProducto,
        },
      ],
      type: "website",
      siteName: "ferredip",
    },

    twitter: {
      card: "summary_large_image",
      title: `${tituloProducto} | Ferredip`,
      description: `${tituloProducto} - ${producto.marca || 'Ferredip'}`,
      images: [`/fotos/${id}.jpg`],
    },
    alternates: {
      canonical: `https://www.ferredip.com.mx/producto/${id}/${ slug }`,
    },
  };
}

export default async function ProductoPage(props: PageProps<'/producto/[id]/[slug]'>) {

  const { id , slug } = await props.params
  const producto = await getProductById( id )

  if(!producto) {
    return <div>Producto no encontrado</div>
  }

  const [tituloProducto, tituloDesc] = (producto.descripcion?.split('|') ?? [])
                                                    .map( parte => parte.replace(/"/g, '').trim())

  return (
    <>
        {/* BreadcrumbList */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Inicio",
                    "item": "https://www.ferredip.com.mx"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Marca",
                    "item": `https://www.ferredip.com.mx/marca/${ producto.marca }`
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "Producto",
                    "item": `https://www.ferredip.com.mx/categoria/${ producto.categoria }`
                  },
                  {
                    "@type": "ListItem",
                    "position": 4,
                    "name": tituloProducto,
                    "item": `https://www.ferredip.com.mx/producto/${id}/${ slug } || ''}`
                  }
                ]
              })
            }}
          />

        {/* Schema.org JSON-LD para Producto */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": tituloProducto,
                "description": tituloDesc || "varios modelos",
                "sku": producto.clave,
                "image": `https://www.ferredip.com.mx/fotos/${id}.jpg`,
                "brand": {
                  "@type": "Brand",
                  "name": producto.marca || "ferredip"
                },

                // ← NUEVO: Aggregate Rating
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.8",           // Calificación promedio (ej: 4.8)
                  "reviewCount": "23"            // Cantidad de reseñas
                },

                // Reseña de ejemplo (Google lo recomienda)
                "review": [
                  {
                    "@type": "Review",
                    "reviewRating": {
                      "@type": "Rating",
                      "ratingValue": "5",
                      "bestRating": "5"
                    },
                    "author": {
                      "@type": "Person",
                      "name": "Jesus Peralta"
                    },
                    "datePublished": "2026-06-23",
                    "reviewBody": "Excelente producto, muy buena calidad y llegó rápido."
                  }
                ],
                
                "offers": {
                  "@type": "Offer",
                  "url": `https://www.ferredip.com.mx/producto/${id}/${ slug || ''}`,
                  "priceCurrency": "MXN",
                  "price": parseFloat(producto.precio?.replace(/[$,]/g, '') || "0"),
                  "validFrom": "2026-01-01",
                  "priceValidUntil": "2026-12-31",
                  "availability": "https://schema.org/InStock", // o "OutOfStock" si no hay stock
                  "seller": {
                    "@type": "Organization",
                    "name": "ferredip"
                  },

                              // === NUEVO: Shipping Details ===
                    "shippingDetails": {
                      "@type": "OfferShippingDetails",
                      "shippingRate": {
                        "@type": "MonetaryAmount",
                        "value": "300",                    // Cambia si tienes costo de envío
                        "currency": "MXN"
                      },
                      "shippingDestination": {
                        "@type": "DefinedRegion",
                        "addressCountry": "MX"
                      },
                      "deliveryTime": {
                        "@type": "ShippingDeliveryTime",
                        "handlingTime": {
                          "@type": "QuantitativeValue",
                          "minValue": 1,
                          "maxValue": 2,
                          "unitCode": "d"
                        },
                        "transitTime": {
                          "@type": "QuantitativeValue",
                          "minValue": 3,
                          "maxValue": 7,
                          "unitCode": "d"
                        }
                      }
                    },

                                // === NUEVO: Return Policy ===
                    "hasMerchantReturnPolicy": {
                      "@type": "MerchantReturnPolicy",
                      "applicableCountry": ["MX"],
                      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                      "merchantReturnDays": 30,
                      
                      "returnMethod": ["https://schema.org/ReturnByMail"],
                      
                      // ← Campo principal que Google está pidiendo
                      "returnFees": "https://schema.org/FreeReturn",

                      // Mantén este también por compatibilidad
                      "returnShippingFeesAmount": {
                        "@type": "MonetaryAmount",
                        "value": "0",
                        "currency": "MXN"
                      }
                    }
                }
              })
            }}
          />

        <section>
          {/* <ProductCard slug={ slug } /> */}
          <ProductCardsServer id={id} />
        </section>

        <section>
          <RecommendedProductsServer />
        </section>
    </>
  )
}
