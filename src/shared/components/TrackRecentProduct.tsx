'use client';

import { useEffect } from 'react';
import { RecentProduct, useRecentProductsStore } from '@/src/store/recentProductsStore';

export default function TrackRecentProduct({ producto }: { producto: RecentProduct }) {
  const addProduct = useRecentProductsStore(state => state.addProduct);

  // Depende de producto.id, no de [] — cambiar de variante reutiliza esta
  // misma instancia y con [] el efecto nunca se volvería a disparar.
  useEffect(() => {
    addProduct(producto);
  }, [producto.id]);

  return null;
}
