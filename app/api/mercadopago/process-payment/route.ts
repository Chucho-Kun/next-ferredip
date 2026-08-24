// app/api/mercadopago/process-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types';
import { registrarOrden } from '@/src/shared/db/ordenes';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formData = body.formData || body;

    // ← CORRECCIÓN IMPORTANTE: Redondear a 2 decimales
    const transactionAmount = Math.round(Number(formData.transaction_amount) * 100) / 100;

    console.log("🔍 Monto original:", formData.transaction_amount);
    console.log("✅ Monto corregido:", transactionAmount);

    if (!transactionAmount || isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({ 
        error: "transaction_amount inválido",
        received: formData.transaction_amount 
      }, { status: 400 });
    }

    const payment = new Payment(client);

    type PaymentItemIn = {
      id?: string;
      title?: string;
      description?: string;
      picture_url?: string;
      category_id?: string;
      clave?: string;
      marca?: string;
      quantity?: number;
      unit_price?: number;
      currency_id?: string;
    };

    const rawItems: PaymentItemIn[] = Array.isArray(body.items) ? body.items : [];

    const additionalItems = rawItems.map(({ currency_id: _c, ...it }, idx) => ({
      id: String(it.id ?? idx),                         // requerido
      title: String(it.title ?? "Producto"),            // recomendado
      description: it.description,
      picture_url: it.picture_url,
      category_id: it.category_id,
      quantity: Number(it.quantity ?? 1),               // requerido
      unit_price: Number(it.unit_price ?? 0),           // requerido
    }));

    const paymentBody: PaymentCreateRequest = {
      token: formData.token,
      issuer_id: formData.issuer_id,
      payment_method_id: formData.payment_method_id,
      transaction_amount: transactionAmount,
      installments: Number(formData.installments) || 1,
      description: body.description || "Compra en Ferredip",
      //additional_info: additionalItems.length ? { items: additionalItems } : undefined,
      payer: { email: formData.payer?.email || "contacto@ferredip.com.mx" },
      additional_info: {
        items: additionalItems,
        payer: {
          first_name: body.deliveryData?.nombre || "",
          last_name: body.deliveryData?.apellidos || "",
          phone: {
            area_code: "52",
            number: String(body.deliveryData?.telefono || "").replace(/\D/g, ""),
          },
        },
      },
    };

    const response = await payment.create({ body: paymentBody });

    console.log("✅ Pago procesado:", response.status);

    await registrarOrden({
      mp_payment_id: String(response.id),
      mp_status: response.status,
      mp_status_detail: response.status_detail,
      payment_method_id: formData.payment_method_id,
      installments: Number(formData.installments) || 1,

      nombre: body.deliveryData?.nombre || "",
      apellidos: body.deliveryData?.apellidos || "",
      email: formData.payer?.email || "",
      telefono: body.deliveryData?.telefono || "",
      direccion: body.deliveryData?.direccion || "",
      entre_calles: body.deliveryData?.entreCalles || "",
      ciudad: body.deliveryData?.ciudad || "",
      cp: body.deliveryData?.cp || "",

      subtotal: Number(body.subtotal) || 0,
      envio: Number(body.shipping) || 0,
      total: Number(body.total) || transactionAmount,

      items: rawItems.map((it, idx) => ({
        id: String(it.id ?? idx),
        titulo: String(it.title ?? "Producto"),
        descripcion: it.description ?? "",
        clave: it.clave ?? "",
        marca: it.marca ?? "",
        cantidad: Number(it.quantity ?? 1),
        precio: Number(it.unit_price ?? 0),
      })),
    });

    return NextResponse.json({
      status: response.status,
      status_detail: response.status_detail,
      payment_id: response.id,
    });

  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error procesando el pago' 
    }, { status: 500 });
  }
}