'use client';

import PagoExitosoContent from '@/src/shared/components/cart/PagoExitosoContent';
import { Suspense } from 'react';

// Esta es la página principal (Server Component)
export default function PagoExitoso() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Procesando tu confirmación...</p>
        </div>
      </div>
    }>
      <PagoExitosoContent />
    </Suspense>
  );
}