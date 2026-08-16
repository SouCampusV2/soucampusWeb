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

/** Период по умолчанию, когда в адресе ничего не выбрано. */
export const WINDOW_DAYS = 30;

/** Готовые периоды в переключателе над графиком. */
export const PERIOD_PRESETS = [7, 30, 90, 365] as const;

/** Дальше 2 лет не пускаем: это не аналитика, а способ уронить страницу. */
const MAX_DAYS = 730;

export type DayPoint = { date: string; orders: number; revenueCents: number };

/** Отрезок дат, включая обе границы. Ключи в UTC — как `created_at`. */
export type Range = { from: string; to: string; days: number };

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKey(d);
}

function isDayKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Адрес → отрезок дат. Период живёт в URL, а не в состоянии компонента:
 * ссылку на «сентябрь» можно переслать себе же, а «назад» в браузере
 * возвращает прошлый период, а не уводит со страницы.
 *
 * Мусор в параметрах не роняет страницу и не показывает ошибку — просто
 * откатывает к периоду по умолчанию: это дашборд, а не форма.
 */
export function resolveRange(params: {
  days?: string;
  from?: string;
  to?: string;
}): Range {
  const today = dayKey(new Date());

  if (isDayKey(params.from) && isDayKey(params.to) && params.from <= params.to) {
    const from = params.from;
    const to = params.to > today ? today : params.to;
    const days = Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
    ) + 1;
    if (days <= MAX_DAYS) return { from, to, days };
  }

  const asked = Number(params.days);
  const days =
    Number.isInteger(asked) && asked >= 1 && asked <= MAX_DAYS ? asked : WINDOW_DAYS;

  return { from: shiftDays(today, -(days - 1)), to: today, days };
}

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
  /** Удалённые самим автором — обычная жизнь каталога. */
  deletedByAuthor: number;
  /** Удалённые площадкой — решение модерации, у него есть причина. */
  deletedBySite: number;
  days: DayPoint[];
  range: Range;
  topProducts: { id: string; title: string; sales: number; revenueCents: number }[];
  topCreators: { id: string; displayName: string; sales: number; maps: number }[];
};

type OrderRow = { id: string; total_cents: number; customer_email: string; created_at: string };
type ItemRow = { order_id: string; product_id: string; unit_price_cents: number };

export async function getOverview(
  range: Range = resolveRange({})
): Promise<Overview | null> {
  const db = getSupabaseAdmin();

  // Верхняя граница — начало СЛЕДУЮЩИХ суток, поэтому строгое `lt`:
  // с `lte` по дате отсечётся всё, что куплено позже полуночи, то есть
  // почти весь последний день.
  const since = `${range.from}T00:00:00.000Z`;
  const until = `${shiftDays(range.to, 1)}T00:00:00.000Z`;

  // Только оплаченные: pending — это брошенные корзины на стороне Stripe,
  // а failed и refunded деньгами не являются. Считать их выручкой значило
  // бы показывать владельцу цифру, которой у него нет.
  const { data: orders, error } = await db
    .from("orders")
    .select("id, total_cents, customer_email, created_at")
    .eq("status", "paid")
    .gte("created_at", since)
    .lt("created_at", until)
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
  for (let i = 0; i < range.days; i++) {
    const key = shiftDays(range.from, i);
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
    db.from("products").select("id, title, creator_id, state, creator_active, deleted_by"),
    db.from("profiles").select("id, display_name, is_creator"),
  ]);

  const itemRows = (items.data ?? []) as ItemRow[];
  const productRows = (products.data ?? []) as {
    id: string;
    title: string;
    creator_id: string | null;
    state: string;
    creator_active: boolean;
    deleted_by: "creator" | "moderator" | null;
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
    if (!p.creator_id || p.state === "deleted") continue;
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
    // «На витрине» — то же условие, что в политике чтения: живая карта
    // активного автора.
    liveMaps: productRows.filter((p) => p.state === "live" && p.creator_active)
      .length,
    pendingMaps: productRows.filter((p) => p.state === "pending").length,
    // Удаления считаем РАЗДЕЛЬНО. «Автор передумал» и «убрала площадка» —
    // два разных события, и одно число на оба портит картину в обе
    // стороны: то ли у нас много нарушений, то ли авторы много удаляют.
    deletedByAuthor: productRows.filter(
      (p) => p.state === "deleted" && p.deleted_by === "creator"
    ).length,
    deletedBySite: productRows.filter(
      (p) => p.state === "deleted" && p.deleted_by !== "creator"
    ).length,
    days: [...byDay.values()],
    range,
    topProducts,
    topCreators,
  };
}

/** Центы в «€12.50» — та же форма, что в price_label у товаров. */
export function formatMoney(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
