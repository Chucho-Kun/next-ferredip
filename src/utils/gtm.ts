import { parsePrecio } from "./formatPrice";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export const CURRENCY = 'MXN';

export type GA4Item = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_brand?: string;
  item_category?: string;
  price: number;
  quantity: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
};

type ProductLike = {
  id: string;
  descripcion: string;
  // Presente en CartItem: ahí `descripcion` ya es solo el detalle de variante
  // (no "Nombre | variante"), así que si viene `titulo` se usa directo en vez
  // de partir `descripcion` por '|'.
  titulo?: string;
  precio: string;
  marca?: string | null;
  categoria?: string | null;
};

type GA4ItemExtras = {
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function pushEcommerce(event: string, ecommerce: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}

export function toGA4Item(producto: ProductLike, extras?: GA4ItemExtras): GA4Item {
  const [item_name, item_variant] = producto.titulo
    ? [producto.titulo.trim(), producto.descripcion?.trim() || undefined]
    : (producto.descripcion || '').split('|').map(part => part.trim());

  return {
    item_id: producto.id,
    item_name,
    ...(item_variant && { item_variant }),
    ...(producto.marca && { item_brand: producto.marca }),
    ...(producto.categoria && { item_category: producto.categoria }),
    price: round2(parsePrecio(producto.precio)),
    quantity: extras?.quantity ?? 1,
    ...(extras?.index !== undefined && { index: extras.index }),
    ...(extras?.item_list_id && { item_list_id: extras.item_list_id }),
    ...(extras?.item_list_name && { item_list_name: extras.item_list_name }),
  };
}

export function itemsValue(items: GA4Item[]): number {
  return round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

export function taxFromSubtotal(subtotal: number): number {
  return round2(subtotal - subtotal / 1.16);
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  creditCard: 'Tarjeta de crédito',
  debitCard: 'Tarjeta de débito',
  ticket: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
};

export function paymentTypeLabel(paymentType: string): string {
  return PAYMENT_TYPE_LABELS[paymentType] ?? paymentType;
}
