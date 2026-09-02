import { getProductsByGroupsofCategories, slugToCategory } from "../db/queries";
import GroupCard from "./GroupCard";
import CategoriasMenu from "./CategoriasMenu";
import ViewItemListTracker from "./analytics/ViewItemListTracker";
import { toGA4Item } from "@/src/utils/gtm";
import { breadcrumbJsonLd, listadoJsonLd } from "@/src/shared/seo/jsonLd";

type Props = {
  slug: string
}

export default async function CategoryResults({ slug }: Props) {

  //const productos = await getProductsByMarca( slug );
  //console.log('buscando...', slug );

  const groupedProducts = await getProductsByGroupsofCategories( slug )

  //console.log(groupedProducts);

  const listId = `categoria_${slug}`;
  const nombreCategoria = slugToCategory(slug);
  const listName = nombreCategoria.toUpperCase();

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
            { nombre: nombreCategoria, url: `https://ferredip.com.mx/categoria/${slug}` },
          ]),
        ),
      }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          listadoJsonLd({
            tipo: 'categoria',
            slug,
            nombre: nombreCategoria,
            productos: productosListado,
          }),
        ),
      }}
    />
   <section className="py-16 bg-gray-50">
      <ViewItemListTracker items={ga4Items} listId={listId} listName={listName} />
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-8 md:gap-12">
        <CategoriasMenu activeSlug={slug} />

        <div className="flex-1 min-w-0">
          <h1 className="text-4xl font-bold mb-12">
            { listName }
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groupedProducts.map((group) => (
              <GroupCard key={group.baseName} group={group} listId={listId} listName={listName} />
            ))}
          </div>
        </div>
      </div>
    </section>
   </>
  );
}
