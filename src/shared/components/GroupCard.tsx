'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { whatsAppNumber } from "../db/contact-info";
import { slugify } from "@/src/utils/slugify";
import { pushEcommerce, toGA4Item, CURRENCY } from "@/src/utils/gtm";

type Variant = {
  id: string
  descripcion: string
  precio: string
  clave: string
  destacado: boolean
  marca: string
};

type GroupedProduct = {
  baseName: string
  variants: Variant[]
};

const LOGO_SRC = '/logo.webp';
const fotoDe = (id: string) => `/fotos/webp/${id}.webp`;

type Props = {
  group: GroupedProduct
  listId?: string
  listName?: string
};

export default function GroupCard({ group, listId, listName }: Props) {
  const [selectedVariant, setSelectedVariant] = useState(group.variants[0]);
  const originalSrc = fotoDe(group.variants[0].id);
  const [imgSrc, setImgSrc] = useState(originalSrc);

  const mainName = group.baseName;

  const handleImageError = () => {
    if (imgSrc !== originalSrc && imgSrc !== LOGO_SRC) {
      setImgSrc(originalSrc);
    } else if (imgSrc !== LOGO_SRC) {
      setImgSrc(LOGO_SRC);
    }
  };

  //console.log( `https://www.dipemsa.com.mx/producto/${ selectedVariant.id }/${ slugify( selectedVariant.descripcion ) }`)

  const handleSelectItem = () => {
    const item = toGA4Item(selectedVariant, { item_list_id: listId, item_list_name: listName });
    pushEcommerce('select_item', {
      item_list_id: listId,
      item_list_name: listName,
      currency: CURRENCY,
      value: item.price,
      items: [item],
    });
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">

      {/* Badge */}
      { group.variants[0].destacado && (
        <div className="bg-[#FF5E00] text-white text-xs font-bold px-4 py-1.5 w-fit">
            PRODUCTO RECOMENDADO
        </div>
      )}

      {/* Imagen */}
      <div className="relative h-52 bg-white flex items-center justify-center p-6">
        <Image
          key={imgSrc}
          src={imgSrc}
          alt={mainName}
          fill
          onError={handleImageError}
          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col p-5">
        <p className="text-xs font-medium text-gray-500 uppercase">{ group.variants[0].marca }</p>

        <h3 className="font-semibold text-lg leading-tight mt-1 mb-4 line-clamp-2">
          {mainName}
        </h3>

        <div className="mt-auto">

             {/* Select de variantes */}
        { group.variants.length > 1 ? (
            <span>
                <label className="text-xs text-gray-500 block mb-1"> { group.variants.length } Variantes</label>
                <select
                    value={selectedVariant.id}
                    onChange={(e) => {
                    const variant = group.variants.find(v => v.id === e.target.value);
                    if (variant) {
                      setSelectedVariant(variant);
                      setImgSrc(fotoDe(variant.id));
                    }
                    }}
                    className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-[#FF5E00] cursor-pointer"
                >
                    {group.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                        {variant.descripcion.split('|')[1]?.trim() || variant.descripcion}
                    </option>
                    ))}
                </select>
            </span>
        ) : (
            <p className="w-full border border-gray-300 px-4 py-3 text-sm bg-white">
                { group.variants[0].descripcion.split('|')[1]?.trim() }
            </p>
        )}
        </div>

        {/* Precio */}
        <div className="mt-4">
          <span className="text-3xl font-bold text-[#E30613]">
            {selectedVariant.precio}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1">
          CLAVE: {selectedVariant.clave}
        </p>
      </div>

      {/* Botón */}
      <div className="p-5 pt-0 mt-auto">
          <Link
              href={`/producto/${ selectedVariant.id }/${ slugify( selectedVariant.descripcion ) }`}
              onClick={handleSelectItem}
              >
            <button className="w-full bg-[#1E2937] hover:bg-black text-white font-semibold py-3.5 transition text-sm">
              VER PRODUCTO
            </button>
          </Link>


      </div>

      {/*<div className="p-5 pt-0 mt-auto">
        <Link
            href={ `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${
                encodeURIComponent(`Hola me interesa cotizar *${
                  selectedVariant.descripcion.split('|')[0].trim()
                  }* ${
                  selectedVariant.descripcion.split('|')[1]
                  } - [${ selectedVariant.id }]`)}`
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
  );
}
