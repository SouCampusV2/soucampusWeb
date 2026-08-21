import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ProductCategory, ProductState } from "@/lib/products";

// Каталог админки — ВСЕ карты, не только очередь разбора.
//
// Зачем отдельно от moderation.ts: там очередь (state = 'pending',
// подписанные ссылки на файлы, галереи — всё для решения «пускать ли»).
// Здесь наоборот — плоский список для управления уже живущими картами,
// и грузить ради него галереи и подписывать ссылки на файлы было бы
// расточительно: строк тут со временем будут сотни.
//
// Читается служебным ключом: RLS отдаёт анониму только живые карты, а
// смысл этой страницы ровно в том, чтобы видеть и снятое, и отклонённое,
// и удалённое.

export type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string;
  /** Где карта находится — одно значение на всё (см. ProductState). */
  state: ProductState;
  /**
   * Активен ли автор как креатор. Отдельно от state намеренно: карта
   * остаётся `live`, а с витрины её держит закрытый доступ автора —
   * поэтому в каталоге у неё бейдж «Creator revoked», а не «Taken down».
   */
  creatorActive: boolean;
  category: ProductCategory | null;
  suspensionReason: string | null;
  /** Кто увёл карту в deleted: сам автор или площадка. */
  deletedBy: "creator" | "moderator" | null;
  createdAt: string;
  creator: { id: string; username: string } | null;
  /** Сколько раз купили — по оплаченным заказам. */
  sales: number;
};

export type CatalogFilters = {
  /** Поиск по названию, slug и имени автора. */
  q?: string;
  state?: ProductState;
  creatorId?: string;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  price_label: string;
  state: ProductState;
  creator_active: boolean;
  category: ProductCategory | null;
  suspension_reason: string | null;
  deleted_by: "creator" | "moderator" | null;
  created_at: string;
  creator_id: string | null;
};

/**
 * Весь каталог с фильтрами. Удалённые показываются только по явному
 * запросу: обычно они шум, но полностью прятать их нельзя — тогда
 * «удалена автором» становится состоянием, которого никто не видит,
 * и концы теряются.
 */
export async function getCatalog(filters: CatalogFilters = {}): Promise<CatalogRow[]> {
  const db = getSupabaseAdmin();

  let query = db
    .from("products")
    .select(
      "id, slug, title, image_url, price_label, state, creator_active, category, suspension_reason, deleted_by, created_at, creator_id"
    )
    .order("created_at", { ascending: false });

  // Фильтр стал одним сравнением. Раньше здесь были три ветки на четыре
  // колонки, и «снятые» приходилось выражать как «status = published И
  // не опубликована» — состояние, у которого не было своего имени.
  // Теперь имя есть у каждого.
  if (filters.state) {
    query = query.eq("state", filters.state);
  } else {
    // Без явного фильтра удалённые не показываем: обычно они шум. Но и
    // прятать их совсем нельзя — тогда «удалена автором» становится
    // состоянием, которого никто не видит, и концы теряются.
    query = query.neq("state", "deleted");
  }

  if (filters.creatorId) query = query.eq("creator_id", filters.creatorId);

  const { data, error } = await query;
  if (error) {
    // Не роняем страницу: пока миграция не прогнана, колонок нет. Тот же
    // приём, что у getOwnProducts и get_product_stats.
    console.warn(`Каталог недоступен: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as unknown as Row[];

  // Ники авторов и число продаж — двумя запросами на всю страницу, а не
  // по запросу на строку.
  const creatorIds = Array.from(
    new Set(rows.map((r) => r.creator_id).filter((id): id is string => Boolean(id)))
  );
  // Имя человека — ОДНО (миграция 20260821150000): оно же логин, оно же
  // адрес профиля.
  const names = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username")
      .in("id", creatorIds);
    for (const p of profiles ?? []) names.set(p.id, p.username);
  }

  const sales = await getSalesCounts(rows.map((r) => r.id));

  const mapped = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.image_url,
    price: row.price_label,
    state: row.state,
    creatorActive: row.creator_active !== false,
    category: row.category,
    suspensionReason: row.suspension_reason,
    deletedBy: row.deleted_by,
    createdAt: row.created_at,
    creator: row.creator_id
      ? { id: row.creator_id, username: names.get(row.creator_id) ?? "—" }
      : null,
    sales: sales.get(row.id) ?? 0,
  }));

  // Поиск фильтруем ЗДЕСЬ, а не в запросе: искать надо и по имени автора,
  // а оно живёт в другой таблице, связь с которой мы собираем на своей
  // стороне (внешний ключ ведёт на закрытую RLS profiles — вложенная
  // выборка PostgREST вернула бы null, см. lib/creators.ts). Пока карт
  // сотни, это дешевле отдельного полнотекстового индекса; упрётся —
  // переходить на tsvector, а не на ilike по трём колонкам.
  const q = filters.q?.trim().toLowerCase();
  if (!q) return mapped;

  return mapped.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.creator?.username.toLowerCase().includes(q) ?? false)
  );
}

/** Число оплаченных покупок по каждой карте. */
async function getSalesCounts(productIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (productIds.length === 0) return counts;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("order_items")
    .select("product_id, orders!inner(status)")
    .in("product_id", productIds)
    .eq("orders.status", "paid");

  if (error) {
    console.warn(`Продажи недоступны: ${error.message}`);
    return counts;
  }

  for (const row of (data ?? []) as { product_id: string }[]) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  return counts;
}

/** Сводка для шапки каталога. */
export function summarize(rows: CatalogRow[]) {
  return {
    total: rows.length,
    // «На витрине» — это живая карта активного автора, ровно то же
    // условие, что в политике чтения. Раньше здесь повторялась формула из
    // двух колонок, и разойтись с политикой она могла молча.
    live: rows.filter((r) => r.state === "live" && r.creatorActive).length,
    hidden: rows.filter((r) => r.state === "hidden" || r.state === "suspended")
      .length,
    sales: rows.reduce((sum, r) => sum + r.sales, 0),
  };
}
