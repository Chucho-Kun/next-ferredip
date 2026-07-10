import { getRecomendedProducts } from "../db/queries"
import { ResultadosType } from "../db/resultados"
import RecommendedProducts from "./RecommendedProducts"

export default async function RecommendedProductsServer() {

    const productosRecomendados: ResultadosType[] = await getRecomendedProducts()

  return (
    <RecommendedProducts productosRecomendados={productosRecomendados}  />
  )
}
