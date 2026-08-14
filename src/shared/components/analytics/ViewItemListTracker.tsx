'use client';

import { useEffect, useRef } from "react";
import { pushEcommerce, itemsValue, CURRENCY, type GA4Item } from "@/src/utils/gtm";

type Props = {
  items: GA4Item[];
  listId: string;
  listName: string;
};

export default function ViewItemListTracker({ items, listId, listName }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;

    pushEcommerce('view_item_list', {
      item_list_id: listId,
      item_list_name: listName,
      currency: CURRENCY,
      value: itemsValue(items),
      items,
    });
  }, [items, listId, listName]);

  return null;
}
