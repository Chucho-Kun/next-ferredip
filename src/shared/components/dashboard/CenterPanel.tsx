// CenterPanel.tsx
import Image from 'next/image';
import { Producto } from './types/producto';

type CenterPanelProps = {
  productoSeleccionado: Producto | null;
  relacionados: Producto[];
  eliminarRelacionado: (id: string) => void;
  relacionadosIds: string[] | null;
};

export default function CenterPanel({  productoSeleccionado, relacionados, eliminarRelacionado, relacionadosIds }: CenterPanelProps) {  

    const orderMap = new Map( relacionadosIds?.map(( id, index ) => [id, index]) )
    // Ordenar los productos según el orden del array
    const relacionadosOrdenados = [...relacionados].sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 999;
        const orderB = orderMap.get(b.id) ?? 999;
        return orderA - orderB;
    });

  return (
    <div className="flex-1 p-8 overflow-auto bg-white">
      {productoSeleccionado ? (
        <div>
          {/* Imagen del producto */}
          {productoSeleccionado.id && (
            <Image 
              src={`/fotos/${productoSeleccionado.id}.jpg`} 
              width={366} 
              height={214} 
              alt={productoSeleccionado.descripcion || ''} 
              className="rounded-lg mb-6 object-contain"
            />
          )}

          {/* Descripción */}
          {(() => {
            const [titulo, detalle] = productoSeleccionado.descripcion
              ?.split('|')
              .map((parte) => parte.replace(/"/g, '').trim()) ?? [];

            return (
              <>
                <h1 className="text-3xl font-bold mb-2">{titulo}</h1>
                {detalle && <p className="text-gray-500 mb-8">{detalle}</p>}
                <p className="text-gray-500 mb-8">Clave: {productoSeleccionado.clave}</p>
              </>
            );
          })()}

          <h3 className="text-xl font-semibold mb-4">Productos Relacionados</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {relacionadosOrdenados.map((rel) => {
              const [titulo, detalle] = rel.descripcion
                ?.split('|')
                .map((parte) => parte.replace(/"/g, '').trim()) ?? [];

              return (
                <div key={rel.id} className="border rounded-xl p-4 relative group">
                  <button
                    onClick={() => eliminarRelacionado(rel.id)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                  
                  <Image 
                    src={`/fotos/${rel.id}.jpg`} 
                    alt={titulo} 
                    width={187}
                    height={109}
                    className="rounded object-contain mb-3" 
                  />
                  
                  <p className="font-medium leading-tight">{titulo}</p>
                  {detalle && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{detalle}</p>
                  )}
                </div>
              );
            })}
          </div>
          
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-400 text-xl">
          Selecciona un producto para gestionar sus relacionados
        </div>
      )}
    </div>
  );
}