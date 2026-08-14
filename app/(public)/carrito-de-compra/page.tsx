import ResumenCompraPage from "@/src/shared/components/cart/ResumenCompra";
import LoadingComponent from "@/src/shared/components/LoadingComponent";
import { Suspense } from "react";

export const metadata = {
  title: 'Dipemsa | Carrito de Compra',
  description: 'Paga tus compras con Tarjeta VISA, MasterCard, Mercado Pago o en OXXO. Entregas a toda la República Mexicana.',
  keywords: ['carrito de compra', 'cotización', 'envíos a mexico', 'atención al cliente'],
  openGraph: {
    title: 'Carrito de Compra - DIPEMSA',
    description: 'Paga tus compras con Tarjeta VISA, MasterCard, Mercado Pago o en OXXO',
    images: [
      {
        url: "https://www.dipemsa.com.mx/logoDipemsa.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: '/carrito-de-compra',
  },
};

export default function CompraPage() {
  return (
    <Suspense fallback={ <LoadingComponent /> }>
      <ResumenCompraPage />
    </Suspense>
  )
}
