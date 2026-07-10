export type ResultadosType = {
    id: string | null
    clave:string | null
    variante: string | null
    descripcion: string | null
    informacion: string | null
    disponible: string | null
    marca: string | null
    categoria: string | null
    existencias: number | null
    precioant: string | null
    precio: string | null
    destacado: boolean | null
    orden_prod: number | null
    orden_cat: number | null
    createdat: Date | string | null
    related_products: string[] | null
}

export type RelatedProductType = Pick<ResultadosType, 
  | "id"
  | "clave"
  | "descripcion"
  | "informacion"
  | "disponible"
  | "marca"
  | "categoria"
  | "existencias"
  | "precioant"
  | "precio"
  | "destacado">