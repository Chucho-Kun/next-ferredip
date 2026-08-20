import Marcas from "@/src/shared/components/Marcas";


export const metadata = {
  title: 'Ferredip | Marcas',
  description: 'Listado de todas las marcas con las que contamos en nuestro catálogo',
  keywords: ['Pretul','Fiero','Ferredip','Truper'],
  openGraph: {
    title: 'Marcas - Ferredip',
    description: 'Listado de todas las marcas con las que contamos en nuestro catálogo',
    images: [
      {
        url: "https://ferredip.com.mx/nuevologo.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: '/marcas',
  },
};

export default function MarcasPage() {
  return <Marcas />;
}