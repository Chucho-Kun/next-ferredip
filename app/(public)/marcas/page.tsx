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
  return (
    <>
      {/* h1 a nivel de página (no en Marcas.tsx, que se reutiliza en el home).
          sr-only: da el encabezado semántico sin cambiar el diseño — el <h2>MARCAS>
          visible sigue viviendo en Marcas.tsx. */}
      <h1 className="sr-only">Marcas de herramientas en Ferredip</h1>
      <Marcas />
    </>
  );
}