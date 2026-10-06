import type { NextConfig } from "next";

const nextConfig = {
  images: {
    // Solo WebP (sin AVIF) y una única calidad: reduce ~4x la combinatoria de
    // transformaciones que el optimizador de imágenes (sharp) tiene que generar
    // bajo crawl agresivo de bots — ver nota de memory leak 2026-08-24 en CLAUDE.md.
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75],
    // Las fotos de producto no cambian sin un deploy nuevo: un TTL largo evita
    // que un re-crawl regenere una variante que ya se había generado antes.
    minimumCacheTTL: 2592000, // 30 días
  },
  experimental: {
    optimizePackageImports: ['embla-carousel-react', 'lucide-react', 'react-hot-toast'],
    // Acota el uso de threads/memoria nativa de sharp por operación en vez de
    // depender del auto-ajuste de Next (mitad de los cores disponibles), que en
    // el contenedor de Railway seguía permitiendo demasiadas operaciones concurrentes.
    imgOptConcurrency: 1,
  },
  // ISR con tope explícito (SPEC 16): sin esto cada hit de bot re-ejecuta
  // queries pesadas; con 0 se desactiva por completo y el fix no se sostiene.
  cacheHandler: undefined,
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Rutas de foto pre-migración a R2 (ver SPEC 08 en CLAUDE.md): public/fotos/
      // ya no existe en el deploy, pero URLs viejas siguen circulando (bots que las
      // indexaron antes del cambio, navegadores con HTML cacheado). Redirige tanto
      // las peticiones directas como el fetch interno del optimizador de imágenes
      // (que resuelve /_next/image?url=/fotos/... contra el propio origen) al CDN.
      {
        source: '/fotos/:path*',
        destination: `${process.env.NEXT_PUBLIC_CDN_URL}/fotos/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;