import { getSupabase } from "@/lib/supabase";
import { commentAuthors } from "@/lib/comment-shape";
import type { MapReview } from "@/lib/map-review-shape";

// Чтение отзывов на карты (2026-10-26). Пишет шлюз /api/feedback.
//
// Читаем представление public_reviews АНОНИМНЫМ клиентом — как ленту
// комментариев. Служебный ключ здесь не нужен и вреден: страницы карт и
// профилей собираются заранее, а в CI ключа нет (25–26.10 сборка в CI
// падала ровно из-за этого).
//
// Отзыв — не содержание страницы: нет представления (миграция не
// прогнана) или сеть упала — пустой список, страница открывается.

type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  stars: number | string;
  body: string;
  created_at: string;
  updated_at: string;
};

const REVIEW_COLUMNS = "id, product_id, user_id, stars, body, created_at, updated_at";

async function load(filter: { productIds: string[] }): Promise<MapReview[]> {
  if (filter.productIds.length === 0) return [];
  const db = getSupabase();
  const { data, error } = await db
    .from("public_reviews")
    .select(REVIEW_COLUMNS)
    .in("product_id", filter.productIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn(`Отзывы недоступны: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as ReviewRow[];
  const authors = await commentAuthors(db, [...new Set(rows.map((r) => r.user_id))]);
  return rows.map((row) => {
    const author = authors.get(row.user_id);
    return {
      id: row.id,
      productId: row.product_id,
      userId: row.user_id,
      // numeric приезжает строкой (разбор в ratings.ts).
      stars: Number(row.stars),
      body: row.body,
      createdAt: row.created_at,
      // Минута запаса: строку при создании пишут два поля, и они могут
      // разойтись на миллисекунды.
      edited: Date.parse(row.updated_at) - Date.parse(row.created_at) > 60_000,
      username: author?.username ?? "—",
      nameColor: author?.nameColor ?? null,
      avatarUrl: author?.avatarUrl ?? null,
    };
  });
}

/** Отзывы под картой. Свежие сверху. */
export function getMapReviews(productId: string): Promise<MapReview[]> {
  return load({ productIds: [productId] });
}

/** Отзывы на все карты автора — вкладка Reviews на его профиле. */
export function getReviewsForProducts(productIds: string[]): Promise<MapReview[]> {
  return load({ productIds });
}
