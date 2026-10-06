import { getRecomendedProducts } from "../db/queries"
import RecommendedProducts from "./RecommendedProducts"

export default async function RecommendedProductsServer() {

    const productosRecomendados = await getRecomendedProducts()

  return (
    <RecommendedProducts productosRecomendados={productosRecomendados}  />
  )
}
