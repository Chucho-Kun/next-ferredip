// app/api/admin/productos/[id]/relacionados/route.ts — SPEC 18 gateado con token
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { eq } from 'drizzle-orm';
import { isAdminAuthorized } from '@/src/shared/auth/admin';
import { RelacionadosSchema } from '@/src/shared/validation/schemas';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const raw = await request.json();
    // Compat: el dashboard manda `related_products`, el schema pide `related_ids`
    const candidate = {
      related_ids: Array.isArray(raw?.related_ids)
        ? raw.related_ids
        : Array.isArray(raw?.related_products)
          ? raw.related_products
          : undefined,
    };

    const parsed = RelacionadosSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json({ error: 'No se pudo procesar, intenta de nuevo' }, { status: 400 });
    }

    const related_products = parsed.data.related_ids;

    const result = await db
      .update(productos)
      .set({ related_products })
      .where(eq(productos.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Error actualizando relacionados:', error);
    return NextResponse.json({
      error: 'No se pudo procesar, intenta de nuevo'
    }, { status: 500 });
  }
}
