'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { productos } from '../db/productos';
import { slugToCategory } from '../db/slugs';

type Props = {
  activeSlug: string; // slug de la categoría que se está viendo
};

export default function CategoriasMenu({ activeSlug }: Props) {
  // useState solo para el abierto/cerrado del acordeón móvil
  const [isOpen, setIsOpen] = useState(false);

  const enlaces = productos.map(({ name }) => {
    const activa = name === activeSlug;
    return (
      <li key={name}>
        <Link
          href={`/categoria/${name}`}
          onClick={() => setIsOpen(false)}
          className={
            activa
              ? 'text-[#FF5E00] font-bold'
              : 'text-gray-600 hover:text-[#FF5E00] transition'
          }
        >
          {slugToCategory(name)}
        </Link>
      </li>
    );
  });

  return (
    <>
      {/* Escritorio: sidebar de ancho fijo, sticky bajo el header (~280px) */}
      <aside className="hidden md:block w-[260px] shrink-0 md:sticky md:top-[280px] md:max-h-[calc(100vh-280px)] md:overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">CATEGORÍAS</h2>
        <ul className="flex flex-col gap-2">{enlaces}</ul>
      </aside>

      {/* Móvil: barra superior sticky que despliega la lista */}
      <div className="md:hidden sticky top-0 z-30 mb-6">
        <button
          type="button"
          aria-label="abrir menú de categorías"
          aria-expanded={isOpen}
          aria-controls="categorias-menu-movil"
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 font-bold shadow-sm"
        >
          <span className="truncate text-left">
            CATEGORÍAS:{' '}
            <span className="text-[#FF5E00]">{slugToCategory(activeSlug)}</span>
          </span>
          <ChevronDown
            size={20}
            className={`shrink-0 transition ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <ul
            id="categorias-menu-movil"
            className="flex flex-col gap-2 bg-white border border-t-0 border-gray-300 rounded-b-lg px-4 py-3"
          >
            {enlaces}
          </ul>
        )}
      </div>
    </>
  );
}
