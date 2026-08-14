import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ProductCategory, ProductStatus } from "@/lib/products";

// Каталог админки — ВСЕ карты, не только очередь разбора.
//
// Зачем отдельно от moderation.ts: там очередь (status = 'pending',
// подписанные ссылки на файлы, галереи — всё для решения «пускать ли»).
// Здесь наоборот — плоский список для управления уже живущими картами,
// и грузить ради него галереи и подписывать ссылки на файлы было бы
// расточительно: строк тут со временем будут сотни.
//
// Читается служебным ключом: RLS отдаёт анониму только опубликованное, а
// смысл этой страницы ровно в том, чтобы видеть и снятое, и отклонённое,
// и удалённое.

export type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string;
  status: ProductStatus;
  isPublished: boolean;
  category: ProductCategory | null;
  /** null — на витрине; иначе кто снял. */
  hiddenBy: "creator" | "moderator" | "revoked" | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  createdAt: string;
  creator: { id: string; displayName: string } | null;
  /** Сколько раз купили — по оплаченным заказам. */
  sales: number;
};

export type CatalogFilters = {
  /** Поиск по названию, slug и имени автора. */
  q?: string;
  status?: ProductStatus | "hidden" | "deleted";
  creatorId?: string;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  price_label: string;
  status: ProductStatus | null;
  is_published: boolean;
  category: ProductCategory | null;
  hidden_by: "creator" | "moderator" | null;
  suspension_reason: string | null;
  deleted_at: string | null;
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
      "id, slug, title, image_url, price_label, status, is_published, category, hidden_by, suspension_reason, deleted_at, created_at, creator_id"
    )
    .order("created_at", { ascending: false });

  if (filters.status === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else {
    query = query.is("deleted_at", null);

    if (filters.status === "hidden") {
      // «Снятые» — это не статус, а состояние витрины: карта разобрана и
      // одобрена, но не показывается (см. миграцию 20260809120000).
      query = query.eq("status", "published").eq("is_published", false);
    } else if (filters.status) {
      query = query.eq("status", filters.status);
    }
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
  const names = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }

  const sales = await getSalesCounts(rows.map((r) => r.id));

  const mapped = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.image_url,
    price: row.price_label,
    status: row.status ?? "published",
    isPublished: Boolean(row.is_published),
    category: row.category,
    hiddenBy: row.hidden_by,
    suspensionReason: row.suspension_reason,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    creator: row.creator_id
      ? { id: row.creator_id, displayName: names.get(row.creator_id) ?? "—" }
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
      (p.creator?.displayName.toLowerCase().includes(q) ?? false)
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
    live: rows.filter((r) => r.isPublished && !r.deletedAt).length,
    hidden: rows.filter((r) => !r.isPublished && r.status === "published").length,
    sales: rows.reduce((sum, r) => sum + r.sales, 0),
  };
}
