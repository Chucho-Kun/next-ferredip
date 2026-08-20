import SoyMayorista from "@/src/shared/components/SoyMayorista";


export const metadata = {
  title: 'Ferredip | Soy Mayorista',
  description: 'Forma parte de nuestro equipo, Bienvenido a nuestro programa de afiliación para mayoristas y constructores.',
  keywords: ['programa de afiliacion', 'cotización', 'envíos a mexico', 'venta mayorista'],
  openGraph: {
    title: 'Soy Mayorista - FERREDIP',
    description: 'Forma parte de nuestro programa de afiliación para mayoristas y constructores.',
    images: [
      {
        url: "https://ferredip.com.mx/nuevologo.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: '/soy-mayorista',
  },
};

export default function SoyMayoristaPage() {
  return <SoyMayorista />;
}