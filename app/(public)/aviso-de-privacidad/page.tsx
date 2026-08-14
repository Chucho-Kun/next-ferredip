import Link from 'next/link';

export default function AvisoDePrivacidad() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Título */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Aviso de Privacidad
          </h1>
          <p className="text-gray-600">Última actualización: Mayo 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 prose prose-lg max-w-none leading-relaxed">
          
          
          <p>
            DIPEMSA con domicilio en Av. vía Morelos, Cerezo 77A, Boulevares Impala, 55040 Ecatepec de Morelos, Méx. Estado de México es quien comercializa los productos ofrecidos en esta Página. Toda transacción realizada a través de la Página, se sujetará a los términos y condiciones aquí expresados.
          </p>

          <p className="mt-6">
          Tu privacidad es muy importante para DIPEMSA ,ponemos a tu disposición este Aviso de Privacidad de Datos Personales, mismo que describe, solicita y trata tus Datos Personales
          </p>

          <h3 className="text-xl font-semibold mt-10 mb-4">Datos Personales que Recabamos</h3>
          <p>
            Al momento de proporcionarnos tus datos a través de nuestra página web, tiendas físicas 
            o centro de atención al cliente, recabamos los siguientes datos personales:
          </p>
          
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>Nombre completo</li>
            <li>Domicilio</li>
            <li>Teléfono</li>
            <li>Correo electrónico</li>
            <li>Datos fiscales (para facturación)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-10 mb-4">Finalidad del Tratamiento</h3>
          <p>
            Tus datos personales serán utilizados para las siguientes finalidades:
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>Procesar tus pedidos y transacciones</li>
            <li>Proporcionar atención al cliente</li>
            <li>Enviar confirmaciones de compra y seguimiento de envíos</li>
            <li>Generar facturación electrónica</li>
            <li>Mejorar nuestros productos y servicios</li>
          </ul>

          <h3 className="text-xl font-semibold mt-10 mb-4">Datos Financieros</h3>
          <p>
            Los datos personales financieros enviados a través de nuestro sitio de Internet son tratados 
            por una institución bancaria o un tercero quien procesa dichas transferencias electrónicas. 
            En este sentido, deben tratar tus datos personales conforme a su propio aviso de privacidad.
          </p>

          <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
            <p>
              DIPEMSA se compromete a proteger tus datos personales y a cumplir con todas las 
              disposiciones legales aplicables en materia de protección de datos personales en México.
            </p>
          </div>
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