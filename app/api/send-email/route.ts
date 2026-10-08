// app/api/send-email/route.ts — SPEC 18 endurecido (POST público validado)
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { formatMoney } from '@/src/utils/formatPrice';
import { fotoPrincipal } from '@/src/utils/fotos';
import { SendEmailSchema } from '@/src/shared/validation/schemas';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isOriginAllowed(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? '';
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!host) return true;
  try {
    if (origin) return new URL(origin).host === host;
    if (referer) return new URL(referer).host === host;
  } catch {
    return false;
  }
  return false;
}

const ID_RE = /^[A-Za-z0-9_-]+$/;

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    if (!isOriginAllowed(request)) {
      return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 403 });
    }

    const raw = await request.json();
    const orderData = raw?.orderData ?? {};
    const deliveryData = raw?.deliveryData ?? {};

    const itemsNorm = Array.isArray(orderData.items)
      ? (orderData.items as unknown[]).map((it: unknown) => {
          const o = (it ?? {}) as Record<string, unknown>;
          return {
            id: String(o.id ?? ''),
            titulo: String(o.titulo ?? o.title ?? 'Producto').slice(0, 120),
            quantity: Number(o.quantity ?? o.cantidad ?? 1),
          };
        })
      : [];

    const candidate = {
      customerEmail: raw?.customerEmail,
      orderData: {
        id: String(orderData.paymentId ?? orderData.id ?? ''),
        total: Number(orderData.total),
        items: itemsNorm,
      },
      deliveryData: {
        nombre: String(deliveryData.nombre ?? ''),
        direccion: String(deliveryData.direccion ?? ''),
        email: typeof deliveryData.email === 'string' && deliveryData.email ? deliveryData.email : undefined,
      },
    };

    const parsed = SendEmailSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 400 });
    }
    const input = parsed.data;

    for (const it of input.orderData.items) {
      if (it.id && !ID_RE.test(it.id)) {
        return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 400 });
      }
    }

    // Campos escapados para el HTML
    const nombreEsc = escapeHtml(String(deliveryData.nombre ?? '').slice(0, 80));
    const apellidosEsc = escapeHtml(String(deliveryData.apellidos ?? '').slice(0, 80));
    const telefonoEsc = escapeHtml(String(deliveryData.telefono ?? '').slice(0, 30));
    const direccionEsc = escapeHtml(String(deliveryData.direccion ?? '').slice(0, 200));
    const entreCallesEsc = escapeHtml(String(deliveryData.entreCalles ?? '').slice(0, 200));
    const ciudadEsc = escapeHtml(String(deliveryData.ciudad ?? '').slice(0, 100));
    const cpEsc = escapeHtml(String(deliveryData.cp ?? '').slice(0, 10));
    const customerEmailEsc = escapeHtml(input.customerEmail);
    const orderIdEsc = escapeHtml(input.orderData.id);

    const subTotalReal = Math.round(Number(orderData.subtotal ?? input.orderData.total) * 100) / 100;
    const totalReal = Math.round(Number(input.orderData.total) * 100) / 100;
    const shippingNum = Number(orderData.shipping) || 0;

    // Mapear items originales pero escapados (precios como números, texto escapado)
    const rawItems: unknown[] = Array.isArray(orderData.items) ? orderData.items : [];
    const itemsHtml = rawItems.slice(0, 50).map((item: unknown, index: number) => {
      const o = (item ?? {}) as Record<string, unknown>;
      const titulo = escapeHtml(String(o.titulo ?? o.title ?? 'Producto').slice(0, 120));
      const descripcion = escapeHtml(String(o.descripcion ?? o.description ?? '').slice(0, 500));
      const precioNum = Number(o.precio ?? o.unit_price ?? 0) || 0;
      const cantNum = Number(o.quantity ?? o.cantidad ?? 1) || 1;
      const fotoId = String(o.id ?? '');
      const fotoSrc = ID_RE.test(fotoId) ? escapeHtml(fotoPrincipal(fotoId)) : '';
      return `
                    <div class="${index !== rawItems.length - 1 ? `lista-item` : ``}">
                          <table style="border-collapse: collapse; width: 100%; height: 36px;" border="0">
                          <tbody>
                              <tr style="height: 18px;">
                                  <td style="width: 25%; height: 36px;" rowspan="2">
                                      <img width="120" style="position: relative;left: 6px;border-radius: 7px;" src="${fotoSrc}">

                                  </td>
                                  <td style="width: 25%; height: 16px;" colspan="3">
                                      <div style="font-size: 16px;font-weight: bold;">${titulo}</div>
                                      <div style="font-size:12px;font-weight: 100;">${descripcion}</div>
                                  </td>
                              </tr>
                              <tr style="height: 18px;">
                                  <td style="width: 30%; height: 18px;">
                                      <div style="font-size: 14px;text-align: center;">${precioNum} x Unidad</div>
                                  </td>
                                  <td style="width: 25%; height: 18px;">
                                      <div style="font-weight: bold;font-size: 16px;position: relative;top: 5px;">

                                          <div style="font-size: 14px;text-align: center;">${cantNum} ${cantNum > 1 ? `Unidades` : `Unidad`}</div>

                                      </div>
                                  </td>
                                  <td style="width: 25%; height: 18px;">
                                      <div style="color: red;font-weight: bold;font-size: 16px;text-align: center;">$${escapeHtml(formatMoney(precioNum * cantNum))}</div>
                                  </td>
                              </tr>
                          </tbody>
                          </table>
                      </div>
                `;
    }).join('');

    const emailSignal = AbortSignal.timeout(8000);
    const emailTimeout = new Promise<never>((_, reject) =>
      emailSignal.addEventListener('abort', () =>
        reject(new DOMException('Resend send-email timeout', 'TimeoutError')), { once: true }),
    );
    const { data, error } = await Promise.race([
      resend.emails.send({
      from: `Ferredip Web <noreply@ferredip.com.mx>`,

      to: [input.customerEmail],
      replyTo: 'contacto@ferredip.com.mx',
      bcc: ["ventas@ferredip.com.mx"],
      subject: `Confirmación de compra - Orden #${orderIdEsc}`,
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
          <img style="width: 300px;max-width: 300px;margin: 11px 0px;" src="https://ferredip.com.mx/logo.jpg">
          <p class="" style="background-color: #ff471b;font-weight: bold;color:white;height: 40px;"></p>
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

          <div style="padding-top:30px;">Fecha: ${escapeHtml(new Date().toLocaleString('es-MX'))}</div>
          <div style="padding-top:30px;">Orden: ${orderIdEsc}</div>
          <p style="font-weight:bold;font-size:18px;font-family:Cabin,sans-serif;font-style: italic;text-transform:uppercase">${nombreEsc}</p>
          <p style="font-weight:bold;font-size:16px;font-family:Cabin,sans-serif;font-style: italic;text-transform:uppercase">¡Gracias por tu compra en Ferredip!</p>

      <div class="fichaCarrito" style="text-align: center;position: relative;text-align: center;padding: 10px;">

          <div class="canasta">

                ${itemsHtml}

          </div>
              <div style="text-align: right;right: 5px;position: relative;width: 100%;max-width: 500px;display: inline-block;">
                  <table width="100%" border="1" cellpadding="5" style="background-color: #efefef;font-weight: 100;border-radius: 15px;border-color: white;border: solid 1px white;">
                  <tbody>
                      <tr>
                          <td> SubTotal: </td>
                          <td width="20%">
                              <div class="subTotal preciosNormales"> $${escapeHtml(formatMoney(subTotalReal))}</div>
                          </td>
                      </tr>
                      <tr>
                          <td> Costos de Envío: </td>
                          <td>
                              <div class="precioEnvio preciosNormales">$${escapeHtml(formatMoney(shippingNum))}</div>
                          </td>
                      </tr>
                      <tr>
                          <td> Monto a Pagar: </td>
                          <td>
                              <div class="sumaTotal" style="height: 36px;font-weight: bold;font-size: 19px;color: red;position: relative;top: 3px;">$${escapeHtml(formatMoney(totalReal))}</div>
                          </td>
                      </tr>
                      <tr>
                          <td colspan="2">
                              <div style="font-size: 14px;">Vendedor que lo atendió:</div>
                              <div style="font-size: 12px;">ferredip.com.mx</div>
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
                        <div style="font-weight:bold;text-transform: uppercase;">${nombreEsc} ${apellidosEsc}</div>
                        </td>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">Telefono:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${telefonoEsc}</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Dirección de entrega:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${direccionEsc}</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Entre calles:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${entreCallesEsc}</div>
                        </td>
                        </tr>
                        <tr>
                        <td colspan="2">
                        <div style="font-size: 14px;color: gray;">Correo Electrónico del Comprador:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${customerEmailEsc}</div>
                        </td>
                        </tr>
                        <tr>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">Ciudad / Municipio:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${ciudadEsc}</div>
                        </td>
                        <td width="50%">
                        <div style="font-size: 14px;color: gray;">CP:</div>
                        <div style="font-weight:bold;text-transform: uppercase;">${cpEsc}</div>
                        </td>
                        </tr>
                        </tbody></table></div>
              </div>

              <div style="text-align: right;right: 5px;position: relative;width: 100%;max-width: 500px;display: inline-block;"></div>
      </div>
      </div>

      <div class="separador"></div>

      <img src="https://ferredip.com.mx/sliders/mainSlider/logos.jpg" width="100%" style="margin: 25px 0px;">

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
            <a href="https://ferredip.com.mx" style="color: white !important;font-size: 14px;display: inline-block;">ferredip.com.mx</a>
        </div>


      </body>

      </html>
    `,
      }),
      emailTimeout,
    ]);

    if (error) {
      console.error('Error Resend send-email', { requestId, error });
      return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error) {
    console.error('Error enviando correo', { requestId, error });
    return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 500 });
  }
}
