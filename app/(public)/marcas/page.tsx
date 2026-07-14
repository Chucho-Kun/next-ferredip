import Marcas from "@/src/shared/components/Marcas";


export const metadata = {
  title: 'Ferredip | Marcas',
  description: 'Listado de todas las marcas con las que contamos en nuestro catálogo',
  keywords: ['armstrong','cempanel','dipemsa','fischer','gram bel','gyproc','mapei','owens corning','panel rey','pennsylvania','riho','stabilit','trim tex','truper','usg'],
  openGraph: {
    title: 'Marcas - FERREDIP',
    description: 'Listado de todas las marcas con las que contamos en nuestro catálogo',
    images: [
      {
        url: "https://www.ferredip.com.mx/logoferredip.jpg",
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