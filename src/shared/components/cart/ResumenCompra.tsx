'use client';

import ProductComponent from '@/src/shared/components/cart/ProductComponent';
import { useCartStore } from '@/src/store/cartStore';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { totalxcantidad } from '@/src/utils/formatPrice';
import MediosdePagoComponent from './MediosdePagoComponent';
import EntregaComponent from './EntregaComponent';
import { useDeliveryStore } from '@/src/store/deliveryStore';
import { useSearchParams } from 'next/navigation';

export default function ResumenCompraPage() {
    const { items, totalPrice , shippingCost, subTotal, isLoaded, loadCart } = useCartStore()

    //const params = useSearchParams()
    //const isDevView = params.get('dev') === 'true';

    useEffect(() => {
      loadCart()
    },[ loadCart ])

    const { formData } = useDeliveryStore()

const cotizaWhatsApp = () => {
  try {
    const subtotal = subTotal();
    const shipping = shippingCost();
    const total = totalPrice();

    console.log("Valores calculados:", { subtotal, shipping, total });

    const mensaje = `*🛒 Nuevo Pedido desde la Web*\n\n` +
      items.map((item, index) => 
        `${index + 1}. *${item.titulo}*\n` +
        `   ${item.descripcion}\n` +
        `   Cant: ${item.cantidad} × ${totalxcantidad(item.precio, item.cantidad)}`
      ).join('\n\n') +
      `\n────────────────────\n` +
      `*Subtotal:* $${subtotal.toFixed(2)}\n` +
      `*Envío:* $${shipping.toFixed(2)}\n` +
      `*TOTAL:* $${total.toFixed(2)}`;

    window.open(
      `https://api.whatsapp.com/send?phone=5537091930&text=${encodeURIComponent(mensaje)}`,
      '_blank'
    );
  } catch (error) {
    console.error("Error al generar mensaje WhatsApp:", error);
    toast.error("Hubo un error al generar el pedido");
  }
};

  return (

    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-2 gap-10">
        
        {/* === Columna Izquierda: Resumen del Pedido === */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">
            Resumen del Pedido:
            {/* ({`${totalItems}`} {totalItems === 1 ? 'artículo' : 'artículos'}) */}
          </h2>

          {/* Productos del Carrito */}
          <div className='space-y-6'>
            { !isLoaded ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#FF5E00] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 text-lg">Cargando Carrito de Compras...</p>
              </div>
            ) : (
              <>
                { items.length === 0 ? (
                  <p className='text-center text-gray-500 py-8'>No hay productos en el carrito</p>
                ) : (
                  items.map( item => (
                    <ProductComponent key={item.id} item={ item } />
                  )
                )
                )}
              </>
            )
          }

          </div>

          {/* Totales */}
          { items.length > 0 && (
            <div className="pt-6 space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">SUBTOTAL</span>
              <span className="font-semibold">${ subTotal().toFixed(2) }</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">COSTO DE ENVÍO</span>
              <span className="font-semibold">${ shippingCost().toFixed(2) }</span>
            </div>
            
            <div className="flex justify-between text-2xl font-bold border-t pt-4">
              <span>TOTAL</span>
              <span className="text-[#E30613]">${ totalPrice().toFixed(2) }</span>
            </div>

            <div className='flex'>
              <div className="inline-block ml-auto bg-orange-600 text-white text-sm font-medium px-4 py-1 rounded">
                IVA INCLUIDO
              </div>
            </div>
          </div>
          ) }

          {/* COTIZA TU CARRITA POR WHATS APP */}
          {/* <div onClick={ cotizaWhatsApp } className='mt-4 text-center flex justify-center-safe cursor-pointer'>
            <div 
                className="bg-[#FF5E00] hover:bg-[#E30613] text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition text-sm whitespace-nowrap">
              COMPRAR AHORA
              <span className="text-xl">
                <Image 
                  src={'/icons/whatsapp.svg'}
                  alt="whatsapp icon"
                  width={25}
                  height={25}
                  />
              </span>
            </div>
          </div> */}

        {/* <div onClick={ clearCart }>VACIAR CARRITO</div> */}
        
        </div>

        {/* === Columna Derecha: Entrega y Pago === */}

          <div className="space-y-2">
            {/* Formulario de Entrega */}
            <EntregaComponent />

            {/* Medios de Pago */}
            <MediosdePagoComponent />

          </div>

      </div>
    </div>
  );
}