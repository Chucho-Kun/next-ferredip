import Link from 'next/link';

export default function TerminosYCondicionesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Título */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Términos y Condiciones
          </h1>
          <p className="text-gray-600">Última actualización: Mayo 2026</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 prose prose-lg max-w-none">
          
          <h2 className="text-2xl font-bold text-gray-800 mt-10 mb-4">Envíos</h2>
          <p>
            Envíos gratis sólo aplican en compras mayores a <strong>$5,000 MXN</strong> (Solo aplica para CDMX y Área Metropolitana, únicamente a compras hechas en www.dipemsa.com.mx).
          </p>
          <p className="mt-4">
            En caso de requerir envío a otro estado de la república o las zonas no mencionadas, favor de cotizar con el equipo de ventas.
          </p>
          <p></p>
              {/* <p><span className="font-semibold">(55) 8751 2193</span></p>
              <p><span className="font-semibold">(55) 8751 2194</span></p>
              <p><span className="font-semibold">(55) 5770 8512</span></p> */}
              <p>WhatsApp: <span className="font-semibold">55 7347 6687</span></p>

          <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">Política de Aceptación de Órdenes</h2>
          <p>
            El recibo de un formulario electrónico o de otro tipo de confirmación de pedido no significa nuestra aceptación de su pedido, ni constituye una confirmación de nuestra oferta de venta.
          </p>
          <p className="mt-4">
            DIPEMSA se reserva el derecho en cualquier momento después de recibir su orden de aceptar o rechazar su pedido por cualquier razón.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">Productos Agotados o Fuera de Existencia</h2>
          <p>
            Sus productos se enviarán cuando estén disponibles. Puede haber momentos en que el producto que ha ordenado esté fuera de stock. 
            Le mantendremos informado para proponerle cambios o informarle tiempos estimados de llegada.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">Cambios y Devoluciones</h2>
          
          <ul className="list-disc pl-6 space-y-4 text-gray-700">
            <li>
              En producto dañado se debe revisar correctamente el material al recibirlo. Si está dañado, debe reportarlo en el momento al chofer o al vendedor. 
              Una vez descargado el material no habrá cambios.
            </li>
            <li>
              No se aceptan cambios ni devoluciones en: Plafones, suspensión, polvos, aislantes, químicos epóxicos, resinas, cempanel, productos de fabricación especial o descontinuados.
            </li>
            <li>
              Para productos permitidos se contará de 1 a 3 días naturales a partir de la recepción para cambios. De 4 a 6 días se recibirán pero a precio de proveedor. 
              Después de 7 días no se aceptarán cambios.
            </li>
            <li>
              No contamos con devoluciones en efectivo, transferencia o cheque. Se otorgará una nota de crédito vigente por máximo 30 días naturales.
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">Impuestos</h2>
          <p>
            Nuestra tienda automáticamente cargará y retendrá los impuestos definidos por la ley Hacendaria vigente (I.V.A. del 16%).
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-12 mb-4">Facturación</h2>
          <p>
            Para generar su factura es necesario ingresar los datos correctos al momento de la generación de su pedido. 
            En caso de no contar con los datos completos al momento de la compra, solo se podrá solicitar la factura durante el mes correspondiente a la compra.
          </p>

          <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>DIPEMSA • Todos los derechos reservados © 2026</p>
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