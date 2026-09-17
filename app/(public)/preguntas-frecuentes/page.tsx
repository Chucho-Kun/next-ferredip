import Link from 'next/link';
import { Metadata } from 'next';
import { FAQ } from '@/src/shared/seo/negocio';
import { faqJsonLd } from '@/src/shared/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Ferredip | Preguntas Frecuentes',
  description:
    'Resolvemos las dudas más comunes sobre envíos, cambios y devoluciones, métodos de pago, horarios y sucursales de Ferredip.',
  alternates: {
    canonical: 'https://ferredip.com.mx/preguntas-frecuentes',
  },
};

export default function PreguntasFrecuentesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      <div className="max-w-4xl mx-auto px-6">

        {/* Título */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Preguntas Frecuentes
          </h1>
          <p className="text-gray-600">
            Envíos, cambios y devoluciones, pagos, horarios y sucursales.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 prose prose-lg max-w-none">
          {FAQ.map((item) => (
            <div key={item.pregunta} className="mt-10 first:mt-0">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {item.pregunta}
              </h2>
              <p>{item.respuesta}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-block bg-[#FF5E00] hover:bg-[#E30613] text-white font-semibold px-8 py-3 rounded-2xl transition"
          >
            ← Regresar al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
