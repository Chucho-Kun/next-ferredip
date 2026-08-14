import { CartItem } from "@/src/store/cartStore";

const ORDER_SNAPSHOT_KEY = 'dipemsa-last-order';
const PURCHASE_SENT_KEY = 'dipemsa-purchase-sent';
const MAX_PURCHASE_SENT_ENTRIES = 20;

export type OrderSnapshot = {
  paymentId: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: number;
};

export function saveOrderSnapshot(snapshot: OrderSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function readOrderSnapshot(): OrderSnapshot | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(ORDER_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OrderSnapshot;
  } catch {
    return null;
  }
}

export function clearOrderSnapshot() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ORDER_SNAPSHOT_KEY);
}

function readPurchaseSent(): string[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(PURCHASE_SENT_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function wasPurchaseSent(paymentId: string): boolean {
  return readPurchaseSent().includes(paymentId);
}

export function markPurchaseSent(paymentId: string) {
  if (typeof window === 'undefined') return;

  const updated = [...readPurchaseSent(), paymentId].slice(-MAX_PURCHASE_SENT_ENTRIES);
  window.localStorage.setItem(PURCHASE_SENT_KEY, JSON.stringify(updated));
}
