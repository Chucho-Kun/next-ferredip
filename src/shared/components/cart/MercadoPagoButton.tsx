import Image from "next/image";
import MercadoPagoBrick from "./MercadoPagoBrick";
import { CartItem } from "@/src/store/cartStore";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
    preferenceId: string | null
    crearPreferencia: () => Promise<void>
    loading: boolean
    items: CartItem[]
    totalPrice: () => number
}

export default function MercadoPagoButton( { preferenceId, crearPreferencia, loading, items, totalPrice }: Props) {

    const [ showLoader, setShowLoader ] = useState(false)

  return (
    <div className="min-h-12 py-1">
        <div className="max-w-2xl mx-auto px-4">
            {!preferenceId ? (
            <div>
                <button
                    onClick={ async() => {
                        await crearPreferencia();
                        setShowLoader(true);

                        setTimeout(() => {
                            setShowLoader(false)
                        },5000)
                    }
                }
                disabled={loading || items.length === 0}
                className="w-full bg-[#00B1EA] hover:bg-[#0099CC] text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition flex items-center justify-center gap-3"
                >
                <Image 
                    src="/icons/logo-mercado-pago.svg"
                    alt="Mercado Pago"
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                />
                Pagar con Mercado Pago
                </button>

                <p className="text-center text-sm text-bold text-gray-500 mt-3 flex items-center justify-center gap-1.5">
                Paga de forma segura
                </p>
            </div>
            ) : (
            <>
                {showLoader && (
                    <div className="min-h-100 flex items-center justify-center bg-gray-50 rounded-2xl border">
                        <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-4 text-[#00B1EA]" size={48} />
                        <p className="text-gray-600 font-medium">Cargando formulario de Mercado Pago...</p>
                        <p className="text-xs text-gray-500 mt-1">Esto puede tardar unos segundos</p>
                        </div>
                    </div>
                )}
                <MercadoPagoBrick
                    preferenceId={preferenceId}
                    amount={totalPrice()}
                    onSuccess={(data) => {
                    window.location.href = `/compra/pago-exitoso?payment_id=${data.payment_id}`;
                    }}
                />
            </>
            )}
        </div>
    </div>
  )
}
