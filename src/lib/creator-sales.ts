// Продажи карт автора — для /resources (24.11, просьба владельца:
// «сколько продано, кто купил»).
//
// Читается служебным ключом: заказы закрыты RLS от всех, кроме самого
// покупателя. Безопасность держит список карт: он приходит из
// getOwnProducts под сессией автора (политика «creators read own
// products»), то есть сюда попадают только его карты.
//
// Автор видит НИК покупателя и дату, не почту — это записано в /privacy.
// Возвращённые и оспоренные заказы (refunded) не считаются: денег нет.

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type MapSales = {
  /** Сколько раз карту получили (покупка или бесплатное получение). */
  count: number;
  revenueCents: number;
  /** Последние получившие, новые сверху. Ника нет — аккаунт удалён. */
  buyers: { username: string | null; at: string }[];
};

type ItemRow = {
  product_id: string;
  price_cents: number;
  quantity: number;
  orders: { status: string; user_id: string | null; created_at: string } | { status: string; user_id: string | null; created_at: string }[] | null;
};

export async function getCreatorSales(productIds: string[]): Promise<Record<string, MapSales>> {
  const result: Record<string, MapSales> = {};
  if (productIds.length === 0) return result;
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("order_items")
    .select("product_id, price_cents, quantity, orders!inner(status, user_id, created_at)")
    .in("product_id", productIds)
    .eq("orders.status", "paid");
  if (error) {
    console.warn("Продажи автора недоступны:", error.message);
    return result;
  }

  const rows = (data ?? []) as ItemRow[];
  const userIds = new Set<string>();
  for (const row of rows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (order?.user_id) userIds.add(order.user_id);
  }

  const names = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles } = await db.from("profiles").select("id, username").in("id", [...userIds]);
    for (const p of profiles ?? []) names.set(p.id as string, p.username as string);
  }

  for (const row of rows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (!order) continue;
    const entry = (result[row.product_id] ??= { count: 0, revenueCents: 0, buyers: [] });
    entry.count += row.quantity;
    entry.revenueCents += row.price_cents * row.quantity;
    entry.buyers.push({ username: order.user_id ? names.get(order.user_id) ?? null : null, at: order.created_at });
  }
  for (const entry of Object.values(result)) {
    entry.buyers.sort((a, b) => (a.at < b.at ? 1 : -1));
  }
  return result;
}
