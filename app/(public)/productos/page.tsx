import { Metadata } from 'next';
import CategoryResults from '@/src/shared/components/CategoryResults';
import { productos } from '@/src/shared/db/productos';
import { slugToCategory } from '@/src/shared/db/queries';

const primeraCategoria = productos[0].name;

export const metadata: Metadata = {
  title: 'Ferredip | Productos',
  description: 'Listado de todas las categorias de productos que podrás encontrar en nuestro catálogo',
  keywords: productos.map(({ name }) => slugToCategory(name)),
  openGraph: {
    title: 'Productos - Ferredip',
    description: 'Listado de todos los productos con los que contamos en nuestro catálogo',
    images: [
      {
        url: "https://ferredip.com.mx/nuevologo.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: `https://ferredip.com.mx/categoria/${primeraCategoria}`,
  },
};
export default function ProductosPage() {
  return <CategoryResults slug={primeraCategoria} />;
}