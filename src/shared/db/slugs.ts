// db/slugs.ts
// Mapas slug → nombre legible. Son transformaciones de string puras (sin acceso
// a la base de datos), así que pueden importarse tanto desde server components
// como desde client components. `queries.ts` las reexporta por compatibilidad.

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
    "acabados-y-remodelacion":"Acabados y remodelación",
    "accesorios-para-banos":"Accesorios para baños",
    "aceites-y-lubricantes":"Aceites y lubricantes",
    "articulos-del-hogar":"Artículos del hogar",
    "articulos-de-limpieza":"Artículos de limpieza",
    "automotriz":"Automotriz",
    "cerrajeria":"Cerrajería",
    "construccion":"Construcción",
    "corte-y-desbaste":"Corte y desbaste",
    "electricidad":"Electricidad",
    "equipo-de-seguridad":"Equipo de seguridad",
    "herramientas-manuales":"Herramientas manuales",
    "herramientas-industriales":"Herramientas industriales",
    "iluminacion":"Iluminación",
    "jardineria":"Jardineria",
    "medicion-y-pesaje":"Medicion y pesaje",
    "neumaticos":"Neumáticos",
    "plomeria":"Plomería",
    "soldadura":"Soldadura",
    "tornilleria-y-fijacion":"Tornillería y fijación"

    // Agrega más según necesites
  };

  return mapa[slug] || slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
