// app/api/mercadopago/preference/route.ts — SPEC 18 endurecido
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { inArray } from 'drizzle-orm';
import { fotoPrincipal } from '@/src/utils/fotos';
import { PreferenceSchema } from '@/src/shared/validation/schemas';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

const ID_RE = /^[A-Za-z0-9_-]+$/;

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  try {
    const body = await request.json();

    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];

    // Normalizar tolerando title/titulo y quantity/cantidad del cliente
    const itemsNorm = rawItems.map((item: unknown) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        id: typeof o.id === 'number' ? String(o.id) : String(o.id ?? ''),
        title: String(o.title ?? o.titulo ?? '').trim().slice(0, 120) || `Producto Ferredip ${String(o.id ?? '')}`.slice(0, 120),
        quantity: Number(o.quantity ?? o.cantidad ?? 1),
      };
    });

    const candidate = {
      items: itemsNorm,
      payer: body.payer?.email ? { email: body.payer.email } : undefined,
      metadata:
        body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? Object.fromEntries(
              Object.entries(body.metadata as Record<string, unknown>)
                .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
                .map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 200)]),
            )
          : undefined,
    };

    const parsed = PreferenceSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'No se pudo procesar, intenta de nuevo' },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // Validar id antes de construir picture_url
    for (const it of input.items) {
      if (!ID_RE.test(it.id)) {
        return NextResponse.json(
          { error: 'No se pudo procesar, intenta de nuevo' },
          { status: 400 },
        );
      }
    }

    // Recalcular unit_price desde DB, nunca el del cliente
    const ids = input.items.map((i) => i.id);
    const rows = await db
      .select({ id: productos.id, precio: productos.precio, descripcion: productos.descripcion, marca: productos.marca })
      .from(productos)
      .where(inArray(productos.id, ids));

    const rowById = new Map(rows.map((r) => [r.id, r]));
    const improvedItems = [];
    for (const it of input.items) {
      const row = rowById.get(it.id);
      const unit = row ? Number(row.precio) : NaN;
      if (!row || !Number.isFinite(unit) || unit <= 0) {
        return NextResponse.json(
          { error: 'No se pudo procesar, intenta de nuevo' },
          { status: 400 },
        );
      }
      improvedItems.push({
        id: it.id,
        title: it.title,
        currency_id: 'MXN',
        picture_url: fotoPrincipal(it.id),
        description: typeof row.descripcion === 'string' ? row.descripcion.slice(0, 500) : '',
        category_id: typeof row.marca === 'string' ? row.marca.slice(0, 50) : undefined,
        quantity: it.quantity,
        unit_price: Math.round(unit * 100) / 100,
      });
    }

    const totalItems = improvedItems.length;
    const totalAmount = Math.round(
      improvedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 100,
    ) / 100;

    console.log('[PREFERENCE] items:', totalItems, 'total:', totalAmount, 'req:', requestId);

    const preference = new Preference(client);

    const mpSignal = AbortSignal.timeout(10000);
    const mpTimeout = new Promise<never>((_, reject) =>
      mpSignal.addEventListener('abort', () =>
        reject(new DOMException('Mercado Pago preference timeout', 'TimeoutError')), { once: true }),
    );
    const response = await Promise.race([
      preference.create({
        body: {
        items: improvedItems,
        payer: input.payer ? { email: input.payer.email } : undefined,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_URL}/compra/pago-exitoso`,
          failure: `${process.env.NEXT_PUBLIC_URL}/compra/pago-fallido`,
          pending: `${process.env.NEXT_PUBLIC_URL}/compra/pago-pendiente`,
        },
        statement_descriptor: "Ferredip",
        external_reference: `ORD-${Date.now()}`,
        additional_info: {
           items: improvedItems.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              currency_id: "MXN",
            })),
          shipments: {
            receiver_address: {
              zip_code: typeof body.payer?.address?.zip_code === 'string' ? body.payer.address.zip_code.slice(0, 10) : "",
              street_name: typeof body.payer?.address?.street_name === 'string' ? body.payer.address.street_name.slice(0, 200) : "",
            }
          },
          payer: {
            first_name: typeof body.payer?.name === 'string' ? body.payer.name.slice(0, 80) : "",
            last_name: typeof body.payer?.surname === 'string' ? body.payer.surname.slice(0, 80) : "",
            phone: typeof body.payer?.phone?.number === 'string' ? body.payer.phone.number.replace(/\D/g, '').slice(0, 20) : "",
          }
        // El SDK tipa additional_info como string, pero la API espera este objeto
        } as unknown as string,
        metadata: {
          ...(input.metadata ?? {}),
          source: "Ferredip-web",
          platform: "nextjs",
          environment: process.env.NODE_ENV,
          total_items: String(totalItems),
          total_amount: String(totalAmount),
          created_at: new Date().toISOString(),
        },
        },
        requestOptions: { timeout: 10000 },
      }),
      mpTimeout,
    ]);

    console.log('[PREFERENCE] created', { requestId, preference_id: response.id, total: totalAmount });

    return NextResponse.json({
      preferenceId: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error('Error creando preferencia', { requestId, error });
    return NextResponse.json({
      error: 'No se pudo procesar, intenta de nuevo'
    }, { status: 500 });
  }
}
