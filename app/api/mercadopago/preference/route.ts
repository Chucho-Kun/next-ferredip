// app/api/mercadopago/preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();   

    // Mejorar los items antes de enviarlos a Mercado Pago
    const improvedItems = body.items.map((item: any) => ({
      // Aseguramos un title no vacío y con fallback consistente
      id: item.id || undefined,
      title: (item.title || item.titulo || (`Producto Ferredip ${item.id || ''}`)).toString().trim(),
      currency_id: 'MXN',
      picture_url: `https://www.ferredip.com.mx/fotos/${ item.id }.jpg`,
      description: (item.description || item.descripcion || '').toString(),
      category_id: item.marca,
      quantity: Number(item.quantity ?? item.cantidad ?? 1),
      unit_price: Number(item.unit_price ?? item.precio ?? 0)
    }));

    // Loguear improvedItems para depuración antes de crear la preferencia
    console.log('🔧 [PREFERENCE] improvedItems a enviar a Mercado Pago:');
    console.log(JSON.stringify(improvedItems, null, 2));

    console.log("🛒 Carrito completo recibido:", 
      JSON.stringify(body.metadata?.carrito_completo, null, 2)
    );

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: improvedItems,
        payer: body.payer,
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_URL}/compra/pago-exitoso`,
          failure: `${process.env.NEXT_PUBLIC_URL}/compra/pago-fallido`,
          pending: `${process.env.NEXT_PUBLIC_URL}/compra/pago-pendiente`,
        },
        statement_descriptor: "FERREDIP",           // ← Aparece en el estado de cuenta
        external_reference: `ORD-${Date.now()}`,   // Referencia externa
        additional_info: {
           items: improvedItems.map((item: any) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              currency_id: "MXN",
            })),
          shipments: {
            receiver_address: {
              zip_code: body.payer?.address?.zip_code || "",
              street_name: body.payer?.address?.street_name || "",
            }
          },
          payer: {
            first_name: body.payer?.name || "",
            last_name: body.payer?.surname || "",
            phone: body.payer?.phone?.number || "",
          }
        } as any,
        metadata: {
          ...body.metadata,                    // ← Mantiene todo lo que enviaste
          source: "ferredip-web",
          platform: "nextjs",
          environment: process.env.NODE_ENV,
          total_items: improvedItems.length,
          total_amount: improvedItems.reduce((sum: number, item: any ) => 
            sum + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 
          0),
          created_at: new Date().toISOString(),
        },
        //auto_return: 'approved',
      },
    });

    return NextResponse.json({ 
      preferenceId: response.id,
      init_point: response.init_point 
    });

  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Error al crear preferencia' 
    }, { status: 500 });
  }
}