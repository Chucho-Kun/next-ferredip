import { CartItem } from "@/src/store/cartStore"
import MercadoPagoBrick from "./MercadoPagoBrick"

type Props = {
    preferenceId: string | null
    crearPreferencia: () => Promise<void>
    loading: boolean
    items: CartItem[]
    totalPrice: () => number
}

export default function WhatsAppButton({ preferenceId, crearPreferencia, loading, items, totalPrice }: Props) {
  return (
    <div className="min-h-12 py-1">
      <div className="max-w-2xl mx-auto px-4">

        {!preferenceId ? (
          <button
            onClick={crearPreferencia}
            disabled={loading || items.length === 0}
            className="w-full bg-[#00B1EA] hover:bg-[#0099CC] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition"
          >
            {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
          </button>
        ) : (
          <MercadoPagoBrick
            preferenceId={preferenceId}
            amount={totalPrice()}
            onSuccess={(data) => {
              window.location.href = `/compra/pago-exitoso?payment_id=${data.payment_id}`;
            }}
          />
        )}

        {/* <button
          onClick={async () => {
            if (items.length === 0) {
              toast.error("El carrito está vacío");
              return;
            }

            const testData = {
              orderData: {
                paymentId: "TEST-" + Date.now(),
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
              customerEmail: "gameroapp@gmail.com", // Puedes cambiarlo o usar uno del formulario
              deliveryData: {
                nombre: formData.nombre,
                apellidos: formData.apellidos,
                direccion: formData.direccion,
                entreCalles: formData.entreCalles,
                ciudad: formData.ciudad,
                cp: formData.cp,
                telefono: formData.telefono
              }
            };

            try {
              const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
              });

              const result = await res.json();

              if (res.ok) {
                toast.success("✅ Correo de prueba enviado correctamente con datos reales!");
                console.log("✅ Correo enviado:", result);
              } else {
                toast.error("❌ Error al enviar correo de prueba");
                console.error("❌ Error:", result);
              }
            } catch (error) {
              console.error(error);
              toast.error("Error de conexión al enviar correo");
            }
          }}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition"
        >
          📧 Probar Envío con Datos Reales
        </button> */}
        
      </div>
    </div>
  )
}
