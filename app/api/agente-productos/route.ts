import { db } from '@/src/shared/db';
import { productos } from '@/src/shared/db/schema/productList';
import { ilike, or, and, desc, sql, type SQL } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { fotoPrincipal } from '@/src/utils/fotos';
import { slugify } from '@/src/utils/slugify';
import { parsePrecio } from '@/src/utils/formatPrice';
import { NEGOCIO } from '@/src/shared/seo/negocio';

export type AgenteProducto = {
  id: string;
  nombre: string;
  url: string;
  precio: number | null;
  marca: string | null;
  categoria: string | null;
  imagen: string | null;
};

export type AgenteResponse = {
  query: string;
  total: number;
  items: AgenteProducto[];
};

const MAX_LIMIT = 5;

// Palabras vacías que aparecen en casi todas las descripciones ("para",
// "con", "de"...) y solo meten ruido al puntaje de relevancia.
const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'los', 'las', 'del', 'al', 'una', 'uno',
  'que', 'por', 'con', 'para', 'como', 'sin', 'sobre', 'entre',
  'hasta', 'desde', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
]);

// Singular aproximado para que "bombas" también matchee "bomba".
function singular(t: string): string {
  const l = t.toLowerCase();
  if (l.endsWith('es') && l.length > 5) return t.slice(0, -2);
  if (l.endsWith('s') && l.length > 4) return t.slice(0, -1);
  return t;
}

function variantes(t: string): string[] {
  return [...new Set([t, singular(t)])];
}

function clampLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(n)) return MAX_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Acotar inputs para evitar ILIKE gigantes bajo crawl (SPEC 16, max 80)
  const q = ((params.get('q') ?? '').trim()).slice(0, 80);
  const marca = ((params.get('marca') ?? '').trim()).slice(0, 80);
  const categoria = ((params.get('categoria') ?? '').trim()).slice(0, 80);
  const limit = clampLimit(params.get('limit'));
  const headers = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' };

  if (!q && !marca && !categoria) {
    return Response.json({ query: '', total: 0, items: [] } satisfies AgenteResponse, { headers });
  }

  const condiciones: SQL[] = [];
  const terminos = q
    ? q.split(/\s+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t.toLowerCase()))
    : [];
  if (terminos.length === 0 && q) terminos.push(q);

  if (q) {
    const porTermino = terminos.map((t) => {
      const patrones = variantes(t).map((v) => `%${v}%`);
      return or(
        ...patrones.flatMap((patron) => [
          ilike(productos.descripcion, patron),
          ilike(productos.marca, patron),
          ilike(productos.categoria, patron),
          ilike(productos.clave, patron),
        ]),
      );
    });
    const busqueda = porTermino.length === 1 ? porTermino[0] : or(...porTermino);
    if (busqueda) condiciones.push(busqueda);
  }

  if (marca) condiciones.push(ilike(productos.marca, `%${marca}%`));
  if (categoria) condiciones.push(ilike(productos.categoria, `%${categoria}%`));

  const patronCompleto = `%${q}%`;

  // Relevancia simple: más peso a coincidencias en descripción y a
  // items que matchean más términos (con su variante singular).
  const score =
    terminos.length > 0
      ? sql.join(
          terminos.map((t) => {
            const porVariante = variantes(t).map((v) => {
              const patron = `%${v}%`;
              return sql`((CASE WHEN ${productos.descripcion} ILIKE ${patron} THEN 2 ELSE 0 END) + (CASE WHEN ${productos.marca} ILIKE ${patron} THEN 1 ELSE 0 END) + (CASE WHEN ${productos.categoria} ILIKE ${patron} THEN 1 ELSE 0 END) + (CASE WHEN ${productos.clave} ILIKE ${patron} THEN 1 ELSE 0 END))`;
            });
            return porVariante.length === 1
              ? porVariante[0]
              : sql`GREATEST(${sql.join(porVariante, sql`, `)})`;
          }),
          sql` + `,
        )
      : sql`0`;

  const filas = await db
    .select({
      id: productos.id,
      descripcion: productos.descripcion,
      precio: productos.precio,
      marca: productos.marca,
      categoria: productos.categoria,
      destacado: productos.destacado,
    })
    .from(productos)
    .where(condiciones.length === 1 ? condiciones[0] : and(...condiciones))
    .orderBy(
      q ? desc(score) : sql`0`,
      q
        ? sql`CASE
                WHEN ${productos.descripcion} ILIKE ${patronCompleto} THEN 0
                WHEN ${productos.marca} ILIKE ${patronCompleto} THEN 1
                WHEN ${productos.categoria} ILIKE ${patronCompleto} THEN 2
                WHEN ${productos.clave} ILIKE ${patronCompleto} THEN 3
                ELSE 4
              END`
        : sql`0`,
      desc(productos.destacado),
    )
    .limit(limit);

  const items: AgenteProducto[] = filas.map((f) => {
    const monto = parsePrecio(f.precio);
    const nombre = f.descripcion ?? '';
    return {
      id: f.id,
      nombre,
      // URL absoluta /producto/{id}/{slug} justo después del nombre: es el
      // dato más importante y así nunca queda recortada al final del JSON.
      // El chat de n8n renderiza fuera de ferredip.com.mx, una relativa
      // resolvería contra el host de n8n.
      url: `${NEGOCIO.url}/producto/${f.id}/${slugify(nombre)}`,
      precio: monto > 0 ? monto : null,
      marca: f.marca,
      categoria: f.categoria,
      imagen: fotoPrincipal(f.id),
    };
  });

  return Response.json({
    query: q || [marca, categoria].filter(Boolean).join(' '),
    total: items.length,
    items,
  } satisfies AgenteResponse, { headers });
}
