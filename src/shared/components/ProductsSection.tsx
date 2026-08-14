import Image from "next/image"
import { ProductosType } from "../db/productos"
import Link from "next/link"

type Props = {
    productos: ProductosType[]
}

export default function ProductsSection({productos}: Props) {
  return (
    <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 cursor-pointer">
          {productos.map((producto, index) => (
          <Link key={index} href={ `/categoria/${ producto.name }` }>
                <div
                key={index}
                className="group bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                >
                  {/* Imagen */}
                  <div className="relative h-48 bg-gray-200">
                    <Image
                      src={producto.src}
                      alt={producto.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      />
                  </div>

                  {/* Nombre del producto */}
                  <div className="p-5 text-center">
                    <h3 className="font-semibold text-gray-800 text-lg leading-tight uppercase">
                      {producto.name.replaceAll('-', ' ') }
                    </h3>
                  </div>
                </div>
          </Link>
          ))}
        </div>
    </>
  )
}
