'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { slugify } from '@/src/utils/slugify';
import { RecentProduct, useRecentProductsStore } from '@/src/store/recentProductsStore';
import { formatPrecio } from '@/src/utils/formatPrice';

const LOGO_SRC = '/logo.webp';
const fotoDe = (id: string) => `/fotos/webp/${id}.webp`;

// Se guardan 5 en el store, pero nunca se muestran más de 4 tarjetas:
// el grid es de 4 columnas y una quinta quedaría huérfana en otra fila.
const MAX_VISIBLES = 4;

function RecentCard({ producto }: { producto: RecentProduct }) {
  const [imgSrc, setImgSrc] = useState(() => fotoDe(producto.id));

  const [ nombre, detalles ] = producto.descripcion
    .split('|')
    .map(txt => txt.replaceAll(/"/g, '').trim());

  const handleImageError = () => {
    if (imgSrc !== LOGO_SRC) setImgSrc(LOGO_SRC);
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      {/* Imagen */}
      <div className="relative h-52 bg-white flex items-center justify-center p-6 overflow-hidden rounded-t-2xl">
        <Image
          key={imgSrc}
          src={imgSrc}
          alt={nombre}
          fill
          onError={handleImageError}
          className="object-contain hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>

      {/* Información */}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-sm font-medium text-gray-500 uppercase">{producto.marca}</p>
        <h3 className="font-semibold text-lg leading-tight mt-1 mb-2">
          {nombre}
        </h3>
        <p className="text-sm text-gray-600">{detalles}</p>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2">
            { producto.precioant && (
              <span className="line-through text-gray-400 text-sm">
                ${formatPrecio(producto.precioant)}
              </span>
            )}
            <span className="text-2xl font-bold text-[#E30613]">
              ${formatPrecio(producto.precio)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">CLAVE: {producto.clave}</p>
        </div>

        <Link href={`/producto/${producto.id}/${slugify(producto.descripcion)}`}>
          <button className="mt-5 w-full bg-[#1E2937] hover:bg-black text-white font-semibold py-3 transition">
            VER MÁS
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function RecentViewProducts({ currentId }: { currentId?: string }) {
  const items = useRecentProductsStore(state => state.items);

  // El servidor no conoce el localStorage — hasta que el cliente hidrate
  // no sabemos si hay recientes que mostrar.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const recientes = [...items]
    .reverse()
    .filter(producto => producto.id !== currentId)
    .slice(0, MAX_VISIBLES);

  if (recientes.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          VISTOS RECIENTEMENTE
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {recientes.map(producto => (
            <RecentCard key={producto.id} producto={producto} />
          ))}
        </div>
      </div>
    </section>
  );
}
