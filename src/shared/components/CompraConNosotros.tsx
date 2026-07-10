import { Handshake, Truck, ShoppingCart, ShieldCheck, Package } from 'lucide-react';

const beneficios = [
  {
    icon: Handshake,
    titulo: "Calidad y Servicio",
    descripcion: "Somos distribuidores autorizados de marcas reconocidas a nivel mundial",
  },
  {
    icon: Truck,
    titulo: "Entregas Inmediatas",
    descripcion: "Contamos con una excelente política de entregas rápidas",
  },
  {
    icon: Package,
    titulo: "Envíos Prácticos",
    descripcion: "Realizamos entregas directo a obra y domicilio",
  },
  {
    icon: ShoppingCart,
    titulo: "Variedad de Productos",
    descripcion: "Amplia gama de materiales en nuestro catálogo",
  },
  {
    icon: ShieldCheck,
    titulo: "Pagos Seguros",
    descripcion: "Contamos con diversos medios de pago certificados con instituciones bancarias oficiales",
  },
];

export default function CompraConNosotros() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          ¿POR QUÉ COMPRAR CON NOSOTROS?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {beneficios.map((beneficio, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-8 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                <beneficio.icon 
                  size={42} 
                  className="text-[#FF5E00]" 
                />
              </div>

              <h3 className="font-bold text-xl text-gray-800 mb-3">
                {beneficio.titulo}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {beneficio.descripcion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}