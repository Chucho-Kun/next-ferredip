// app/(public)/contacto/page.tsx

import ContactoClient from "@/src/shared/components/ContactoCliente";

export const metadata = {
  title: 'Dipemsa | Contacto',
  description: 'Envíanos tu mensaje, cotización o consulta. Contáctanos por teléfono, WhatsApp o correo electrónico. Entregas a toda la República Mexicana.',
  keywords: ['contacto dipemsa', 'cotización', 'envíos a mexico', 'atención al cliente'],
  openGraph: {
    title: 'Contáctanos - DIPEMSA',
    description: 'Estamos listos para atender tu consulta. Contáctanos hoy.',
    images: [
      {
        url: "https://www.dipemsa.com.mx/logoDipemsa.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: '/contacto',
  },
};

export default function ContactoPage() {
  return <ContactoClient />;
}