import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RecentProduct = {
  id: string
  descripcion: string
  precio: string
  precioant: string
  clave: string
  marca: string
}

type RecentProductsStore = {
  items: RecentProduct[]
  addProduct: (product: RecentProduct) => void
}

// Se guardan 5 para que, al excluir de la sección el producto que se está
// viendo en ese momento, sigan quedando hasta 4 fichas visibles.
const MAX_RECIENTES = 5

export const useRecentProductsStore = create<RecentProductsStore>()(
  persist(
    (set) => ({
      items: [],

      addProduct: (product) => {
        set((state) => {
          // Si ya está guardado no se toca la lista: ni se duplica ni se reordena.
          if (state.items.some(item => item.id === product.id)) return state;

          // Se agrega al final y se conservan solo los últimos 5,
          // así el más viejo (el primero) se descarta solo.
          return { items: [...state.items, product].slice(-MAX_RECIENTES) };
        });
      },
    }),
    {
      name: 'ferredip-recent-products',
    }
  )
);
