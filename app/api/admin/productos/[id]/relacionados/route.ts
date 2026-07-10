// app/api/admin/productos/[id]/relacionados/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }   // ← Cambia aquí
) {
  try {
    const { id } = await params;   // ← Agrega await

    const { related_products } = await request.json();

    if (!Array.isArray(related_products)) {
      return NextResponse.json({ error: "related_products debe ser un array" }, { status: 400 });
    }

    const result = await db
      .update(productos)
      .set({ related_products })
      .where(eq(productos.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: result[0] 
    });

  } catch (error: any) {
    console.error("❌ Error actualizando relacionados:", error);
    return NextResponse.json({ 
      error: "Error al actualizar productos relacionados",
      details: error.message 
    }, { status: 500 });
  }
}