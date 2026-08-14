// app/not-found.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  // useEffect(() => {
  //   //router.push('/'); // Redirige al home
  // }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold">404</h1>
        
        <a href="/" className='p-4'>
          <p 
            className='bg-black cursor-pointer font-bold text-white p-2 rounded-2xl'
          >IR AL INICIO</p>
        </a>
      </div>
    </div>
  );
}