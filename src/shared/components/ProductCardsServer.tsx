import { db } from "../db";
import { getProductById, getRelatedProducts } from "../db/queries";
import ProductCard from "./ProductCard";

type Props = {
    id: string
}

export default async function ProductCardsServer({ id }: Props) {

    const producto = await getProductById( id )

    const productoConTipo = {
        ...producto,
        related_products: producto.related_products as string[] | null
    }

    let productosVariantes = await getRelatedProducts( producto.related_products as string[] )
    
  return (
    <ProductCard producto={productoConTipo} productosVariantes={ productosVariantes} />
  )
}
