import { getProductById, getProductVariants, getRelatedProducts } from "../db/queries";
import ProductCard from "./ProductCard";

type Props = {
    id: string
}

export default async function  ProductCardsServer({ id }: Props) {

    const producto = await getProductById( id )

    const productoConTipo = {
        ...producto,
        related_products: producto.related_products as string[] | null
    }

    const [productosVariantes, variantes] = await Promise.all([
        getRelatedProducts( producto.related_products as string[] ),
        getProductVariants( producto.variante ),
    ])

  return (
    <ProductCard producto={productoConTipo} productosVariantes={ productosVariantes} variantes={ variantes } />
  )
}
