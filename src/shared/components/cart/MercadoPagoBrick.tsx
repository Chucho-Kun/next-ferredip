'use client';

import { useCartStore } from '@/src/store/cartStore';
import { useDeliveryStore } from '@/src/store/deliveryStore';
import { Payment } from '@mercadopago/sdk-react';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
  locale: 'es-MX',
});

interface Props {
  preferenceId: string;
  amount: number;
  onSuccess?: (data: any) => void;
}

export default function MercadoPagoBrick({ preferenceId, amount, onSuccess }: Props) {
    const [ resetKey,  setResetKey ] = useState(0)
    const { formData: { nombre, apellidos, direccion, entreCalles, ciudad, cp, telefono } } = useDeliveryStore()

    const { shippingCost, subTotal, totalPrice, items } = useCartStore()

    const handleReset = () => {
        setResetKey( prev => prev + 1)
    }

        // Función para enviar correo sin bloquear
    const sendEmailInBackground = async (data: any) => {
    try {
        const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        // No esperamos respuesta para no bloquear
        });

        if (res.ok) {
        console.log("✅ Correo enviado en segundo plano");
        } else {
        console.error("❌ Error enviando correo en background");
        }
    } catch (err) {
        console.error("Error en envío de correo background:", err);
        // No mostramos toast aquí porque el usuario ya vio "Pago exitoso"
    }
    };

  return (
    <div className="max-w-lg mx-auto">
      <Payment
        key={resetKey}
        initialization={{ 
          preferenceId,
          amount 
        }}
        customization={{
          paymentMethods: {
            ticket: 'all',
            creditCard: 'all',
            debitCard: 'all',
            bankTransfer: 'all',
          },
        }}
        onSubmit={async (formData, brick) => {
        try {
            const { formData:{ payer} } = formData
            // Extraer correctamente el email
            const mpEmail = payer.email || "";

            console.log("📧 Email guardado de Mercado Pago:", mpEmail);

            // Guardar en el store
            if (mpEmail) {
            useDeliveryStore.getState().setFormData({ email: mpEmail });
            console.log("✅ Email guardado en el store");
            }
            console.log("Enviando al backend:", formData);

            const res = await fetch('/api/mercadopago/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData, // lo que entrega el Brick
                description: `Compra en Dipemsa (${items.length} producto(s))`,
                items: items.map(item => ({
                    id: item.id,
                    title: String(item.titulo ?? `Producto Dipemsa ${item.id ?? ""}`).trim(),
                    description: item.descripcion ?? "",
                    quantity: Number(item.cantidad ?? 1),
                    unit_price: Number(String(item.precio).replace(/[$,]/g, "")) || 0,
                    currency_id: "MXN",
                })),
                    deliveryData: { nombre, apellidos, direccion, entreCalles, ciudad, cp, telefono },
                }),
            });

            const result = await res.json();
            console.log("Respuesta del servidor:", result);

            if (result.status === 'approved' || result.status === 'in_process') {

                // ==================== ENVÍO DE CORREO EN BACKGROUND ====================
      console.log("📧 Iniciando envío de correo en segundo plano...");

      // Enviamos el correo sin esperar (fire and forget)
            sendEmailInBackground({
                orderData: {
                    paymentId: result.payment_id || 'N/A',
                    items: items.map(item => ({
                        id: item.id,
                        titulo: item.titulo,
                        descripcion: item.descripcion,
                        cantidad: item.cantidad,
                        precio: item.precio,
                    })),  
                    subtotal: subTotal(),
                    shipping: shippingCost(),
                    total: totalPrice(),
                },
                customerEmail: payer.email,
                deliveryData: { nombre, apellidos, direccion, entreCalles, ciudad, cp, telefono }
            });

            toast.success("¡Pago exitoso! Te hemos enviado un correo de confirmación.");
            setTimeout(() => {
                onSuccess?.(result)
            },1000)
            
            } else {

                if(result.status_detail == "cc_rejected_insufficient_amount") {
                    toast.error( // FUND
                        <div className="text-left">
                            <span className="font-bold">Fondos insuficientes en tu tarjeta.</span><br />
                            Por favor verifica el saldo disponible o utiliza otra tarjeta.
                        </div>,
                        { duration: 10000 }
                    );
                    handleReset()
                } else if( result.status_detail == "cc_rejected_other_reason" ){
                    toast.error( // OTHE
                        <div className="text-left">
                            <span className="font-bold">Lo sentimos, hubo un error al procesar tu pago.</span><br />
                            Por favor intenta nuevamente o utiliza otro método de pago.
                        </div>,
                        { duration: 10000 }
                    );
                    handleReset()
                } else if( result.status_detail == "cc_rejected_bad_filled_security_code" ){
                    toast.error( // SECU
                        <div className="text-left">
                            <span className="font-bold">El código de seguridad (CVV) es incorrecto.</span><br />
                            Por favor verifica los 3 o 4 dígitos de la parte trasera de tu tarjeta.
                        </div>,
                        { duration: 10000 }
                    );
                    handleReset()
                } else if( result.status_detail == "cc_rejected_bad_filled_date" ){
                    toast.error( // EXPI
                        <div className="text-left">
                            <span className="font-bold">La tarjeta ha expirado.</span><br />
                            Por favor verifica la fecha de vencimiento o utiliza otra tarjeta.
                        </div>,
                        { duration: 10000 }
                    );
                    handleReset()
                } else if( result.status_detail == "cc_rejected_call_for_authorize" ){
                    toast.error( // CALL
                        <div className="text-left">
                            <span className="font-bold">Tu banco requiere autorización adicional.</span><br />
                            Por favor contacta a tu banco para autorizar el pago e intenta nuevamente.
                        </div>,
                        { duration: 10000 }
                    );
                    handleReset()
                } else if( result.status_detail == "pending_contingency" ){
                    toast.error( // CONT
                        <div className="text-left">
                            <span className="font-bold">Tu pago está en proceso.</span><br />
                            Estamos esperando la confirmación del banco. Te avisaremos en cuanto se complete.
                        </div>,
                        { duration: 10000 }
                    );
                } else {
                     toast.error(
                        <div className="text-left">
                            <span className="font-bold">Ocurrió un error al procesar tu pago.</span><br />
                            Por favor intenta con otra tarjeta o utiliza otro método de pago.
                        </div>,
                        { duration: 10000 }
                    ); 
                    handleReset()
                }

            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar el pago');
        }
        }}
        onReady={() => console.log('✅ Brick cargado correctamente')}
        onError={(error) => {
          console.error('Error cargando el Brick:', error);
        }}
      />
    </div>
  );
}