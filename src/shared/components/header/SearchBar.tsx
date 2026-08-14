'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { slugify } from '@/src/utils/slugify';

type ProductSearch = {
  id: string;
  descripcion: string;
  precioant: string;
  precio: string;
  marca: string;
};

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );

        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex-1 w-full relative">
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Buscador"
        className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50"
      >
        {/* Título requerido por Radix */}
        <VisuallyHidden>
          <Dialog.Title>
            Buscador de productos
          </Dialog.Title>
        </VisuallyHidden>

        <div className="relative">
          <Search
            className="absolute left-4 top-4 text-gray-400"
            size={20}
          />

          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar productos..."
            className="w-full border-0 bg-transparent py-4 pl-12 pr-4 text-lg focus:outline-none"
          />
        </div>

        <Command.List className="max-h-100 overflow-auto p-2">
          {loading && (
            <Command.Loading>
              Cargando...
            </Command.Loading>
          )}

          {results.length === 0 &&
            query.length > 2 && (
              <div className="py-6 text-center text-gray-500">
                No se encontraron resultados para { query }
              </div>
            )}

          {results.map((product) => (
            <Command.Item
              key={product.id}
              value={product.descripcion}
              onSelect={() => {
                router.push(
                  `/producto/${ product.id }/${ slugify( product.descripcion ) }`
                );
                setOpen(false);
                setQuery('');
              }}
              className="px-4 py-3 rounded-xl hover:bg-gray-100 cursor-pointer flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {
                    product.descripcion.split(
                      '|'
                    )[0]
                  }
                </p>

                <p className="text-xs text-gray-500">
                  {
                    product.descripcion.split(
                      '|'
                    )[1]
                  }
                </p>

                <p className="text-xs text-gray-500 uppercase">
                  {product.marca}
                </p>
              </div>

              { product.precioant && (
                <div className='text-md line-through text-gray-400'>
                  {product.precioant}
                </div>
              ) }
              <div className="font-bold text-[#E30613]">
                {product.precio}
              </div>
            </Command.Item>
          ))}
        </Command.List>
      </Command.Dialog>

      <div className="relative">
        <input
          type="text"
          placeholder="Click para abrir el Buscador"
          className="w-full h-12 border-2 border-[#FF5E00] rounded-xl py-3 px-5 pr-16 focus:outline-none focus:border-[#E30613] text-sm bg-white cursor-pointer"
          onFocus={() => setOpen(true)}
          readOnly
        />

        <button
          aria-label='Boton Buscar'
          onClick={() => setOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#FF5E00] hover:bg-[#E30613] text-white px-6 py-3 rounded-r-xl transition-all"
        >
          <Search
            size={22}
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  );
}