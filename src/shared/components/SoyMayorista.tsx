import Image from 'next/image';
import Link from 'next/link';
import { whatsAppNumber } from '../db/contact-info';

export default function SoyMayorista() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-800">SOY MAYORISTA</h2>
          <div className="text-xl font-bold text-gray-600 mt-3">¡FORMA PARTE DE NUESTRO EQUIPO!</div>
          <p className="text-gray-600 mt-3 w-150 mx-auto text-left text-lg">
            En DIPEMSA estamos comprometidos contigo, por eso te presentamos nuestro programa de afiliación para mayoristas y constructores, a fin de que obtengas los mejores precios y beneficios.
          </p>
        </div>

         <div>
          <Image
              src="/constructor.jpeg"
              width={699}
              height={892}
              alt="Equipo Mayorista Dipemsa"
              className="object-cover mx-auto rounded-2xl"
              sizes="(max-width: 768px) 100vw, 1200px"
            />
         </div>

        

        {/* Beneficios */}
        <div className="mt-10 max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
          <h5 className="font-bold text-xl mb-6 text-center md:text-left">BENEFICIOS</h5>
          
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-orange-600 text-xl mt-0.5">•</span>
              <span>Precios Preferenciales</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-600 text-xl mt-0.5">•</span>
              <span>Atención rápida y personalizada</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-600 text-xl mt-0.5">•</span>
              <span>Privilegios directos a obra</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-600 text-xl mt-0.5">•</span>
              <span>Cursos de instalación</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-600 text-xl mt-0.5">•</span>
              <span>Convenios directos con fabricantes</span>
            </li>
          </ul>
        </div>

        {/* Botón principal */}
        <div className="flex justify-center mt-10">
          <Link
           href={ `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${ encodeURIComponent('Hola me intereza conocer más del programa de mayoristas y constructores') }`}
           className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg px-10 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl">
            QUIERO SER PARTE DEL PROGRAMA DE MAYORISTAS Y CONSTRUCTORES
          </Link>
        </div>
      </div>
    </section>
  );
}