// app/api/mercadopago/process-payment/route.ts — SPEC 18 endurecido
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types';
import { randomUUID } from 'crypto';
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { inArray } from 'drizzle-orm';
import { registrarOrden } from '@/src/shared/db/ordenes';
import { ProcessPaymentSchema } from '@/src/shared/validation/schemas';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

// Allowlist de métodos conocidos de MP (MX). Se acepta cualquier id
// alfanumérico + guion bajo dentro del límite zod; esta lista bloquea
// valores claramente arbitrarios sin romper métodos nuevos de MP.
const PAYMENT_METHOD_ALLOW_RE = /^[a-z0-9_]+$/i;

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();
    const formData = body.formData || body;

    const rawItemsIn: unknown = Array.isArray(body.items)
      ? body.items
      : Array.isArray(formData.items)
        ? formData.items
        : [];

    const rawList: unknown[] = Array.isArray(rawItemsIn) ? rawItemsIn : [];
    const itemsNorm = rawList.map((it: unknown, idx: number) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? idx),
        quantity: Number(o.quantity ?? o.cantidad ?? 1),
      };
    });

    const candidate = {
      token: formData.token,
      issuer_id: formData.issuer_id,
      payment_method_id: formData.payment_method_id,
      installments: Number(formData.installments) || 0,
      payer: { email: formData.payer?.email },
      items: itemsNorm,
      transaction_amount:
        formData.transaction_amount !== undefined && formData.transaction_amount !== null
          ? Number(formData.transaction_amount)
          : undefined,
    };

    const parsed = ProcessPaymentSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'No se pudo procesar, intenta de nuevo' },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (!PAYMENT_METHOD_ALLOW_RE.test(input.payment_method_id)) {
      return NextResponse.json(
        { error: 'No se pudo procesar, intenta de nuevo' },
        { status: 400 },
      );
    }

    // Recalcular desde DB: el servidor nunca cobra montos del cliente
    const ids = input.items.map((i) => i.id);
    const rows = await db
      .select({ id: productos.id, precio: productos.precio })
      .from(productos)
      .where(inArray(productos.id, ids));

    const priceById = new Map<string, number>();
    for (const r of rows) {
      if (typeof r.id === 'string') priceById.set(r.id, Number(r.precio));
    }
    let serverTotal = 0;
    const serverItems: { id: string; unit_price: number; quantity: number; line_total: number }[] = [];
    for (const it of input.items) {
      const unit = priceById.get(it.id);
      if (unit === undefined || !Number.isFinite(unit) || unit <= 0) {
        return NextResponse.json(
          { error: 'No se pudo procesar, intenta de nuevo' },
          { status: 400 },
        );
      }
      const line = Math.round(unit * it.quantity * 100) / 100;
      serverTotal += line;
      serverItems.push({ id: it.id, unit_price: unit, quantity: it.quantity, line_total: line });
    }
    serverTotal = Math.round(serverTotal * 100) / 100;

    if (input.transaction_amount !== undefined) {
      const clientTotal = Math.round(Number(input.transaction_amount) * 100) / 100;
      if (!Number.isFinite(clientTotal) || Math.abs(serverTotal - clientTotal) > 1) {
        console.warn('[process-payment] divergencia de monto', { requestId });
        return NextResponse.json(
          { error: 'No se pudo procesar, intenta de nuevo' },
          { status: 400 },
        );
      }
    }

    const transactionAmount = serverTotal;
    if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { error: 'No se pudo procesar, intenta de nuevo' },
        { status: 400 },
      );
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
    const priceLookup = new Map(serverItems.map((s) => [s.id, s.unit_price]));

    const additionalItems = rawItems.map(({ currency_id: _c, ...it }, idx) => {
      const itemId = String(it.id ?? idx);
      return {
        id: itemId,
        title: String(it.title ?? 'Producto'),
        description: it.description,
        picture_url: it.picture_url,
        category_id: it.category_id,
        quantity: Number(it.quantity ?? 1),
        // Precio recalculado del servidor, nunca el del cliente
        unit_price: priceLookup.get(itemId) ?? 0,
      };
    });

    const paymentBody: PaymentCreateRequest = {
      token: input.token,
      issuer_id: input.issuer_id !== undefined ? Number(input.issuer_id) || undefined : undefined,
      payment_method_id: input.payment_method_id,
      transaction_amount: transactionAmount,
      installments: input.installments,
      description: typeof body.description === 'string' ? body.description.slice(0, 200) : 'Compra en Ferredip',
      payer: { email: input.payer.email },
      additional_info: {
        items: additionalItems,
        payer: {
          first_name: typeof body.deliveryData?.nombre === 'string' ? body.deliveryData.nombre.slice(0, 80) : '',
          last_name: typeof body.deliveryData?.apellidos === 'string' ? body.deliveryData.apellidos.slice(0, 80) : '',
          phone: {
            area_code: '52',
            number: String(body.deliveryData?.telefono || '').replace(/\D/g, '').slice(0, 20),
          },
        },
      },
    };

    const mpSignal = AbortSignal.timeout(10000);
    const mpTimeout = new Promise<never>((_, reject) =>
      mpSignal.addEventListener('abort', () =>
        reject(new DOMException('Mercado Pago payment timeout', 'TimeoutError')), { once: true }),
    );
    const response = await Promise.race([
      payment.create({ body: paymentBody, requestOptions: { timeout: 10000 } }),
      mpTimeout,
    ]);

    console.log('Pago procesado', { requestId, payment_id: response.id, total: transactionAmount, status: response.status });

    await registrarOrden({
      mp_payment_id: String(response.id),
      mp_status: response.status,
      mp_status_detail: response.status_detail,
      payment_method_id: input.payment_method_id,
      installments: input.installments,

      nombre: typeof body.deliveryData?.nombre === 'string' ? body.deliveryData.nombre.slice(0, 80) : '',
      apellidos: typeof body.deliveryData?.apellidos === 'string' ? body.deliveryData.apellidos.slice(0, 80) : '',
      email: input.payer.email,
      telefono: String(body.deliveryData?.telefono || '').slice(0, 30),
      direccion: typeof body.deliveryData?.direccion === 'string' ? body.deliveryData.direccion.slice(0, 200) : '',
      entre_calles: typeof body.deliveryData?.entreCalles === 'string' ? body.deliveryData.entreCalles.slice(0, 200) : '',
      ciudad: typeof body.deliveryData?.ciudad === 'string' ? body.deliveryData.ciudad.slice(0, 100) : '',
      cp: String(body.deliveryData?.cp || '').slice(0, 10),

      subtotal: transactionAmount,
      envio: Number(body.shipping) || 0,
      total: transactionAmount,

      items: rawItems.map((it, idx) => {
        const itemId = String(it.id ?? idx);
        return {
          id: itemId,
          titulo: String(it.title ?? 'Producto').slice(0, 120),
          descripcion: typeof it.description === 'string' ? it.description.slice(0, 500) : '',
          clave: typeof it.clave === 'string' ? it.clave.slice(0, 20) : '',
          marca: typeof it.marca === 'string' ? it.marca.slice(0, 50) : '',
          cantidad: Number(it.quantity ?? 1),
          precio: priceLookup.get(itemId) ?? 0,
        };
      }),
    });

    return NextResponse.json({
      status: response.status,
      status_detail: response.status_detail,
      payment_id: response.id,
    });

  } catch (error) {
    console.error('Error procesando pago', { requestId, error });
    return NextResponse.json({
      error: 'No se pudo procesar, intenta de nuevo'
    }, { status: 500 });
  }
}
