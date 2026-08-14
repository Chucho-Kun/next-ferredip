import ProductsSection from '@/src/shared/components/ProductsSection';
import { productos } from '@/src/shared/db/productos';

export const metadata = {
  title: 'Dipemsa | Productos',
  description: 'Listado de todas las categorias de productos que podrás encontrar en nuestro catálogo',
  keywords: ["aislantes","perfiles galvanizados","sistemas de fijacion convencional","compuestos y cintas","cempanel","tornilleria","herramientas","tablaroca","plafones","liner panel","suspension","anclajes y quimicos epoxicos","perfiles plasticos","sellado","adhesivos y nivelantes"],
  openGraph: {
    title: 'Productos - DIPEMSA',
    description: 'Listado de todos los productos con los que contamos en nuestro catálogo',
    images: [
      {
        url: "https://www.dipemsa.com.mx/logoDipemsa.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: '/productos',
  },
};
export default function ProductosPage() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          PRODUCTOS
        </h2>

        <ProductsSection productos={productos} />

      </div>
    </section>
  );
}