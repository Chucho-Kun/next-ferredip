'use client';

import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getRecomendedProducts } from '../db/queries';
import { ResultadosType } from '../db/resultados';
import Link from 'next/link';
import { whatsAppNumber } from '../db/contact-info';
import { slugify } from '@/src/utils/slugify';

type Props = {
  productosRecomendados: ResultadosType[]
}

export default function RecommendedProducts( {productosRecomendados} : Props ) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      slidesToScroll: 1,
      skipSnaps: false,
      dragFree: false
    },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          LO MÁS VENDIDO
        </h2>

        <div className="relative">
          {/* Slider */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6 p-2">
              {productosRecomendados.map((producto) => {

                const [ nombre, detalles ] = producto.descripcion!
                  .split("|")
                  .map( txt  => txt.replaceAll(/"/g, "").trim())

                  return(
                      <div key={producto.id} className="flex-[0_0_100%] sm:flex-[0_0_33.3%] lg:flex-[0_0_33.33%] xl:flex-[0_0_25%] min-w-0">
                        <div className="bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                          
                          {/* Badge */}
                          <div className="bg-[#FF5E00] text-white text-xs font-bold px-4 py-1 w-fit">
                            PRODUCTO RECOMENDADO
                          </div>

                          {/* Imagen */}
                          <div className="relative h-52 bg-white flex items-center justify-center p-6 overflow-hidden rounded-t-2xl">
                            <Image
                              src= {`/fotos/${producto.id}.jpg`}
                              alt={ nombre }
                              fill
                              className="object-contain hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          </div>

                          {/* Información */}
                          <div className="p-5 flex-1 flex flex-col">
                            <p className="text-sm font-medium text-gray-500 uppercase">{producto.marca}</p>
                            <h3 className="font-semibold text-lg leading-tight mt-1 mb-2">
                              { nombre }
                            </h3>
                            <p className="text-sm text-gray-600">{ detalles }</p>

                            <div className="mt-auto pt-4">
                              <div className="flex items-baseline gap-2">
                                 { producto.precioant && (
                                  <span className="line-through text-gray-400 text-sm">
                                    { producto.precioant }
                                  </span>
                                 )}
                                <span className="text-2xl font-bold text-[#E30613]">
                                  {producto.precio}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">CLAVE: {producto.clave}</p>
                            </div>
                              <Link href={`/producto/${ producto.id }/${ slugify( producto.descripcion! ) }`
                                          }>
                                <button className="mt-5 w-full bg-[#1E2937] hover:bg-black text-white font-semibold py-3 transition">
                                  VER PRODUCTO
                                </button>
                              </Link>
                              

                            {/*<div className="p-5 pt-0 mt-auto">
                              <Link 
                                  href={ `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${
                                      encodeURIComponent(`Hola me interesa cotizar *${ 
                                        nombre
                                        }* ${
                                        detalles 
                                        } - [${ producto.id }]`)}` 
                                    }
                                  className="bg-[#FF5E00] hover:bg-[#E30613] text-white font-bold px-6 py-2 w-50 mx-auto rounded-lg flex items-center gap-2 transition text-sm whitespace-nowrap">
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
                      </div>
                    )}
              )}
            </div>
          </div>

          {/* Botones de navegación */}
          <button
            onClick={scrollPrev}
            className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg p-3 rounded-full hover:bg-gray-100 transition hidden md:block"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={scrollNext}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-lg p-3 rounded-full hover:bg-gray-100 transition hidden md:block"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}