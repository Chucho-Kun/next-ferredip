import type { MetadataRoute } from 'next';

// Mismo host que `metadataBase` en app/layout.tsx: sin `www`.
const BASE_URL = 'https://ferredip.com.mx';

// Rutas reales que no aportan a la indexación (o son de administración).
const RUTAS_BLOQUEADAS = [
  '/api/',
  '/resultados/', // búsqueda interna: contenido delgado / duplicado
  '/carrito-de-compra',
  '/compra/', // checkout y páginas de resultado de pago
  '/productos/relacionados', // única ruta de administración real
];

// Crawlers de motores de IA — se permiten explícitamente (tanto los de búsqueda
// como los de entrenamiento): el catálogo ya es público y el objetivo del sitio
// es aparecer citado. Hoy no hay nada que proteger, así que no se separan.
const BOTS_IA = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'cohere-ai',
  'YouBot',
  'Diffbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: RUTAS_BLOQUEADAS,
      },
      ...BOTS_IA.map((userAgent) => ({
        userAgent,
        allow: '/',
      })),
    ],
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/products.xml`],
  };
}
