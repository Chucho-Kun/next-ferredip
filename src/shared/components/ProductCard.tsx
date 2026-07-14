'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { RelatedProductType, ResultadosType } from '../db/resultados';
import Link from 'next/link';
import { whatsAppNumber } from '../db/contact-info';
import { useCartStore } from '@/src/store/cartStore';
import toast from 'react-hot-toast';
import RelatedProducts from './RelatedProducts';

type Props = {
  producto: ResultadosType 
  productosVariantes: RelatedProductType[]
}

export default function ProductCard({producto, productosVariantes}: Props) {
  const { addToCart, totalItems } = useCartStore()
  const [quantity, setQuantity] = useState(1);

  const [ titulo, detalle ] = producto.descripcion
                                                ?.split('|')
                                                .map(parte => parte.replace(/"/g, '').trim()) ?? []


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

    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    addToCart({
      id: producto.id || "",
      titulo: titulo,
      descripcion: detalle,
      precioant: producto.precioant || "",
      precio: producto.precio || "",
      clave: producto.clave || "",
      cantidad: quantity,
      marca: producto.marca || ""
    })

    toast.success(
      <div>{ quantity } pieza{ quantity > 1 && ('s')} de <span className='font-bold'>{ titulo }</span> se { quantity > 1 ? ('agregaron') : ('agregó') } al carrito</div>
    ,{
      position: 'top-center',
      duration: 4000,
    }); 
    
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

        {/* Imagen del producto */}
        <div className="flex flex-col items-center relative bg-white overflow-hidden">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-8 font-bold">
            <Link
              className='hover:underline'
              href="/" >HOME</Link> &gt;{' '}
            <Link
              className='hover:underline' 
              href={`/marca/${ producto.marca?.toLowerCase().replaceAll(' ','-') }` } >{ producto.marca?.toUpperCase() }</Link>

            { producto.categoria && (
              <>
                <span> &gt; </span> 
                <Link href={
                    `/categoria/${ producto.categoria
                                                    ?.normalize("NFD")
                                                    .replace(/[\u0300-\u036f]/g, "")
                                                    .toLowerCase()
                                                    .replaceAll(' ','-') }
                  `}>
                  <span className="text-orange-600 font-bold hover:underline">{ producto.categoria?.toUpperCase() }</span>
                </Link> 
              </>
            ) }
          </nav>
          <Image
            src={'/fotos/default/img.webp'}
            // src={`/fotos/${producto.id}.jpg`}
            alt={producto.descripcion || ''}
            width={366}
            height={214}
            className="h-auto object-contain mt-8"
            priority={true}           // Solo pon true en la página principal
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 366px"
            quality={85}
          />
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800 leading-tight">
            { producto.descripcion?.split('|')[0]}
          </h1>
          <p className="text-gray-600 text-xl font-bold">{ producto.descripcion?.split('|')[1]}</p>
          <p className="text-gray-600 text-xl">Clave: { producto.clave}</p>
           {/* Descripción */}
          <div>
            <p className="text-gray-700 leading-relaxed">
              { producto.informacion }
            </p>
          </div>

          {/* Precios */}
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-[#E30613]">${ producto.precio }.00</span>
            { producto.precioant && (
              <span className="text-2xl line-through text-gray-400">${ producto.precioant }.00</span>
            ) }
          </div>

          <div className="inline-block bg-red-600 text-white text-sm font-bold px-5 py-2 rounded">
            IVA INCLUIDO
          </div>

          {/* Selector de cantidad */}
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Cantidad:</span>
            <div className="flex items-center border border-gray-300 rounded-xl">
              <button 
                onClick={decrease}
                className="px-4 py-3 hover:bg-gray-100 transition"
              >
                <Minus size={18} />
              </button>

              {/* Input editable */}
                <input
                  type="text"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-16 text-center py-3 font-semibold border-x border-gray-300 focus:outline-none focus:border-orange-500"
                  maxLength={3}
                />
              
              <button 
                onClick={increase}
                className="px-4 py-3 hover:bg-gray-100 transition"
              >
                <Plus size={18} />
              </button>
            </div>
            <span className="text-sm text-gray-500">máx. 999</span>
          </div>

          {/* Botón Agregar al carrito */}
          <button 
            onClick={ handleAddToCart }
            className="w-full bg-[#0033A0] hover:bg-[#002280] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition text-lg"
          >
            <ShoppingCart size={24} />
            AGREGAR AL CARRITO
          </button>

          {/* BOTON DE WHATSAPP */}
          {/* <div className="p-5 pt-0 mt-auto">
            <Link 
                href={ `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${
                    encodeURIComponent(`Hola me interesa cotizar *${ 
                      producto.descripcion?.split('|')[0].trim()
                      }* ${
                      producto.descripcion?.split('|')[1]
                      } - [${ producto.id }]`)}` 
                  }
                className="bg-[#FF5E00] hover:bg-[#E30613] text-white font-bold px-6 py-2 w-50 rounded-lg flex items-center gap-2 transition text-sm whitespace-nowrap">
              COTIZA AHORA
              <span className="text-xl">
                <Image 
                  src={'/icons/whatsapp.svg'}
                  alt="whatsapp icon"
                  width={25}
                  height={25}
                />
              </span>
            </Link>
          </div> */}

          
        </div>
      </div>
          <RelatedProducts relacionados={ productosVariantes } orden={ producto.related_products } />
    </div>
  );
}