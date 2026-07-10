// src/hooks/useDeleteFromCart.tsx
import toast from 'react-hot-toast';
import { useCartStore } from '@/src/store/cartStore';

export const useDeleteFromCart = () => {
  const removeFromCart = useCartStore(state => state.removeFromCart);

  const deleteItem = (id: string, titulo: string, descripcion?: string) => {
    const nombreProducto = `${titulo} ${descripcion ? `- ${descripcion}` : ''}`.trim();

    toast((t) => (
      <div className="flex flex-col gap-3 min-w-70">
        <p className="font-medium">
          ¿Eliminar <span className="text-orange-600">{nombreProducto}</span> del carrito?
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          
          <button
            onClick={() => {
              removeFromCart(id);
              
              toast.success('Producto eliminado del carrito', {
                duration: 2500,
                icon: '🗑️',
              });
              
              toast.dismiss(t.id);
            }}
            className="px-5 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    });
  };

  return { deleteItem };
};