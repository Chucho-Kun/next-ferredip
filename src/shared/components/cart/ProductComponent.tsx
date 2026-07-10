import { CartItem, useCartStore } from "@/src/store/cartStore";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useDeleteFromCart } from "@/src/hooks/useDeleteToast";
import { totalxcantidad } from "@/src/utils/formatPrice";
import { useState } from "react";

type Props = {
    item: CartItem
}

export default function ProductComponent({ item }: Props) {

    const { updateQuantity , removeFromCart } = useCartStore()
    const { deleteItem } = useDeleteFromCart()
    const [quantity, setQuantity] = useState(1);

    const increase = () => setQuantity(prev => Math.min(prev + 1, 999));
    const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

      // Nueva función para manejar input manual
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        // Solo permitir números
        if (!/^\d*$/.test(value)) return;

        let newQuantity = parseInt(value) || 1;

        // Limitar entre 1 y 999
        if (newQuantity > 999) newQuantity = 999;
        if (newQuantity < 1) newQuantity = 1;

        updateQuantity( item.id, newQuantity) 
        //setQuantity(newQuantity);
    };

  return (
    <>
    <div className="mb-1">
        <p className="font-medium text-lg">{ item.titulo }</p>
        <p className=" text-gray-500">{ item.descripcion }</p>
    </div>
    <div className="flex gap-2 min-[400px]:gap-4 py-4 border-b">
        <div className="w-20 h-20 min-[400]:w-28 bg-gray-100 rounded-lg overflow-hidden relative shrink-0">
            <Image
            src={`/fotos/${ item.id }.jpg`}
            alt="Lija de agua"
            fill
            className="object-cover"
            sizes="366px"
            />
        </div>
        <div className="flex-1">
            <div className="flex justify-between">
            <div>
                {/* <p className="font-medium">{ item.titulo }</p>
                <p className="text-sm text-gray-500">{ item.descripcion }</p> */}
                <div>
                    <p className="text-sm text-gray-500 uppercase mb-1">{ item.marca }</p>
                    {/* <p className="text-gray-400">{ item.precioant && ( <span className="line-through">({ item.precioant })</span> ) }</p> */}
                    <p className="text-sm mb-1">{ item.precio } x u.</p>
                    <div className="flex items-center justify-center border border-gray-300 w-26">
                        <button 
                            onClick={ () => updateQuantity( item.id, item.cantidad - 1) }
                            className="flex items-center justify-center px-1 py-1 w-full hover:bg-gray-100 transition"
                        >
                            <Minus className="block" size={16} />
                        </button>

                        {/* <span className="px-3 py-1 text-sm font-semibold border-x border-gray-300">{ item.cantidad }</span> */}
                         {/* Input editable */}
                            <input
                            type="text"
                            value={item.cantidad}
                            onChange={handleQuantityChange}
                            className="w-20 min-w-13 text-center text-sm px-3 py-1 font-semibold border-x border-gray-300 focus:outline-none focus:border-orange-500"
                            maxLength={3}
                            />

                        <button 
                            onClick={ () => {
                                if(item.cantidad < 1000) {
                                    updateQuantity( item.id, item.cantidad + 1) }
                                }
                            } 
                            className="flex items-center justify-center px-1 py-1 w-full hover:bg-gray-100 transition"
                        >
                            <Plus className="block" size={16} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div onClick={ () => deleteItem( item.id, item.titulo, item.descripcion ) } className="mb-2">
                    <span className="p-2 rounded-full cursor-pointer hover:bg-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                            className="inline-block size-6"
                            >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </span>
                </div>
                {/* <p className="text-gray-400">{ item.precioant && ( <span className="line-through">({ item.precioant })</span> ) }</p>
                <p>{ item.precio } x pieza</p> */}
                <p className="font-bold text-lg mt-6">
                    ${ totalxcantidad( item.precio, item.cantidad ) }
                </p>
            </div>
            </div>
        </div>
    </div>
    </>
  )
}
