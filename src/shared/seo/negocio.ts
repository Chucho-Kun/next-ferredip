/**
 * Fuente única de los datos del negocio para el marcado estructurado (SEO / AIO).
 *
 * Mismo criterio que `src/shared/db/contact-info.ts` con el número de WhatsApp:
 * un solo lugar donde viven los datos, para que el JSON-LD, `llms.txt`, `robots`
 * y `feed.xml` no se desincronicen entre sí ni con `/terminos-y-condiciones`.
 *
 * Los valores salen del JSON-LD que vivía inline en `app/(public)/page.tsx`
 * (fuente autoritativa del NAP) y de `/terminos-y-condiciones` (política real de
 * envío y devolución).
 */

export const NEGOCIO = {
  nombre: 'Ferredip',
  descripcion:
    'Somos Ferredip una empresa distribuidora de herramientas, contamos con las mejores marcas y stock siempre en existencia. Surtimos desde una pieza hasta una obra completa.',
  url: 'https://ferredip.com.mx',
  logo: 'https://ferredip.com.mx/logo.webp',
  imagen: 'https://ferredip.com.mx/nuevologo.jpg',
  telefono: '+52-55-9236-8879',
  email: 'truperdipemsa@gmail.com',
  rangoPrecio: '$$',
  pagos: ['Cash', 'Credit Card', 'Transferencia', 'Mercado Pago'],
  sameAs: [
    'https://www.facebook.com/FerreDipPiramides/',
    'https://www.tiktok.com/@ferredip.tequisis',
  ],
} as const;

export const SUCURSALES = [
  {
    nombre: 'FERREDIP PIRAMIDES',
    calle: 'Carr. Mexico tulancingo Lote kilometro 27-5',
    localidad: 'Teotihuacán de Arista',
    region: 'Estado de México',
    cp: '55800',
    geo: { lat: 19.692939433412597, lng: -98.8239674153464 },
    telefono: '+52-55-7329-0946',
  },
  {
    nombre: 'FERREDIP TEQUISISTLAN',
    calle: 'Carretera Federal Lechería-Los Reyes km.34 Ejidos de Tequisistlán',
    localidad: 'Tequisistlán',
    region: 'Estado de México',
    cp: '56020',
    geo: { lat: 19.58853677394558, lng: -98.92532129999836 },
    telefono: '+52-55-6895-3906',
  },
] as const;

// Horario común a las dos sucursales: Lunes a Domingo 08:30–18:00.
export const HORARIO = { dias: 'Mo-Su', abre: '08:30', cierra: '18:00' } as const;

// Refleja lo que dice /terminos-y-condiciones, no lo que decía el JSON-LD viejo.
export const ENVIO = {
  umbralGratis: 5000, // MXN — mismo valor que usa src/store/cartStore.ts
  regionGratis: 'CDMX y Área Metropolitana',
  pais: 'MX',
  handlingDias: { min: 1, max: 2 },
  transitoDias: { min: 1, max: 3 },
} as const;

export const DEVOLUCION = {
  diasCambio: 3, // «de 1 a 3 días naturales» en los términos
  metodo: 'ReturnInStore', // reportar con el chofer o en tienda, no por paquetería
  reembolso: 'StoreCredit', // nota de crédito, no efectivo
  vigenciaNotaCreditoDias: 30,
} as const;
