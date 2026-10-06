// app/api/admin/productos/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const offset = (page - 1) * limit;

    const [totalRows, items] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(productos),
      db.select({
        id: productos.id,
        clave: productos.clave,
        descripcion: productos.descripcion,
        precio: productos.precio,
        marca: productos.marca,
        categoria: productos.categoria,
      })
      .from(productos)
      .orderBy(desc(productos.createdat))
      .limit(limit)
      .offset(offset),
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    return NextResponse.json({ page, limit, total, items });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}