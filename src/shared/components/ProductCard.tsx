'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, Minus, Plus, ShoppingCart } from 'lucide-react';
import { RelatedProductType, ResultadosType, VariantOptionType } from '../db/resultados';
import Link from 'next/link';
import { whatsAppNumber } from '../db/contact-info';
import { useCartStore } from '@/src/store/cartStore';
import toast from 'react-hot-toast';
import RelatedProducts from './RelatedProducts';
import ProductImageZoom from './ProductImageZoom';
import { slugify } from '@/src/utils/slugify';
import { pushEcommerce, toGA4Item, itemsValue, CURRENCY } from '@/src/utils/gtm';
import { totalxcantidad, formatPrecio } from '@/src/utils/formatPrice';
import { fotoPrincipal, fotoPrincipalThumb, fotoPrincipalZoom, LOGO_SRC, FotoAdicional } from '@/src/utils/fotos';

type FotoGaleria = {
  src: string;      // lo que ve el usuario a 366 px (800px, CDN)
  thumb: string;    // botones de la galería, 72px (160px, CDN)
  zoomSrc: string;  // lo que consume la lente / el lightbox del SPEC 03 (original, CDN)
}

type Props = {
  producto: ResultadosType
  productosVariantes: RelatedProductType[]
  variantes: VariantOptionType[]
  fotosAdicionales: FotoAdicional[]
}

export default function ProductCard({producto, productosVariantes, variantes, fotosAdicionales}: Props) {
  const { addToCart, totalItems } = useCartStore()
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // La navegación entre variantes reutiliza esta misma instancia del componente
  // (mismo segmento de ruta), así que el estado de la imagen se ajusta durante
  // el render cuando cambia producto.id, en vez de depender de un remount.
  const [renderedId, setRenderedId] = useState(producto.id);
  const [imgSrc, setImgSrc] = useState(() => fotoPrincipal(producto.id ?? ''));
  // 0 = foto principal; 1..n = posición dentro de fotosAdicionales
  const [fotoActiva, setFotoActiva] = useState(0);
  if (producto.id !== renderedId) {
    setRenderedId(producto.id);
    setImgSrc(fotoPrincipal(producto.id ?? ''));
    setFotoActiva(0);
  }

  const handleImageError = () => {
    if (imgSrc !== LOGO_SRC) setImgSrc(LOGO_SRC);
  };

  // Una foto adicional rota vuelve a la principal en vez de caer al logo:
  // el logo es el fallback de "no hay foto", no de "esta foto en particular falló".
  const handleFotoActualError = () => {
    if (fotoActiva === 0) {
      handleImageError();
    } else {
      setFotoActiva(0);
    }
  };

  const fotoGaleria: FotoGaleria[] = [
    {
      src: imgSrc,
      thumb: imgSrc === LOGO_SRC ? LOGO_SRC : fotoPrincipalThumb(producto.id ?? ''),
      zoomSrc: fotoPrincipalZoom(producto.id ?? ''),
    },
    ...fotosAdicionales.map((foto) => ({ src: foto.src, thumb: foto.thumb, zoomSrc: foto.zoom })),
  ];
  const fotoActual = fotoGaleria[fotoActiva] ?? fotoGaleria[0];

  const [ titulo, detalle ] = producto.descripcion
                                                ?.split('|')
                                                .map(parte => parte.replace(/"/g, '').trim()) ?? []

  // Dependencia [producto.id], no solo montaje: la navegación entre variantes
  // reutiliza esta misma instancia sin remount (ver comentario arriba).
  // lastViewedId evita el view_item duplicado del doble-invoke de efectos en
  // React Strict Mode (solo en dev) sin bloquear el evento al cambiar de variante.
  const lastViewedId = useRef<string | null>(null);
  useEffect(() => {
    if (!producto.id || lastViewedId.current === producto.id) return;
    lastViewedId.current = producto.id;

    const item = toGA4Item({
      id: producto.id,
      descripcion: producto.descripcion ?? '',
      precio: producto.precio ?? '',
      marca: producto.marca,
      categoria: producto.categoria,
    });

    pushEcommerce('view_item', {
      currency: CURRENCY,
      value: item.price,
      items: [item],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto.id]);

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seleccionada = variantes.find(v => v.id === e.target.value);
    if (!seleccionada || seleccionada.id === producto.id) return;

    startTransition(() => {
      router.push(`/producto/${seleccionada.id}/${slugify(seleccionada.descripcion ?? '')}`);
    });
  };


  const increase = () => setQuantity(prev => Math.min(prev + 1, 999));
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  // Nueva función para manejar input manual
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Solo permitir números
    if (!/^\d*$/.test(value)) return;

    let newQuantity = parseInt(value) || 1;

    // Limitar entre 1 y 999
    if (newQuantity > 999) newQuantity = 999;
    if (newQuantity < 1) newQuantity = 1;

    setQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    addToCart({
      id: producto.id || "",
      titulo: titulo,
      descripcion: detalle,
      precioant: producto.precioant || "",
      precio: producto.precio || "",
      clave: producto.clave || "",
      cantidad: quantity,
      marca: producto.marca || ""
    })

    const item = toGA4Item({
      id: producto.id ?? '',
      descripcion: producto.descripcion ?? '',
      precio: producto.precio ?? '',
      marca: producto.marca,
      categoria: producto.categoria,
    }, { quantity });

    pushEcommerce('add_to_cart', {
      currency: CURRENCY,
      value: itemsValue([item]),
      items: [item],
    });

    toast.success(
      <div>{ quantity } pieza{ quantity > 1 && ('s')} de <span className='font-bold'>{ titulo }</span> se { quantity > 1 ? ('agregaron') : ('agregó') } al carrito</div>
    ,{
      position: 'top-center',
      duration: 4000,
    }); 
    
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">

        {/* Imagen del producto */}
        <div className="flex flex-col items-center relative bg-white">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-8 font-bold">
            <Link
              className='hover:underline'
              href="/" >HOME</Link> &gt;{' '}
            <Link
              className='hover:underline' 
              href={`/marca/${ producto.marca?.toLowerCase().replaceAll(' ','-') }` } >{ producto.marca?.toUpperCase() }</Link>

            { producto.categoria && (
              <>
                <span> &gt; </span> 
                <Link href={
                    `/categoria/${ producto.categoria
                                                    ?.normalize("NFD")
                                                    .replace(/[\u0300-\u036f]/g, "")
                                                    .toLowerCase()
                                                    .replaceAll(' ','-') }
                  `}>
                  <span className="text-orange-600 font-bold hover:underline">{ producto.categoria?.toUpperCase() }</span>
                </Link> 
              </>
            ) }
          </nav>
          <ProductImageZoom
            key={`${producto.id}-${fotoActiva}`}
            zoomSrc={fotoActual.zoomSrc}
            src={fotoActual.src}
            alt={producto.descripcion || ''}
            onError={handleFotoActualError}
          />

          {fotosAdicionales.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {fotoGaleria.map((foto, i) => (
                <button
                  key={foto.src}
                  type="button"
                  onClick={() => setFotoActiva(i)}
                  aria-label={`Ver foto ${i + 1} de ${fotoGaleria.length}`}
                  aria-current={fotoActiva === i}
                  className={`relative w-[72px] h-[72px] shrink-0 overflow-hidden border-2 ${
                    fotoActiva === i ? 'border-[#FF5E00]' : 'border-gray-200'
                  }`}
                >
                  <Image src={foto.thumb} alt="" fill unoptimized className="object-cover" sizes="72px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-800 leading-tight">
            { producto.descripcion?.split('|')[0]}
          </h1>
          { variantes.length > 1 ? (
            <div>
              <label htmlFor="variante-select" className="text-sm text-gray-500 block mb-1">
                { variantes.length } variantes disponibles
              </label>
              <select
                id="variante-select"
                value={producto.id ?? ''}
                onChange={handleVariantChange}
                disabled={isPending}
                className="w-full border border-gray-300 px-4 py-3 text-lg font-bold text-gray-600 focus:outline-none focus:border-[#FF5E00] cursor-pointer disabled:opacity-50"
              >
                {variantes.map((v) => (
                  <option key={v.id} value={v.id ?? ''}>
                    {v.descripcion?.split('|')[1]?.trim() || v.descripcion}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-gray-600 text-xl font-bold">{ detalle }</p>
          )}
          <p className="text-gray-600 text-xl">Código: { producto.id}</p>
           {/* Descripción */}
          <div>
            <p className="text-gray-700 leading-relaxed">
              { producto.informacion }
            </p>
          </div>

          {/* VER FICHA TECNICA */}
          { producto.ficha && (
            <div>
              <a
                href={producto.ficha}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#0033A0] hover:bg-[#002280] text-white font-semibold px-5 py-2.5 rounded-lg transition"
                >
                <Eye size={18} />
                Ver ficha técnica
              </a>
              </div>
          )}

          {/* Precios */}
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-[#E30613]">${ totalxcantidad(producto.precio ?? '', quantity) }</span>
            { producto.precioant && (
              <span className="text-2xl line-through text-gray-400">${ formatPrecio(producto.precioant) }</span>
            ) }
          </div>

          <div className="inline-block bg-gray-200 text-gray-600 text-sm font-bold px-5 py-2 rounded">
            IVA INCLUIDO
          </div>

          {/* Selector de cantidad */}
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Cantidad:</span>
            <div className="flex items-center border border-gray-300 rounded-xl">
              <button 
                onClick={decrease}
                className="px-4 py-3 hover:bg-gray-100 transition"
              >
                <Minus size={18} />
              </button>

              {/* Input editable */}
                <input
                  type="text"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-16 text-center py-3 font-semibold border-x border-gray-300 focus:outline-none focus:border-orange-500"
                  maxLength={3}
                />
              
              <button 
                onClick={increase}
                className="px-4 py-3 hover:bg-gray-100 transition"
              >
                <Plus size={18} />
              </button>
            </div>
            <span className="text-sm text-gray-500">máx. 999</span>
          </div>

          {/* Botón Agregar al carrito */}
          <button 
            onClick={ handleAddToCart }
            className="w-full bg-[#0033A0] hover:bg-[#002280] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition text-lg"
          >
            <ShoppingCart size={24} />
            AGREGAR AL CARRITO
          </button>

          {/* BOTON DE WHATSAPP */}
          {/* <div className="p-5 pt-0 mt-auto">
            <Link 
                href={ `https://api.whatsapp.com/send?phone=${whatsAppNumber}&text=${
                    encodeURIComponent(`Hola me interesa cotizar *${ 
                      producto.descripcion?.split('|')[0].trim()
                      }* ${
                      producto.descripcion?.split('|')[1]
                      } - [${ producto.id }]`)}` 
                  }
                className="bg-[#FF5E00] hover:bg-[#E30613] text-white font-bold px-6 py-2 w-50 rounded-lg flex items-center gap-2 transition text-sm whitespace-nowrap">
              COTIZA AHORA
              <span className="text-xl">
                <Image 
                  src={'/icons/whatsapp.svg'}
                  alt="whatsapp icon"
                  width={25}
                  height={25}
                />
              </span>
            </Link>
          </div> */}

          
        </div>
      </div>
          <RelatedProducts relacionados={ productosVariantes } orden={ producto.related_products } />
    </div>
  );
}