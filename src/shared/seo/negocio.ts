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
  email: 'contacto@ferredip.com.mx',
  rangoPrecio: '$$',
  pagos: ['Credit Card', 'Mercado Pago'],
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
    // Nombre comercial alineado con el que muestra el Footer y la ficha de
    // Google Business Profile ('FERREDIP TEXCOCO'); la dirección postal real
    // sigue siendo la de Tequisistlán.
    nombre: 'FERREDIP TEXCOCO',
    calle: 'Carretera Federal Lechería-Los Reyes km.34 Ejidos de Tequisistlán',
    localidad: 'Ejidos de Tequisistlán',
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
  costoBase: 300, // MXN — tarifa plana por debajo del umbral; mismo valor que src/store/cartStore.ts
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
  exclusiones: [
    'plafones',
    'suspensión',
    'polvos',
    'aislantes',
    'químicos epóxicos',
    'resinas',
    'cempanel',
    'productos de fabricación especial o descontinuados',
  ],
} as const;

// Traducción para mostrar NEGOCIO.pagos (valores en inglés, formato schema.org)
// en la FAQ sin duplicar la lista de métodos de pago.
const PAGOS_ES: Record<(typeof NEGOCIO.pagos)[number], string> = {
  // Cash: 'efectivo',
  'Credit Card': 'tarjeta de crédito o débito',
  // Transferencia: 'transferencia bancaria',
  'Mercado Pago': 'Mercado Pago',
};

// Las 8 preguntas más comunes de un comprador, derivadas exclusivamente de las
// constantes de arriba — misma fuente que consume faqJsonLd() en jsonLd.ts,
// para que el texto visible y el marcado estructurado no se desincronicen.
export const FAQ: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Cuánto tarda mi pedido en llegar?',
    respuesta: `Preparamos tu pedido en ${ENVIO.handlingDias.min} a ${ENVIO.handlingDias.max} días hábiles, más un tiempo de tránsito de ${ENVIO.transitoDias.min} a ${ENVIO.transitoDias.max} días hábiles adicionales.`,
  },
  {
    pregunta: '¿El envío es gratis?',
    respuesta: `El envío es gratis en compras mayores a $${ENVIO.umbralGratis.toLocaleString('es-MX')} MXN, únicamente en ${ENVIO.regionGratis} y para pedidos hechos en ${NEGOCIO.url}. Fuera de esa región, o por debajo del monto, la tarifa de envío es de $${ENVIO.costoBase} MXN.`,
  },
  {
    pregunta: '¿A qué zonas del país envían?',
    respuesta:
      'Realizamos envíos a toda la República Mexicana. Para envíos a otros estados o zonas fuera de la región de envío gratis, es necesario cotizar con nuestro equipo de ventas.',
  },
  {
    pregunta: '¿Puedo devolver un producto?',
    respuesta: `No hacemos devoluciones en efectivo, transferencia ni cheque: en su lugar otorgamos una nota de crédito vigente por ${DEVOLUCION.vigenciaNotaCreditoDias} días naturales.`,
  },
  {
    pregunta: '¿Cómo hago un cambio de producto?',
    respuesta: `Los cambios se reportan con el chofer al recibir tu pedido o directamente en tienda (no por paquetería), dentro de un plazo de 1 a ${DEVOLUCION.diasCambio} días naturales desde la recepción del producto.`,
  },
  {
    pregunta: '¿Qué productos no aceptan cambios ni devoluciones?',
    respuesta: `No se aceptan cambios ni devoluciones en: ${DEVOLUCION.exclusiones.join(', ')}.`,
  },
  {
    pregunta: '¿Qué métodos de pago aceptan?',
    respuesta: `Aceptamos ${NEGOCIO.pagos.map((pago) => PAGOS_ES[pago]).join(', ')}.`,
  },
  {
    pregunta: '¿Cuál es su horario de atención y dónde están ubicados?',
    respuesta: `Atendemos de Lunes a Viernes de ${HORARIO.abre} a ${HORARIO.cierra} y Sábados de 8:30 a 13:30 pm en nuestras dos sucursales: ${SUCURSALES.map((s) => `${s.nombre} (${s.localidad})`).join(' y ')}.`,
  },
];
