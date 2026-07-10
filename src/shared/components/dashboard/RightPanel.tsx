import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Producto } from './types/producto';

type RightPanelProps = {
  productos: Producto[];
  productoSeleccionado: Producto | null;
  relacionados: Producto[];
  agregarRelacionado: (producto: Producto) => void;
};

export default function RightPanel({
  productos,
  productoSeleccionado,
  relacionados,
  agregarRelacionado,
}: RightPanelProps) {
  const [searchTermRight, setSearchTermRight] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Solo filtrar cuando el usuario haya escrito algo
  const productosFiltradosRight = searchTermRight.length > 0 
    ? productos
        .filter(p => p.id !== productoSeleccionado?.id)
        .filter(p => 
          p.descripcion.toLowerCase().includes(searchTermRight.toLowerCase()) ||
          p.clave.toLowerCase().includes(searchTermRight.toLowerCase())
        )
    : [];   // ← No mostrar nada hasta que busque

  if (!isClient) {
    return (
      <div className="w-96 border-l bg-gray-50 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Agregar relacionados</h3>
        <div className="h-96 flex items-center justify-center text-gray-400">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-gray-50 p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Agregar relacionados</h3>
      
      {/* Buscador independiente */}
      <input
        type="text"
        placeholder="Buscar para agregar..."
        className="w-full mb-4 p-3 border rounded-xl"
        value={searchTermRight}
        onChange={(e) => setSearchTermRight(e.target.value)}
      />

      <div className="space-y-3">
        {searchTermRight.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-400 text-center">
            Escribe para buscar productos y agregarlos como relacionados
          </div>
        ) : productosFiltradosRight.length > 0 ? (
          productosFiltradosRight.map((p) => {
            const [titulo, detalle] = p.descripcion
              ?.split('|')
              .map((parte) => parte.replace(/"/g, '').trim()) ?? [];

            return (
              <div
                key={p.id}
                onClick={() => agregarRelacionado(p)}
                className="p-3 bg-white border rounded-xl hover:border-green-400 cursor-pointer flex gap-3 transition hover:shadow-md"
              >
                {p.id && (
                  <Image 
                    src={`/fotos/${p.id}.jpg`} 
                    alt={titulo} 
                    width={60} 
                    height={45} 
                    className="rounded object-contain shrink-0" 
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{titulo}</p>
                  {detalle && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">{detalle}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Clave: {p.clave}</p>
                </div>

                <div className="flex items-center text-green-600 text-2xl font-light self-center">
                  +
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center py-8">
            No se encontraron productos con ese término
          </p>
        )}
      </div>
    </div>
  );
}