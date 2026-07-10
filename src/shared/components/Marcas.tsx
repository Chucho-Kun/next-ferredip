import { marcas } from '@/src/shared/db/marcas';
import Image from 'next/image';
import Link from 'next/link';



export default function Marcas() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
          MARCAS
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {marcas.map((marca, index) => (
            <Link key={index} href={ `/marca/${ marca.name }`} >
              <div
                className="group bg-white rounded-2xl p-6 flex items-center justify-center aspect-square border border-gray-100 hover:border-[#FF5E00] hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                <div className="relative w-full h-full flex items-center justify-center cursor-pointer">
                  <Image
                    src={marca.src}
                    alt={marca.name}
                    fill
                    className="object-contain grayscale-0 lg:grayscale lg:group-hover:grayscale-0 transition-all duration-300"
                    sizes='(max-width: 768px) 100vw, 180px'
                    />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}