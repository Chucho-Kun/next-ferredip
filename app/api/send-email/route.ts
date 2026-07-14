// app/api/send-email/route.ts
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { totalxcantidad } from '@/src/utils/formatPrice';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { orderData, customerEmail, deliveryData } = await request.json();

    const subTotalReal = Math.round(Number(orderData.subtotal) * 100) / 100;
    const totalReal = Math.round(Number(orderData.total) * 100) / 100;

    const { data, error } = await resend.emails.send({
      // ← AQUÍ ES EL CAMBIO IMPORTANTE
      from: `FERREDIP WEB <avisos@noreply.ferredip.com.mx>`,

      to: [customerEmail],
      bcc: ["ventas.grupoceic@gmail.com"],
      subject: `Confirmación de compra - Orden #${orderData.paymentId}`,
      html:  `
    <html lang="es"><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css?family=Cabin:400,700" rel="stylesheet">
      <link rel="shortcut icon" href="images/favicon.ico">
      <style type="text/css">
          body{font-family: Raleway,sans-serif;margin:0px;}table{font-family: Raleway,sans-serif;border-collapse: collapse;}
          .separador{border-bottom: dotted 6px darkred;width: 80%;display: inline-block;}
          a{text-decoration:none;}
          div{ text-align: center; font-size: 14px; font-weight: bold; font-family: arial; }
          .lista-item {
              margin:5px 0px;border-bottom: 2px solid #efefef;
          }
          .lista-item:last-child {
              border-bottom:none;
          }
          .canasta {
            max-width: 500px;display: inline-block;width: 100%;border: solid 2px #efefef;padding: 1px 6px;border-radius: 10px;
          }
      </style>
      <title>Recibo de Compra</title>
      </head>
      <body style="background-color: #efefef;">
      <div style="width: 100%;text-align: center;background-color: white;">
          <img style="width: 300px;max-width: 300px;margin: 11px 0px;" src="https://www.ferredip.com.mx/logo.jpg">
          <p class="" style="background-color: #000B66;font-weight: bold;color:white;height: 40px;"></p>
      </div>

      <div style="width: 100%;text-align: center;padding-bottom:30px;">
          <table border="0" style="width: 100%;max-width: 600px;display: inline-table;text-align:center;">
          <tbody>
              <tr>
                  <td>
                      <div background-color:#efefef;="" style="border-radius: 15px;position: relative;">
                      <div class="textoStyle" style="margin-bottom:10px;text-align: center;position: relative;top: 11px;"></div>
                      <div style="background-color: white;border-radius: 15px;"><div>
      <div style="text-align:center;margin-bottom: -20px;">

          <div style="padding-top:30px;">Fecha: ${new Date().toLocaleString('es-MX')}</div>
          <div style="padding-top:30px;">Orden: ${orderData.paymentId}</div>
          <p style="font-weight:bold;font-size:18px;font-family:Cabin,sans-serif;font-style: italic;text-transform:uppercase">${ deliveryData.nombre }</p>
          <p style="font-weight:bold;font-size:16px;font-family:Cabin,sans-serif;font-style: italic;text-transform:uppercase">¡Gracias por tu compra en FERREDIP!</p>

      <div class="fichaCarrito" style="text-align: center;position: relative;text-align: center;padding: 10px;">

          <div class="canasta">
              
                ${orderData.items.map((item: any, index: number) => `
                    <div class="${ index !== orderData.items.length - 1 ? `lista-item` : `` }">
                          <table style="border-collapse: collapse; width: 100%; height: 36px;" border="0">
                          <tbody>
                              <tr style="height: 18px;">
                                  <td style="width: 25%; height: 36px;" rowspan="2">
                                      <img width="120" style="position: relative;left: 6px;border-radius: 7px;" src="https://www.ferredip.com.mx/fotos/${ item.id }.jpg">   
                                      
                                  </td>
                                  <td style="width: 25%; height: 16px;" colspan="3">
                                      <div style="font-size: 16px;font-weight: bold;">${ item.titulo }</div> 
                                      <div style="font-size:12px;font-weight: 100;">${ item.descripcion }</div>
                                  </td>
                              </tr>
                              <tr style="height: 18px;">
                                  <td style="width: 30%; height: 18px;">
                                      <div style="font-size: 14px;text-align: center;">${ item.precio } x Unidad</div>
                                  </td>
                                  <td style="width: 25%; height: 18px;">
                                      <div style="font-weight: bold;font-size: 16px;position: relative;top: 5px;">

                                          <div style="font-size: 14px;text-align: center;">${ item.cantidad } ${ item.cantidad > 1 ? `Unidades` : `Unidad` }</div>

                                      </div>
                                  </td>
                                  <td style="width: 25%; height: 18px;">
                                      <div style="color: red;font-weight: bold;font-size: 16px;text-align: center;">$${ totalxcantidad( item.precio, item.cantidad) }</div>
                                  </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                `).join('')}
              
          </div>
              <div style="text-align: right;right: 5px;position: relative;width: 100%;max-width: 500px;display: inline-block;">
                  <table width="100%" border="1" cellpadding="5" style="background-color: #efefef;font-weight: 100;border-radius: 15px;border-color: white;border: solid 1px white;">
                  <tbody>
                      <tr>
                          <td> SubTotal: </td>
                          <td width="20%">
                              <div class="subTotal preciosNormales"> $${ subTotalReal }</div>
                          </td>
                      </tr>
                      <tr>
                          <td> Costos de Envío: </td>
                          <td>
                              <div class="precioEnvio preciosNormales">$${orderData.shipping}</div>
                          </td>
                      </tr>
                      <tr>
                          <td> Monto a Pagar: </td>
                          <td>
                              <div class="sumaTotal" style="height: 36px;font-weight: bold;font-size: 19px;color: red;position: relative;top: 3px;">$${ totalReal }</div>
                          </td>
                      </tr>
                      <tr>
                          <td colspan="2">
                              <div style="font-size: 14px;">Vendedor que lo atendió:</div>
                              <div style="font-size: 12px;">www.ferredip.com.mx</div>
                          </td>
                      </tr>
                  </tbody>
                  </table>
              </div>

              <div>
                <div><table border="0" width="100%" style="max-width: 500px;background-color: #efefef;height: 320px;display: inline-table;border-radius: 14px;">
                        <tbody><tr>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">Nombre del Comprador:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.nombre } ${ deliveryData.apellidos }</div>
                        </td>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">Telefono:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.telefono }</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Dirección de entrega:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.direccion }</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Entre calles:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.entreCalles }</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Correo Electrónico del Comprador:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ customerEmail }</div>
                        </td>
                        </tr>
                        <tr>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">Ciudad / Municipio:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.ciudad }</div>
                        </td>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">CP:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ deliveryData.cp }</div>
                        </td>
                        </tr>
                        </tbody></table></div>
              </div>

              <div style="text-align: right;right: 5px;position: relative;width: 100%;max-width: 500px;display: inline-block;"></div>
      </div>
      </div>

      <div class="separador"></div>

      <img src="https://www.ferredip.com.mx/sliders/mainSlider/2.webp" width="100%" style="margin: 25px 0px;">

      </div>
      </div>
      </div>
      </div>
                  </td>
              </tr>
          </tbody>
          </table>
      </div>

        <div style="background-color: black;color: white !important;padding: 10px;text-decoration: none;text-align: center;">
            <a href="https://www.ferredip.com.mx" style="color: white !important;font-size: 14px;display: inline-block;">www.ferredip.com.mx</a>
        </div>


      </body>

      </html>
    `,
    });

    if (error) {
      console.error("❌ Error Resend:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Correo enviado correctamente:", data?.id);
    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error: any) {
    console.error("❌ Error enviando correo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}