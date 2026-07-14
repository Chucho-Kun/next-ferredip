// app/(public)/contacto/ContactoClient.tsx
'use client';

import { sendContactEmail } from "@/src/actions/contact";
import { whatsAppNumber } from "@/src/shared/db/contact-info";
import Link from "next/link";
import React, { useState, useRef } from "react";

export default function ContactoClient() {
  const [status, setStatus] = useState<{ success?: boolean; message?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const mensaje = formData.get('mensaje') as string;

    const consulta = `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${encodeURIComponent(`
*Nombre:* ${nombre}
*Email:* ${email}
*Mensaje:*
${mensaje}`)}`;

    window.open(consulta, '_blank');
  };

  return (
    <section className="bg-gray-100 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          CONTÁCTANOS
        </h2>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* Columna Izquierda - Información */}
          <div className="space-y-8">
            <div>
              <h3 className="text-orange-600 font-bold text-xl mb-6">CONTACTO</h3>
              <div className="space-y-4 text-gray-700">
                {/* <p><strong>Teléfono:</strong> (55) 8751 2193</p>
                <p><strong>Teléfono:</strong> (55) 8751 2194</p>
                <p><strong>Teléfono:</strong> (55) 5770 8512</p> */}
                <p><strong>WhatsApp:</strong>55 7347 6687</p>
                <p><strong>Correo:</strong>contacto@ferredip.com.mx</p>
              </div>
            </div>
            <div>
              <p className="text-orange-600 font-bold text-lg leading-tight">
                REALIZAMOS ENTREGAS A TODA<br />
                LA REPÚBLICA MEXICANA
              </p>
            </div>

            <div className="flex gap-4">
              {/* <Link href={'tel:5587512193'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/phone.svg'} alt="teléfono" />
              </Link>
              <Link href={'https://wa.me/5573476687'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/whatsapp.svg'} alt="whatsapp" />
              </Link>
              <Link href={'https://www.facebook.com/Dipemsa/'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/facebook.svg'} alt="facebook" />
              </Link>
              <Link href={'https://www.tiktok.com/@dipemsa_construccionlig'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/tiktok.svg'} alt="tiktok" />
              </Link>
              <Link href={'https://www.instagram.com/dipemsa_/'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/instagram.svg'} alt="instagram" />
              </Link>
              <Link href={'https://www.youtube.com/@DIPEMSACONSTRUCCIONLIGERA'} target='_blank' className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition">
                <img width={25} height={25} src={'/icons/youtube.svg'} alt="youtube" />
              </Link> */}
            </div>
          </div>

          {/* Columna Derecha - Formulario */}
          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre Completo:"
                  required
                  className="w-full border border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Correo Electrónico:"
                  required
                  className="w-full border border-gray-300 rounded-xl px-5 py-4 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <div>
                <textarea
                  name="mensaje"
                  placeholder="Mensaje:"
                  rows={6}
                  required
                  className="w-full border border-gray-300 rounded-2xl px-5 py-4 focus:outline-none focus:border-orange-500 transition resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1E2937] hover:bg-black disabled:bg-gray-400 text-white font-semibold py-4 rounded-2xl transition text-lg flex items-center justify-center"
              >
                {isLoading ? "ENVIANDO..." : "ENVIAR MENSAJE"}
              </button>
              {status.message && (
                <p className={`text-center mt-4 font-medium ${status.success ? 'text-green-600' : 'text-red-600'}`}>
                  {status.message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}