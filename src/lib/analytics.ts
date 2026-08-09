import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Сводка по магазину для владельца.
//
// Все числа считаются из того, что УЖЕ пишется: orders/order_items
// (продажи и выручка), product_ratings (оценки), profiles (люди). Ничего
// нового ради дашборда не собирается — и это сознательно: заводить
// отдельную таблицу метрик до того, как понятно, на какие числа реально
// смотрят, значит поддерживать данные, которые никто не открывает.
//
// Служебный ключ: orders закрыты RLS от всех, кроме сервера.

/** Сколько дней показывать на графике продаж. */
export const WINDOW_DAYS = 30;

export type DayPoint = { date: string; orders: number; revenueCents: number };

export type Overview = {
  revenueCents: number;
  orders: number;
  /** Средний чек — выручка на заказ, не на карту. */
  averageOrderCents: number;
  buyers: number;
  creators: number;
  accounts: number;
  liveMaps: number;
  pendingMaps: number;
  days: DayPoint[];
  topProducts: { id: string; title: string; sales: number; revenueCents: number }[];
  topCreators: { id: string; displayName: string; sales: number; maps: number }[];
};

type OrderRow = { id: string; total_cents: number; customer_email: string; created_at: string };
type ItemRow = { order_id: string; product_id: string; unit_price_cents: number };

export async function getOverview(): Promise<Overview | null> {
  const db = getSupabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  // Только оплаченные: pending — это брошенные корзины на стороне Stripe,
  // а failed и refunded деньгами не являются. Считать их выручкой значило
  // бы показывать владельцу цифру, которой у него нет.
  const { data: orders, error } = await db
    .from("orders")
    .select("id, total_cents, customer_email, created_at")
    .eq("status", "paid")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(`Сводка недоступна: ${error.message}`);
    return null;
  }

  const orderRows = (orders ?? []) as OrderRow[];

  const revenueCents = orderRows.reduce((sum, o) => sum + o.total_cents, 0);
  const buyers = new Set(orderRows.map((o) => o.customer_email)).size;

  // Пустые дни обязаны присутствовать: график по одним лишь дням с
  // продажами врёт — три покупки за месяц выглядят как ровная линия.
  const byDay = new Map<string, DayPoint>();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, orders: 0, revenueCents: 0 });
  }
  for (const order of orderRows) {
    const key = order.created_at.slice(0, 10);
    const point = byDay.get(key);
    if (!point) continue;
    point.orders += 1;
    point.revenueCents += order.total_cents;
  }

  const [items, products, profiles] = await Promise.all([
    orderRows.length > 0
      ? db
          .from("order_items")
          .select("order_id, product_id, unit_price_cents")
          .in("order_id", orderRows.map((o) => o.id))
      : Promise.resolve({ data: [] as ItemRow[], error: null }),
    db.from("products").select("id, title, creator_id, status, is_published, deleted_at"),
    db.from("profiles").select("id, display_name, is_creator"),
  ]);

  const itemRows = (items.data ?? []) as ItemRow[];
  const productRows = (products.data ?? []) as {
    id: string;
    title: string;
    creator_id: string | null;
    status: string | null;
    is_published: boolean;
    deleted_at: string | null;
  }[];
  const profileRows = (profiles.data ?? []) as {
    id: string;
    display_name: string;
    is_creator: boolean | null;
  }[];

  const titles = new Map(productRows.map((p) => [p.id, p.title]));
  const names = new Map(profileRows.map((p) => [p.id, p.display_name]));

  const perProduct = new Map<string, { sales: number; revenueCents: number }>();
  for (const item of itemRows) {
    const current = perProduct.get(item.product_id) ?? { sales: 0, revenueCents: 0 };
    current.sales += 1;
    current.revenueCents += item.unit_price_cents;
    perProduct.set(item.product_id, current);
  }

  const topProducts = [...perProduct.entries()]
    .map(([id, v]) => ({ id, title: titles.get(id) ?? "—", ...v }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const perCreator = new Map<string, { sales: number; maps: number }>();
  for (const p of productRows) {
    if (!p.creator_id || p.deleted_at) continue;
    const current = perCreator.get(p.creator_id) ?? { sales: 0, maps: 0 };
    current.maps += 1;
    current.sales += perProduct.get(p.id)?.sales ?? 0;
    perCreator.set(p.creator_id, current);
  }

  const topCreators = [...perCreator.entries()]
    .map(([id, v]) => ({ id, displayName: names.get(id) ?? "—", ...v }))
    .sort((a, b) => b.sales - a.sales || b.maps - a.maps)
    .slice(0, 5);

  return {
    revenueCents,
    orders: orderRows.length,
    averageOrderCents:
      orderRows.length > 0 ? Math.round(revenueCents / orderRows.length) : 0,
    buyers,
    creators: profileRows.filter((p) => p.is_creator).length,
    accounts: profileRows.length,
    liveMaps: productRows.filter((p) => p.is_published && !p.deleted_at).length,
    pendingMaps: productRows.filter((p) => p.status === "pending").length,
    days: [...byDay.values()],
    topProducts,
    topCreators,
  };
}

/** Центы в «€12.50» — та же форма, что в price_label у товаров. */
export function formatMoney(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
