import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#3C2F2F] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Columna 1 - Logo y Contacto */}
          <div className="lg:col-span-4">
            <div className="mb-2">
              <img width={200} height={70} src="/logoBlanco.svg" alt="Logo Footer Dipemsa" />
              {/* <Image
                src={'/logoBlanco.webp'}
                alt='Logo Transparente DIPEMSA'
                width={136}
                height={34}
                loading='lazy'
                className="ml-6 h-auto w-50"
                sizes="(max-width: 768px) 100vw, 200px"
              /> */}
            </div>
            
            <div className="space-y-3 text-sm">
              <p className="font-medium">Atención telefónica inmediata</p>
              <p>Números Fijos:</p>
              <p><span className="font-semibold">(55) 8751 2193</span></p>
              <p><span className="font-semibold">(55) 8751 2194</span></p>
              <p><span className="font-semibold">(55) 5770 8512</span></p>
              <p>WhatsApp: <span className="font-semibold">55 3265 1039</span></p>
              <p>E-mail: <span className="font-semibold">contacto@dipemsa.com.mx</span></p>
            </div>

            {/* Redes Sociales */}
            <div className="flex gap-4 mt-8">
              {/* <Link href={'tel:5587512193'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='llamar a sucursal' width={25} height={25} src={'/icons/phone.svg'} alt='icono telefono'/>
              </Link> */}
              <Link href={'https://wa.me/5532651039'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='whatsapp de sucursal' className='hove:text-yellow-300' width={25} height={25} src={'/icons/whatsapp.svg'} alt='icono whatsApp' />
              </Link>
              <Link href={'https://www.facebook.com/Dipemsa/'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='facebook de sucursal' width={25} height={25} src={'/icons/facebook.svg'} alt='icono facebook' />
              </Link>
              <Link href={'https://www.tiktok.com/@dipemsa_construccionlig'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='cuenta de tiktok de Dipemsa' width={25} height={25} src={'/icons/tiktok.svg'} alt='icono tiktok' />
              </Link>
              <Link href={'https://www.instagram.com/dipemsa_/'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='cuenta de tiktok de Dipemsa' width={25} height={25} src={'/icons/instagram.svg'} alt='icono instagram' />
              </Link>
              <Link href={'https://www.youtube.com/@DIPEMSACONSTRUCCIONLIGERA'} target='_blank' className='p-2 rounded-full hover:bg-taupe-800 transition'>
                <img aria-label='cuenta de tiktok de Dipemsa' width={25} height={25} src={'/icons/youtube.svg'} alt='icono youtube' />
              </Link>
              
            </div>
          </div>

          {/* Columna 2 - Nosotros */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-lg mb-4">NOSOTROS</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link className="text-bold hover:text-orange-400 transition" href={'/aviso-de-privacidad'} >Aviso de Privacidad</Link>
              </li>
              <li>
                <Link className="text-bold hover:text-orange-400 transition" href={'/terminos-y-condiciones'} >Términos y Condiciones</Link>
              </li>
              {/* <li>
                <Link className="text-bold hover:text-orange-400 transition" href={''} >Quejas y Sugerencias</Link>
              </li> */}
              <li>
                <Link className="text-bold text-yellow-300 hover:text-orange-400 transition" target='_blank' href={'https://www.mercadolibre.com.mx/pagina/dipemsa5699#origin=search_intervention&tracking_id=4f8a91a2-cb77-43cb-984d-fe7bde46fe18'} >Tienda Oficial Mercado Libre</Link>
              </li>
            </ul>
          </div>

          {/* Columna 3 - Servicios */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-lg mb-4">SERVICIOS</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link className="text-bold hover:text-orange-400 transition" target='_blank' href={'/catalogos/CATALOGO2026ABRIL.pdf'} >Descargar Catálogo</Link>
              </li>
            </ul>
          </div>

          {/* Columna 4 - Sucursales */}
          <div className="lg:col-span-3">
            <h3 className="font-bold text-lg mb-4">SUCURSALES</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a target='_blank' href="https://maps.app.goo.gl/aqPXQ5Sps8bKK4cH9">Dipemsa Tienda Ecatepec</a> 
              </li>
              <li>
                <a target='_blank' href="https://maps.app.goo.gl/Kp5r6WprytYoe1Sy9">Dipemsa Tienda Texcoco</a> 
              </li>
              <li>
                <a target='_blank' href="https://g.co/kgs/eUHZMV">Dipemsa CEDIS</a> 
              </li>
            </ul>

            <div className="mt-8">
              <p className="font-bold text-lg">2026 DIPEMSA</p>
              <p className="text-sm text-gray-400">TODOS LOS DERECHOS RESERVADOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Bar */}
      <div className="bg-white py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-8 md:gap-12">
          <Image
            src={'/formas-de-pago.jpeg'}
            width={696}
            height={82}
            alt='Formas de Pago'
            loading='lazy'
          />
        </div>
      </div>
    </footer>
  );
}