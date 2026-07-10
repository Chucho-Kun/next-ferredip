import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Producto } from './types/producto';

type LeftPanelProps = {
  productos: Producto[];
  productoSeleccionado: Producto | null;
  setProductoSeleccionado: React.Dispatch<React.SetStateAction<Producto | null>>;
};

export default function LeftPanel({
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
}: LeftPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const productosFiltrados = searchTerm.length > 0 
    ? productos.filter(p => 
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clave.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (!isClient) {
    return (
      <div className="w-96 border-r overflow-y-auto p-4 bg-gray-50">
        <h3 className="font-semibold mb-4">Producto Principal</h3>
        <div className="h-96 flex items-center justify-center text-gray-400">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-r overflow-y-auto p-4 bg-gray-50">
      <h3 className="font-semibold mb-4">Producto Principal</h3>
      
      <input
        type="text"
        placeholder="Buscar producto..."
        className="w-full mb-4 p-3 border rounded-xl"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="space-y-3">
        {searchTerm.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-400 text-center">
            Escribe para buscar productos
          </div>
        ) : productosFiltrados.length > 0 ? (
          productosFiltrados.map((p) => {
            const [titulo, detalle] = p.descripcion
              ?.split('|')
              .map((parte) => parte.replace(/"/g, '').trim()) ?? [];

            return (
              <div
                key={p.id}
                onClick={() => setProductoSeleccionado(p)}
                className={`p-3 rounded-xl cursor-pointer transition hover:bg-white border ${
                  productoSeleccionado?.id === p.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex gap-3">
                  {p.id && (
                    <Image
                      src={`/fotos/${p.id}.jpg`}
                      alt={titulo}
                      width={100}
                      height={60}
                      className="rounded object-contain"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{titulo}</p>
                    {detalle && <p className="text-xs text-gray-600 line-clamp-2">{detalle}</p>}
                    <p className="text-xs text-gray-500">Clave: {p.clave}</p>
                  </div>
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