import { getProductsByGroupsofTrademarks } from "../db/queries";
import { slugToMarca } from "../db/slugs";
import GroupCard from "./GroupCard";
import ViewItemListTracker from "./analytics/ViewItemListTracker";
import { toGA4Item } from "@/src/utils/gtm";
import { breadcrumbJsonLd, listadoJsonLd } from "@/src/shared/seo/jsonLd";

type Props = {
  slug: string
}

export default async function TrademarckResults({ slug }: Props) {

  const groupedProducts = await getProductsByGroupsofTrademarks( slug )

  const listId = `marca_${slug}`;
  const nombreMarca = slugToMarca(slug);
  const listName = nombreMarca.toUpperCase();

  const ga4Items = groupedProducts.map((group, index) =>
    toGA4Item(group.variants[0], { index, item_list_id: listId, item_list_name: listName })
  );

  const productosListado = groupedProducts.slice(0, 30).map((group) => ({
    id: group.variants[0]?.id ?? '',
    nombre: group.baseName,
    precio: group.variants[0]?.precio ?? '',
  }));

  return (
   <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          breadcrumbJsonLd([
            { nombre: 'Inicio', url: 'https://ferredip.com.mx' },
            { nombre: nombreMarca, url: `https://ferredip.com.mx/marca/${slug}` },
          ]),
        ),
      }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          listadoJsonLd({
            tipo: 'marca',
            slug,
            nombre: nombreMarca,
            productos: productosListado,
          }),
        ),
      }}
    />
   <section className="py-16 bg-gray-50">
      <ViewItemListTracker items={ga4Items} listId={listId} listName={listName} />
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-center mb-12">
          { listName }
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {groupedProducts.map((group) => (
            <GroupCard key={group.baseName} group={group} listId={listId} listName={listName} />
          ))}
        </div>
      </div>
    </section>
   </>
  );
}
