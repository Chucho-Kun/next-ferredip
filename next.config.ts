import type { NextConfig } from "next";

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 85],
  },
  experimental: {
    optimizePackageImports: ['embla-carousel-react', 'lucide-react', 'react-hot-toast'],
  },
  // Solución temporal para el LRUCache
  cacheHandler: undefined,
  cacheMaxMemorySize: 0,        // Desactiva caché en memoria temporalmente
  async headers() {
    return [
      {
        source: '/fotos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;