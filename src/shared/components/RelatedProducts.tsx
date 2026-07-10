import Image from "next/image";
import Link from "next/link";
import { RelatedProductType } from "../db/resultados";
import { slugify } from "@/src/utils/slugify";

type RelatedProductsProps = {
    relacionados: RelatedProductType[];
    orden: string[] | null
}

export default function RelatedProducts({ relacionados, orden }: RelatedProductsProps ) {
    
    if(!relacionados || relacionados.length === 0) {
        return null;
    }

    const orderMap = new Map( orden?.map(( id, index ) => [id, index]) )
    // Ordenar los productos según el orden del array
    const relacionadosOrdenados = [...relacionados].sort((a, b) => {
        const orderA = orderMap.get(a.id!) ?? 999;
        const orderB = orderMap.get(b.id!) ?? 999;
        return orderA - orderB;
    });   
    
  return (
        <section className="mt-20">
            <h2 className="text-4xl font-bold text-gray-800 mb-8 uppercase text-center">
                Productos relacionados
            </h2>

            <div className="overflow-x-auto">
                <div className="flex gap-6 p-2">
                {relacionadosOrdenados.map((producto) => {

                    const [ nombre, detalles ] = producto.descripcion!
                    .split("|")
                    .map( txt  => txt.replaceAll(/"/g, "").trim())

                    return(
                        <div key={producto.id} className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] xl:flex-[0_0_25%] min-w-0">
                            <div className="bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                            
                            {/* Badge */}
                            { producto.destacado && (
                                <div className="bg-[#FF5E00] text-white text-xs font-bold px-4 py-1 w-fit">
                                    PRODUCTO RECOMENDADO
                                </div>
                            ) }

                            {/* Imagen */}
                            <div className="relative h-52 bg-white flex items-center justify-center p-6 overflow-hidden rounded-t-2xl">
                                <Image
                                src= {`/fotos/${producto.id}.jpg`}
                                alt={ nombre }
                                fill
                                className="object-contain hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                />
                            </div>

                            {/* Información */}
                            <div className="p-5 flex-1 flex flex-col">
                                <p className="text-sm font-medium text-gray-500 uppercase">{producto.marca}</p>
                                <h3 className="font-semibold text-lg leading-tight mt-1 mb-2">
                                { nombre }
                                </h3>
                                <p className="text-sm text-gray-600">{ detalles }</p>

                                <div className="mt-auto pt-4">
                                <div className="flex items-baseline gap-2">
                                    { producto.precioant && (
                                    <span className="line-through text-gray-400 text-sm">
                                        { producto.precioant }
                                    </span>
                                    )}
                                    <span className="text-2xl font-bold text-[#E30613]">
                                    {producto.precio}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">CLAVE: {producto.clave}</p>
                                </div>
                                {/* ${ producto.id }/${ slugify( producto.descripcion! )  */}
                                <Link href={`/producto/${ producto.id }/${ slugify( producto.descripcion! ) }`
                                    }>
                                    <button className="mt-5 w-full bg-[#1E2937] hover:bg-black text-white font-semibold py-3 transition">
                                    VER PRODUCTO
                                    </button>
                                </Link>
                            </div>
                            </div>
                        </div>
                        )}
                )}
                </div>
            </div>
        </section>
  )
}
