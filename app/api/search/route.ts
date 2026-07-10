import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { ilike, desc, or, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('q') || '';

  if (search.length < 3) {
    return Response.json([]);
  }

  const results = await db.select({
    id: productos.id,
    clave: productos.clave,
    descripcion: productos.descripcion,
    precioant: productos.precioant,
    precio: productos.precio,
    marca: productos.marca,
  })
  .from(productos)
  .where(
    or(
      ilike(productos.clave, `%${search}%`),
      ilike(productos.descripcion, `%${search}%`),
      ilike(productos.marca, `%${search}%`)
    )
  )
  .orderBy(
    sql`CASE 
          WHEN clave ILIKE ${'%' + search + '%'} THEN 1 
          WHEN descripcion ILIKE ${'%' + search + '%'} THEN 2 
          WHEN marca ILIKE ${'%' + search + '%'} THEN 3 
          ELSE 4 
        END`,
    desc(productos.destacado)
  )
  .limit(15);

  return Response.json(results);
}