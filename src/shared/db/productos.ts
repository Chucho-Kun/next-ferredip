export type ProductosType = {
    name: string
    src: string
}

// Solo categorías que ya tienen imagen en public/productos.
// Agregar/quitar un slug acá en cuanto subas o borres su imagen.
const listaCatego = [
"acabados-y-remodelacion",
"accesorios-para-banos",
"aceites-y-lubricantes",
"articulos-del-hogar",
"articulos-de-limpieza",
"automotriz",
"cerrajeria",
"construccion",
"corte-y-desbaste",
"electricidad",
"equipo-de-seguridad",
"herramientas-manuales",
"herramientas-industriales",
"iluminacion",
"jardineria",
"medicion-y-pesaje",
"neumaticos",
"plomeria",
"soldadura",
"tornilleria-y-fijacion"]

export const productos: ProductosType[] = listaCatego.map((name) => ({
  name,
  src: `/productos/${name}.webp`,
}));