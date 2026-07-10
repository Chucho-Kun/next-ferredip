import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
    id: string
    titulo: string
    descripcion: string
    precioant: string
    precio: string
    cantidad: number
    clave: string
    marca: string
}

type CartStore = {
  items: CartItem[];
  isLoaded: boolean;
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, cantidad: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subTotal: () => number;
  shippingCost: () => number;
  totalPrice: () => number;
  loadCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoaded: false,

      addToCart: (product) => {
        console.log("Producto recibido:", product); // Para debug

        set((state) => {
          const existing = state.items.find(item => item.id === product.id);
          
          if (existing) {
            // Si ya existe, solo aumentar la cantidad
            return {
              items: state.items.map(item =>
                item.id === product.id
                  ? { ...item, cantidad: item.cantidad + (product.cantidad || 1) }
                  : item
              )
            };
          } else {
            // Si es nuevo, respetar la cantidad que viene del componente
            return {
              items: [...state.items, { 
                ...product, 
                cantidad: product.cantidad || 1   // ← Aquí estaba el error
              }]
            };
          }
        });
      },

      removeFromCart: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },

      updateQuantity: (id, cantidad) => {
        if (cantidad < 1) return;
        set((state) => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, cantidad } : item
          )
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0);
      },

      subTotal: () => {
        return get().items.reduce((sum, item) => {
          const price = parseFloat(item.precio.replace(/[$,]/g, '')) || 0;
          return sum + price * item.cantidad;
        }, 0);
      },

      shippingCost: () => {
        const subtotal = get().subTotal();
        return subtotal >= 5000 ? 0 : 300; // 300
      },

      totalPrice: () => {
        return get().subTotal() + get().shippingCost()
      },
      
      loadCart: () => {
        set({ isLoaded: true })
      },
      
    }),
    {
      name: 'dipemsa-cart',
      // Opcional: No guardar `isLoaded` en localStorage
      partialize: (state) => ({
        items: state.items,
        // isLoaded no se guarda
      }),
    }
  )
);