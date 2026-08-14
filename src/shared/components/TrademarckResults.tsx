import Image from "next/image";
import { getProductsByGroupsofTrademarks } from "../db/queries";
import GroupCard from "./GroupCard";
import ViewItemListTracker from "./analytics/ViewItemListTracker";
import { toGA4Item } from "@/src/utils/gtm";

type Props = {
  slug: string
}

export default async function TrademarckResults({ slug }: Props) {

  const groupedProducts = await getProductsByGroupsofTrademarks( slug )

  const listId = `marca_${slug}`;
  const listName = slug.replace(/-/g, ' ').toUpperCase();

  const ga4Items = groupedProducts.map((group, index) =>
    toGA4Item(group.variants[0], { index, item_list_id: listId, item_list_name: listName })
  );

  return (
   <section className="py-16 bg-gray-50">
      <ViewItemListTracker items={ga4Items} listId={listId} listName={listName} />
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12">
          { slug.replace(/-/g, ' ').toUpperCase()}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {groupedProducts.map((group) => (
            <GroupCard key={group.baseName} group={group} listId={listId} listName={listName} />
          ))}
        </div>
      </div>
    </section>
  );
}
