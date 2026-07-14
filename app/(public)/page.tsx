import CompraConNosotros from "@/src/shared/components/CompraConNosotros";
import ProductsSection from "@/src/shared/components/ProductsSection";
import RecommendedProductsServer from "@/src/shared/components/RecommendedProductsServer";
import SliderMain from "@/src/shared/components/SliderMain";
import MarcasPage from "./marcas/page";
import { Metadata } from "next";
import { productos } from "@/src/shared/db/productos";

// ==================== METADATA SEO ====================
export const metadata: Metadata = {
  title: "Ferredip | Herramientas",
  description: "Somos FERREDIP una empresa distribuidora de herramientas para construcción ligera, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
  
  keywords: [
    "herramientas de construcción ligera","distribuidora de herramientas","construcción ligera",
    "truper","pretul","fiero","foset","hermex","volteck","klintec","fischer","pennsylvania",
    "electricidad", "iluminacion", "acabados y remodelacion", "cerrajeria", "tornilleria y fijacion", "plomeria", "corte y desbaste", "equipo de seguridad", "accesorios para baño", "aceites y lubricantes", "mantenimiento automotriz", "jardineria", "soldadura", "accesorios neumaticos", "herramienta manual", "herramienta industrial", "articulos de limpieza",
    "ecatepec",
    "cdmx"
  ],

  authors: [{ name: "Ferredip" }],
  openGraph: {
    title: "Ferredip | Herramientas",
    description: "Somos Ferredip una empresa distribuidora de herramientas, contamos con las mejores marcas y stock siempre en existencia.",
    url: "https://www.ferredip.com.mx/",
    siteName: "Ferredip",
    images: [
      {
        url: "https://www.ferredip.com.mx/logo.svg",   // Cambia por tu imagen real
        width: 1200,
        height: 630,
        alt: "Ferredip - Herramientas",
      },
    ],
    type: "website",
    locale: "es_MX",
  },

  twitter: {
    card: "summary_large_image",
    title: "Ferredip | Herramientas",
    description: "Somos Ferredip una empresa distribuidora de herramientas, contamos con las mejores marcas y stock siempre en existencia.",
    images: ["https://www.ferredip.com.mx/logoferredip.jpg"],
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
                "name": "Ferredip",
                "description": "Somos Ferredip una empresa distribuidora de herramientas, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.",
                "url": "https://www.ferredip.com.mx",
                "logo": "https://www.ferredip.com.mx/logo.webp",
                "image": "https://www.ferredip.com.mx/logoferredip.jpg",

                // Sucursales
                "location": [
                  {
                    "@type": "Place",
                    "name": "FERREDIP PIRAMIDES",
                    "address": {
                      "@type": "PostalAddress",
                      "streetAddress": "Carr. Mexico tulancingo Lote kilometro 27-5",
                      "addressLocality": "Teotihuacán de Arista",
                      "addressRegion": "Estado de México",
                      "postalCode": "55800",
                      "addressCountry": "MX"
                    },
                    "geo": {
                      "@type": "GeoCoordinates",
                      "latitude": 19.692939433412597,
                      "longitude": -98.8239674153464
                    },
                    "telephone": "+52-55-7329-0946",
                    "openingHoursSpecification": [
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                        "opens": "08:30",
                        "closes": "18:00"
                      },
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": "Sunday",
                        "opens": "08:30",
                        "closes": "18:00"
                      }
                    ]
                  },
                  {
                    "@type": "Place",
                    "name": "FERREDIP TEQUISISTLAN",
                    "address": {
                      "@type": "PostalAddress",
                      "streetAddress": "Carretera Federal Lechería-Los Reyes km.34 Ejidos de Tequisistlán",
                      "addressLocality": "Tequisistlán",
                      "addressRegion": "Estado de México",
                      "postalCode": "56020",
                      "addressCountry": "MX"
                    },
                    "geo": {
                      "@type": "GeoCoordinates",
                      "latitude": 19.58853677394558,  
                      "longitude": -98.92532129999836
                    },
                    "telephone": "+52-55-6895-3906",
                    "openingHoursSpecification": [
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday","Saturday"],
                        "opens": "08:30",
                        "closes": "18:00"
                      },
                      {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": "Sunday",
                        "opens": "08:30",
                        "closes": "18:00"
                      }
                    ]
                  }
                ],

                "telephone": "+52-55-6895-3906",
                "email": "contacto@ferredip.com.mx",

                "priceRange": "$$",
                "paymentAccepted": ["Cash", "Credit Card", "Transferencia", "Mercado Pago"],

                "sameAs": [
                  "https://www.facebook.com/FerreDipPiramides/"
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