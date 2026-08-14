import SoyMayorista from "@/src/shared/components/SoyMayorista";


export const metadata = {
  title: 'Dipemsa | Soy Mayorista',
  description: 'Forma parte de nuestro equipo, Bienvenido a nuestro programa de afiliación para mayoristas y constructores.',
  keywords: ['programa de afiliacion', 'cotización', 'envíos a mexico', 'venta mayorista'],
  openGraph: {
    title: 'Soy Mayorista - DIPEMSA',
    description: 'Forma parte de nuestro programa de afiliación para mayoristas y constructores.',
    images: [
      {
        url: "https://www.dipemsa.com.mx/logoDipemsa.jpg",
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