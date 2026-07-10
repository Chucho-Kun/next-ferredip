'use client'
import { useCartStore } from '@/src/store/cartStore'
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export default function CartModule() {
    const totalItems = useCartStore(state => state.totalItems());
    
    // Estado local para forzar re-render
    const [displayCount, setDisplayCount] = useState(0);

    useEffect(() => {
        setDisplayCount(totalItems);
    }, [totalItems]);
  
    return (
    <Link href={'/carrito-de-compra'} >
        <button 
                className="cursor-pointer flex items-center gap-2 hover:text-[#E30613] transition fixed bottom-6 right-6 md:static md:bottom-auto md:right-auto z-50 md:z-auto bg-white rounded-4xl p-2.25 hover:bg-gray-100"
                >
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth="1.5" 
                stroke="#FF5E00" 
                className="size-9 md:size-8 cursor-pointer"
            >
                <path strokeLinecap="round" strokeLinejoin="round" 
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" 
                />
            </svg>
            {displayCount > 0 && (
                <span
                    suppressHydrationWarning 
                    className="flex items-center justify-center cursor-pointer cart-label bg-[#FF5E00] text-white w-7 h-7 rounded-full text-sm font-bold" >
                    { displayCount }
                </span>
            )}
        </button>
    </Link>
  )
}
