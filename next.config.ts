import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['embla-carousel-react', 'lucide-react', 'react-hot-toast'],
  },
  // Solución temporal para el LRUCache
  cacheHandler: undefined,
  cacheMaxMemorySize: 0,        // Desactiva caché en memoria temporalmente
};

export default nextConfig;