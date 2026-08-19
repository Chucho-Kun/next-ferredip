'use client';

import { useCartStore } from '@/src/store/cartStore';
import { useDeliveryStore } from '@/src/store/deliveryStore';
import { Payment, getIdentificationTypes } from '@mercadopago/sdk-react';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { pushEcommerce, toGA4Item, round2, paymentTypeLabel, CURRENCY } from '@/src/utils/gtm';
import { saveOrderSnapshot } from '@/src/utils/orderSnapshot';
import PagoProcesadoOverlay from './PagoProcesadoOverlay';

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!, {
  locale: 'es-MX',
});

// Precarga el script externo del SDK de Mercado Pago (sdk.mercadopago.com)
// apenas se carga este módulo, es decir, cuando el usuario llega a la
// página de checkout, en vez de esperar a que se monte <Payment> tras dar
// clic en "Pagar". initMercadoPago() de arriba solo guarda la public key;
// la descarga real del script ocurre recién dentro de
// MercadoPagoInstance.getInstance(), que el brick <Payment> del SDK llama
// desde su propio useEffect. En una carga fría (script sin cachear en el
// navegador) esa descarga puede tardar varios segundos, y si el efecto del
// brick se dispara más de una vez en esa ventana (doble invocación de
// React Strict Mode en dev, u otro re-render), cada llamada dispara su
// propia creación del Brick sin cancelar a la anterior (el SDK usa un
// singleton global y no espera a que la creación previa resuelva antes de
// desmontarla) — el resultado son formularios de pago duplicados. Llamando
// a getIdentificationTypes() aquí (no nos interesa el resultado) forzamos
// esa carga con anticipación, para que cuando el usuario finalmente llegue
// al brick real, el SDK ya esté listo y la ventana de carrera desaparezca.
getIdentificationTypes().catch(() => {});

interface Props {
  preferenceId: string;
  amount: number;
  onSuccess?: (data: any) => void;
}

// Objeto estático: debe mantener la misma referencia entre renders para no
// disparar el useEffect interno del brick de Mercado Pago (ver customization
// más abajo). Si esta referencia cambia en cada render, el SDK desmonta y
// vuelve a crear el formulario de pago, y si la creación anterior aún estaba
// en curso (conexión lenta), puede terminar dejando dos formularios en pantalla.
const PAYMENT_CUSTOMIZATION = {
  paymentMethods: {
    ticket: 'all',
    creditCard: 'all',
    debitCard: 'all',
    bankTransfer: 'all',
  },
} as const;

// Función para enviar correo sin bloquear (fire and forget).
// Vive fuera del componente porque no depende de props/estado: si estuviera
// adentro, sería una referencia nueva en cada render y forzaría a handleSubmit
// a recrearse también.
async function sendEmailInBackground(data: any) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      // keepalive: el navegador termina esta petición aunque el documento
      // se descargue antes de que responda (window.location.href en
      // MercadoPagoButton ocurre ~1s después de disparar este fetch).
      keepalive: true,
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
}

type EstadoPago = 'idle' | 'aprobado' | 'pendiente'

export default function MercadoPagoBrick({ preferenceId, amount, onSuccess }: Props) {
    const [ resetKey,  setResetKey ] = useState(0)
    const [ estadoPago, setEstadoPago ] = useState<EstadoPago>('idle')
    const beginCheckoutSent = useRef(false)
    const addPaymentInfoSent = useRef(false)

    const handleReset = useCallback(() => {
        setResetKey( prev => prev + 1)
    }, [])

    // El brick de Mercado Pago (@mercadopago/sdk-react) vuelve a montar el
    // formulario cada vez que initialization/customization/onSubmit/onReady/
    // onError cambian de referencia. Antes eran objetos/funciones literales
    // recreados en cada render, lo que causaba remontajes espurios del Brick
    // (por ejemplo cuando MercadoPagoButton oculta el loader 1s después de
    // crear la preferencia) y, en conexiones lentas, dos formularios visibles
    // a la vez porque la creación anterior seguía en curso cuando se disparaba
    // la siguiente.
    const initialization = useMemo(() => ({ preferenceId, amount }), [preferenceId, amount])

    const handleSubmit = useCallback(async (formData: any, _brick: unknown) => {
        try {
            const { items, shippingCost, subTotal, totalPrice } = useCartStore.getState()
            const { nombre, apellidos, direccion, entreCalles, ciudad, cp, telefono } = useDeliveryStore.getState().formData

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

            if (!addPaymentInfoSent.current) {
                addPaymentInfoSent.current = true

                const ga4Items = items.map((item) => toGA4Item(item, { quantity: item.cantidad }))
                pushEcommerce('add_payment_info', {
                    currency: CURRENCY,
                    value: round2(subTotal()),
                    payment_type: paymentTypeLabel(formData.paymentType),
                    items: ga4Items,
                })
            }

            const res = await fetch('/api/mercadopago/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData, // lo que entrega el Brick
                description: `Compra en Ferredip (${items.length} producto(s))`,
                items: items.map(item => ({
                    id: item.id,
                    title: String(item.titulo ?? `Producto Ferredip ${item.id ?? ""}`).trim(),
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

                setEstadoPago(result.status === 'approved' ? 'aprobado' : 'pendiente')

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

            // El carrito no sobrevive a la recarga completa de /compra/pago-exitoso,
            // así que guardamos un snapshot para que 'purchase' pueda leerlo ahí.
            // result.payment_id llega como number (PaymentResponse.id de la SDK de
            // Mercado Pago); se castea a string porque searchParams.get('payment_id')
            // en /compra/pago-exitoso siempre devuelve string, y la comparación de
            // paymentId es estricta (===).
            saveOrderSnapshot({
                paymentId: String(result.payment_id),
                items,
                subtotal: round2(subTotal()),
                shipping: round2(shippingCost()),
                total: round2(totalPrice()),
                createdAt: Date.now(),
            });

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
    }, [onSuccess, handleReset])

    const handleReady = useCallback(() => {
        console.log('✅ Brick cargado correctamente')

        if (!beginCheckoutSent.current) {
            beginCheckoutSent.current = true

            const { items, subTotal } = useCartStore.getState()
            const ga4Items = items.map((item) => toGA4Item(item, { quantity: item.cantidad }))
            pushEcommerce('begin_checkout', {
                currency: CURRENCY,
                value: round2(subTotal()),
                items: ga4Items,
            })
        }
    }, [])

    const handleError = useCallback((error: unknown) => {
        console.error('Error cargando el Brick:', error);
    }, [])

  return (
    <div className="max-w-lg mx-auto">
      {estadoPago !== 'idle' && <PagoProcesadoOverlay variante={estadoPago} />}
      <Payment
        key={resetKey}
        initialization={initialization}
        customization={PAYMENT_CUSTOMIZATION}
        onSubmit={handleSubmit}
        onReady={handleReady}
        onError={handleError}
      />
    </div>
  );
}