// db/queries.ts
import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { eq, like, desc, asc, sql, ilike, inArray } from 'drizzle-orm';

export function slugToMarca(slug: string): string {
  const mapa: Record<string, string> = {
    'owens-corning': 'Owens corning',
    'gram-bel': 'Gram bel',
    'panel-rey': 'Panel Rey',
    'trim-tex': 'Trim-Tex',
    'cempanel': 'Cempanel',
  };

  return mapa[slug] || slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function slugToCategory(slug: string): string {
  const mapa: Record<string, string> = {
    'anclajes-y-quimicos-epoxicos': 'Anclajes y químicos epoxicos',
    'sistemas-de-fijacion-directa': 'Sistemas de fijacion directa',
    'perfiles-galvanizados': 'Perfiles galvanizados',
    'tablaroca-y-durock':'Tablaroca y Durock',
    'trim-tex': 'Liner panel',
    'cempanel': 'Cempanel',
    // Agrega más según necesites
  };

  return mapa[slug] || slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

///// AGRUPAR RESULTADOS POR VARIANTE EN MARCAS
export async function getProductsByGroupsofTrademarks(marca: string) {
  const marcaReal = slugToMarca(marca);

  const rawProducts = await db.select()
    .from(productos)
    .where(
      ilike(productos.marca, `%${marcaReal}%`)
    )
    .orderBy(desc(productos.orden_cat));   // ← Cambiado a orden_prod

  // === Agrupación por nombre base ===
  const grouped = rawProducts.reduce((acc, producto) => {
    const fullDesc = producto.descripcion || '';
    const baseName = fullDesc.split('|')[0].trim();

    if (!acc[baseName]) {
      acc[baseName] = [];
    }

    acc[baseName].push(producto);
    return acc;
  }, {} as Record<string, any[]>);

  // Convertimos a array y ordenamos los grupos
  return Object.entries(grouped)
    .map(([baseName, variants]) => ({
      baseName,
      variants: variants.sort((a, b) => {
        // Ordenar variantes dentro del grupo por precio
        return parseFloat(a.precio || '0') - parseFloat(b.precio || '0');
      })
    }))
    // ← Orden final de los GRUPOS por orden_prod (mayor a menor)
    .sort((a, b) => {
      const ordenA = a.variants[0]?.orden_cat ?? 0;
      const ordenB = b.variants[0]?.orden_cat ?? 0;
      return ordenB - ordenA; // Mayor a menor
    });
}
/////

///// AGRUPAR RESULTADOS POR VARIANTE EN CATEGORIAS
export async function getProductsByGroupsofCategories(categoria: string) {
  const categoriaReal = slugToCategory(categoria);

  const rawProducts = await db.select()
    .from(productos)
    .where(
      ilike(productos.categoria, `%${categoriaReal}%`)
    )
    .orderBy(desc(productos.orden_prod));     // ← Cambiado a orden_cat

  // console.log("Productos crudos ordenados por orden_cat:", 
  //   rawProducts.map(p => ({ 
  //     descripcion: p.descripcion?.substring(0, 50), 
  //     orden_cat: p.orden_cat,
  //     orden_prod: p.orden_prod 
  //   }))
  // );

  // === Agrupación por nombre base ===
  const grouped = rawProducts.reduce((acc, producto) => {
    const fullDesc = producto.descripcion || '';
    const baseName = fullDesc.split('|')[0].trim();

    if (!acc[baseName]) {
      acc[baseName] = [];
    }
    acc[baseName].push(producto);
    return acc;
  }, {} as Record<string, any[]>);

  // Convertimos a array y ordenamos los grupos
  return Object.entries(grouped)
    .map(([baseName, variants]) => ({
      baseName,
      variants: variants.sort((a, b) => {
        return parseFloat(a.precio || '0') - parseFloat(b.precio || '0');
      })
    }))
    // Orden final de los GRUPOS por orden_cat (mayor a menor)
    .sort((a, b) => {
      const ordenA = a.variants[0]?.orden_prod ?? 0;
      const ordenB = b.variants[0]?.orden_prod ?? 0;
      return ordenB - ordenA;   // ← Mayor a menor
    });
}
/////

////// BUSCAR PRODUCTOS POR EL TEXTO DE LA URL
export async function getProductById(id: string) {
  const result = await db.select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  return result[0];
}
/////

export async function getRecomendedProducts() {
        return await db.select()
            .from(productos)
            .where(eq(productos.destacado, true))
}

export async function getAllProductosXML() {
  return await db.select()
                      .from(productos)
                      .orderBy(desc(productos.createdat))
}
 
export async function getRelatedProducts(relatedIds: string[]) {
  if (!relatedIds?.length) return [];

  return await db.select({
    id: productos.id,
    clave: productos.clave,
    descripcion: productos.descripcion,
    informacion: productos.informacion,
    disponible: productos.disponible,
    marca: productos.marca,
    categoria: productos.categoria,
    existencias: productos.existencias,
    precioant: productos.precioant,
    precio: productos.precio,
    destacado: productos.destacado,
  })
  .from(productos)
  .where(inArray(productos.id, relatedIds))
  .orderBy(desc(productos.related_products));
}

// export async function getProductsByCategory(categoria: string) {
//   const categoriaReal = slugToCategory(categoria);   // "gram-bel" → "Gram Bel"

//   return await db.select()
//     .from(productos)
//     .where(
//       ilike(productos.categoria, `%${categoriaReal}%`)
//     )
//     .orderBy(desc(productos.destacado), desc(productos.createdat));
// }

// export async function getRecomendedProducts(limit = 12) {
//     return await db.select()
//         .from(productos)
//         .where(eq(productos.destacado, true))
//         .limit(limit);
// }

// 1. Obtener todos los productos (con paginación)
// export async function getAllProducts(page = 1, limit = 20) {
//   const offset = (page - 1) * limit;
  
//   const data = await db.select()
//     .from(productos)
//     .orderBy(desc(productos.destacado), asc(productos.marca))
//     .limit(limit)
//     .offset(offset);

//   const total = await db.select({ count: sql<number>`count(*)` }).from(productos);

//   return {
//     data,
//     pagination: {
//       page,
//       limit,
//       total: total[0].count,
//       totalPages: Math.ceil(total[0].count / limit)
//     }
//   };
// }

// 6. Productos con stock bajo
// export async function getLowStockProducts(threshold = 10) {
//   return await db.select()
//     .from(productos)
//     .where(sql`${productos.existencias} <= ${threshold}`);
// }