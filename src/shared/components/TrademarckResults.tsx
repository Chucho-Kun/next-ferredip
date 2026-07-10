import Image from "next/image";
import { getProductsByGroupsofTrademarks } from "../db/queries";
import GroupCard from "./GroupCard";

type Props = {
  slug: string
}

export default async function TrademarckResults({ slug }: Props) {
  
  const groupedProducts = await getProductsByGroupsofTrademarks( slug )

  return (
   <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12">
          { slug.replace(/-/g, ' ').toUpperCase()}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {groupedProducts.map((group) => (
            <GroupCard key={group.baseName} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}