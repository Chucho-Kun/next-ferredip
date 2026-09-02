import CompraConNosotros from "@/src/shared/components/CompraConNosotros";
import ProductsSection from "@/src/shared/components/ProductsSection";
import SliderMain from "@/src/shared/components/SliderMain";
import Marcas from "@/src/shared/components/Marcas";
import { Metadata } from "next";
import { productos } from "@/src/shared/db/productos";
import RecentViewProducts from "@/src/shared/components/RecentViewProducts";
import { organizacionJsonLd } from "@/src/shared/seo/jsonLd";
import { NEGOCIO } from "@/src/shared/seo/negocio";

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
    url: "https://ferredip.com.mx/",
    siteName: "Ferredip",
    images: [
      {
        url: "https://ferredip.com.mx/nuevologo.jpg",   // Cambia por tu imagen real
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
    images: ["https://ferredip.com.mx/nuevologo.jpg"],
  },

  alternates: {
    canonical: "https://ferredip.com.mx",
  },
};
// =====================================================

export default function page() {
  return (
    <>
      
      {/* Schema.org JSON-LD — @graph: Organization + WebSite + 2 HardwareStore */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizacionJsonLd()) }}
      />

      <h1 className="text-sm font-bold text-center mb-12 text-white">
        {NEGOCIO.nombre} | Distribuidora de herramientas
      </h1>

      <main>
        <SliderMain />
      </main>

      {/* <RecommendedProductsServer /> */}

      <RecentViewProducts />

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

      <Marcas />
    </>
  );
}