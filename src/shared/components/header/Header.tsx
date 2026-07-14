'use client';

import React, { useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { marcas } from '../../db/marcas';
import SearchBar from './SearchBar';
import CartModule from './CartModule';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full md:sticky md:top-0 md:z-50 bg-white shadow-md">
      {/* Top Bar - Envíos Gratis */}
      <div className="banner-promo text-white font-bold text-center text-sm py-2 px-4">
        ENVÍOS GRATIS EN COMPRAS MAYORES A $5,000 MXN (aplica CDMX y Área Metropolitana) 
        <Link href="/terminos-y-condiciones/" className="underline hover:text-orange-400 ml-1">
          Términos y Condiciones
        </Link>
      </div>

      {/* Main Header */}
      <div className="bg-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="shrink-0">

              <Link href={'/'} className="cursor-pointer">
                  <img width={200} height={70} src="/logo.svg" alt="Logo Ferredip" />
                  {/* <Image 
                    src={'/logo.webp'}
                    width={200}
                    height={70}
                    alt='Logo Dipemsa'
                    className="w-auto h-14 md:h-16 object-contain"
                    priority
                  /> */}
              </Link>

            </div>

              <SearchBar />

               {/* Cart and Quote Button */}
               <div className="flex items-center gap-4 cursor-pointer">
               {/* Cart */}

              {/**Icono carrito en movil */}
              <CartModule />

              {/* Cotiza Ahora Button */}
              <Link 
                  href={ 'https://api.whatsapp.com/send?phone=5573476687' }
                  target='_blank'
                  className="bg-[#e94923] hover:bg-[#E30613] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition text-sm whitespace-nowrap">
                COTIZA POR WHATSAPP
                <span className="text-xl">
                  <Image 
                    src={'/icons/whatsapp.svg'}
                    alt="whatsapp icon"
                    width={25}
                    height={25}
                  />
                </span>
              </Link>

              {/* Mobile Menu Button */}
              <button 
                aria-label='abrir menu movil'
                className="md:hidden text-gray-700"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="bg-white text-black">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center justify-center gap-14 py-4 font-bold text-large">
            
            <Link href={'/'} className='hover:text-[#FF5E00] transition'>HOME</Link>
            <Link href={'/marcas'} className='hover:text-[#FF5E00] transition'>MARCAS</Link>
            <Link href={'/productos'} className='hover:text-[#FF5E00] transition'>CATEGORIAS</Link>
            {/* <Link href={'/soy-mayorista'} className='hover:text-[#FF5E00] transition'>SOY MAYORISTA</Link> */}
            <Link href={'/carrito-de-compra'} className='hover:text-[#FF5E00] transition'>CARRITO DE COMPRA</Link>
            <Link href={'/contacto'} className='hover:text-[#FF5E00] transition'>CONTACTO</Link>

          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 flex flex-col gap-3 text-sm border-t border-gray-700 font-bold">
              <Link href={'/'} className='hover:text-[#FF5E00] transition'>HOME</Link>
              <Link href={'/marcas'} className='hover:text-[#FF5E00] transition'>MARCAS</Link>
              <Link href={'/productos'} className='hover:text-[#FF5E00] transition'>PRODUCTOS</Link>
              {/* <Link href={'/soy-mayorista'} className='hover:text-[#FF5E00] transition'>SOY MAYORISTA</Link> */}
              <Link href={'/carrito-de-compra'} className='hover:text-[#FF5E00] transition'>CARRITO DE COMPRA</Link>
              <Link href={'/contacto'} className='hover:text-[#FF5E00] transition'>CONTACTO</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Brands Bar */}
      <div className="bg-white py-3 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-full mx-auto hidden md:flex items-center justify-center gap-3 md:gap-3 text-xs md:text-sm font-bold text-gray-600 flex-wrap">
            
            { marcas.sort((a,b) => a.name.localeCompare(b.name))
                    .map( (marca, index) => (
                <React.Fragment key={marca.name}>
                  <Link href={ `/marca/${ marca.name }`  } className='hover:text-amber-600 transition' >
                    <span className='uppercase'>{ marca.name.replace('-', ' ') }</span>
                  </Link>
                  { index < marcas.length - 1 && <span>•</span> }
                </React.Fragment>
            )) }

          </div>
        </div>
      </div>
    </header>
  );
}