import CompraConNosotros from "@/src/shared/components/CompraConNosotros";
import ProductsSection from "@/src/shared/components/ProductsSection";
import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import SliderMain from "@/src/shared/components/SliderMain";
import MarcasPage from "./marcas/page";
import { Metadata } from "next";
import { productos } from "@/src/shared/db/productos";

// ==================== METADATA SEO ====================
export const metadata: Metadata = {
  title: "Dipemsa | Materiales de Construcción Ligera",
  description: "Somos DIPEMSA una empresa distribuidora de materiales para construcción ligera, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
  
  keywords: [
    "materiales de construcción ligera","distribuidora de materiales","construcción ligera",
    "armstrong","cempanel","dipemsa","fischer","gram bel","gyproc","mapei","pennsylvania","panel rey","truper","owens corning","riho","stabilit","trim tex","usg",
    "aislantes térmicos","perfiles galvanizados","sistemas de fijación","compuestos y cintas","cempanel","tornilleria","herramientas","tablaroca","plafones","liner panel","suspensiones",
    "anclajes y quimicos epoxicos","perfiles plasticos","sellado","adhesivos y nivelantes",
    "perfiles metálicos",
    "ecatepec",
    "cdmx"
  ],

  authors: [{ name: "Dipemsa" }],
  openGraph: {
    title: "Dipemsa | Materiales de Construcción Ligera",
    description: "Somos DIPEMSA una empresa distribuidora de materiales para construcción ligera, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
    url: "https://www.dipemsa.com.mx/",
    siteName: "Dipemsa",
    images: [
      {
        url: "https://www.dipemsa.com.mx/logoDipemsa.jpg",   // Cambia por tu imagen real
        width: 1200,
        height: 630,
        alt: "Dipemsa - Materiales de Construcción",
      },
    ],
    type: "website",
    locale: "es_MX",
  },

  twitter: {
    card: "summary_large_image",
    title: "Dipemsa | Materiales de Construcción Ligera",
    description: "Somos DIPEMSA una empresa distribuidora de materiales para construcción ligera, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
    images: ["https://www.dipemsa.com.mx/logoDipemsa.jpg"],
  },
};
// =====================================================

export default function page() {
  return (
    <>
      
      {/* Schema.org JSON-LD - Organización con 2 Sucursales */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Dipemsa",
                "description": "Somos DIPEMSA una empresa distribuidora de materiales para construcción ligera, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
                "url": "https://www.dipemsa.com.mx",
                "logo": "https://www.dipemsa.com.mx/logo.webp",
                "image": "https://www.dipemsa.com.mx/logoDipemsa.jpg",

                // Sucursales
                "location": [
                  {
                    "@type": "Place",
                    "name": "DIPEMSA SUCURSAL ECATEPEC",
                    "address": {
                      "@type": "PostalAddress",
                      "streetAddress": "Av Insurgentes Esq 3a. Privada Allende El, Capulín 7730",
                      "addressLocality": "Ecatepec de Morelos",
                      "addressRegion": "Estado de México",
                      "postalCode": "55037",
                      "addressCountry": "MX"
                    },
                    "geo": {
                      "@type": "GeoCoordinates",
                      "latitude": 19.593784328073735,
                      "longitude": -99.04405754907754
                    },
                    "telephone": "+52-55-9236-8879",
                    "openingHoursSpecification": [
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                        "opens": "08:30",
                        "closes": "18:00"
                      },
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": "Saturday",
                        "opens": "08:30",
                        "closes": "15:00"
                      }
                    ]
                  },
                  {
                    "@type": "Place",
                    "name": "DIPEMSA SUCURSAL TEXCOCO",
                    "address": {
                      "@type": "PostalAddress",
                      "streetAddress": "Lechería - Texcoco km 27.5, San Francisco Acuexcomac",
                      "addressLocality": "San Francisco Acuexcomac",
                      "addressRegion": "Estado de México",
                      "postalCode": "56300",
                      "addressCountry": "MX"
                    },
                    "geo": {
                      "@type": "GeoCoordinates",
                      "latitude": 19.558544270236247,
                      "longitude": -98.91190823558253
                    },
                    "telephone": "+52-55-9298-6436",
                    "openingHoursSpecification": [
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                        "opens": "08:30",
                        "closes": "18:00"
                      },
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": "Saturday",
                        "opens": "08:30",
                        "closes": "15:00"
                      }
                    ]
                  }
                ],

                "telephone": "+52-55-9236-8879",
                "email": "contacto@dipemsa.com.mx",

                "priceRange": "$$",
                "paymentAccepted": ["Cash", "Credit Card", "Transferencia", "Mercado Pago"],

                "sameAs": [
                  "https://www.facebook.com/Dipemsa/"
                ]
              })
            }}
          />

      <main>
        <SliderMain />
      </main>

      <RecommendedProductsServer />

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            CATEGORÍAS
          </h2>
          <ProductsSection productos={productos} />  
        </div>
      </section>

      <section>
        <CompraConNosotros />
      </section>

      <MarcasPage />
    </>
  );
}