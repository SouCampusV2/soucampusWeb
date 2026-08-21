import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  COMMENT_COLUMNS,
  commentAuthors,
  rowToComment,
  // ⚠️ Именно ИМПОРТ, а не только реэкспорт ниже. `export type { Comment }`
  // пробрасывает имя наружу, но в этом файле его не заводит — и
  // `AdminComment = Comment & {…}` тихо цеплялся к глобальному DOM-типу
  // Comment (узел комментария в HTML). Ошибка выглядела как «у
  // AdminComment нет ни одного поля».
  type Comment,
  type CommentRow,
} from "@/lib/comment-shape";

// ⚠️ Этот модуль тянет служебный ключ и клиентским компонентам НЕДОСТУПЕН.
// Всё, что нужно и браузеру тоже (список колонок, разбор строки, тип), —
// в comment-shape.ts. Разбор причины там же.
export type { Comment } from "@/lib/comment-shape";

// Комментарии под картой (миграция 20260821180000).
//
// Писать может только купивший — и решает это БАЗА (политика
// "insert own comment if bought" через has_purchased). Здесь нет и не
// должно быть проверки прав: запись идёт из браузера прямо в таблицу,
// наш код в этом пути не стоит.

/**
 * Колонки ленты. Одна строка на все три места, где лента читается
 * (сервер, админка, дочитывание в браузере) — иначе они разъедутся, как
 * уже разъезжались семь копий градиента.
 */
/** Лента под картой. Новые сверху. */
export async function getComments(productId: string): Promise<Comment[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("product_comments")
    .select(COMMENT_COLUMNS)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    // Лента — не содержание страницы: карта обязана открыться и без неё
    // (тот же довод, что у счётчиков просмотров).
    console.warn(`Комментарии недоступны: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as CommentRow[];
  const authors = await commentAuthors(db, [...new Set(rows.map((r) => r.user_id))]);
  return rows.map((r) => rowToComment(r, authors.get(r.user_id)));
}

/** Строка для админки: комментарий + к какой карте он относится. */
export type AdminComment = Comment & {
  productSlug: string;
  productTitle: string;
};

/**
 * Все комментарии сайта — для раздела админки.
 *
 * Служебным ключом: владельцу нужен ЧУЖОЙ список, а обычному читателю
 * доступна только лента одной карты (тот же случай, что у очереди карт).
 */
export async function getAllComments(limit = 200): Promise<AdminComment[]> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("product_comments")
    .select(`${COMMENT_COLUMNS}, products(slug, title)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`Комментарии для админки недоступны: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as unknown as (CommentRow & {
    products: { slug: string; title: string } | null;
  })[];

  const authors = await commentAuthors(db, [...new Set(rows.map((r) => r.user_id))]);

  return rows.map((row) => ({
    ...rowToComment(row, authors.get(row.user_id), true),
    productSlug: row.products?.slug ?? "",
    productTitle: row.products?.title ?? "—",
  }));
}
