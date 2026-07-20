import { getSupabase } from "@/lib/supabase";

// Та же форма, что была у массива в этом файле, — карточка отзыва
// (ClientReviews.tsx) из-за переезда на БД не изменилась.
// В базе поле называется review_text: "text" там — имя типа данных,
// путались бы и SQL, и человек. Перевод — в rowToReview ниже.
export type Review = {
  slug: string;
  name: string;
  role: string;
  flag: string;
  text: string;
  accent: "orange" | "lime";
};

type ReviewRow = {
  slug: string;
  name: string;
  role: string;
  flag: string;
  review_text: string;
  accent: string;
};

export function rowToReview(row: ReviewRow): Review {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    flag: row.flag,
    text: row.review_text,
    // В базе accent — обычный text с проверкой check (orange|lime).
    // TypeScript про эту проверку не знает и видит просто string,
    // поэтому сужаем тип здесь, с явным запасным вариантом.
    accent: row.accent === "lime" ? "lime" : "orange",
  };
}

const REVIEW_FIELDS = "slug, name, role, flag, review_text, accent";

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .select(REVIEW_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Не удалось загрузить отзывы: ${error.message}`);

  return (data ?? []).map(rowToReview);
}

export async function getReview(slug: string): Promise<Review | null> {
  const { data, error } = await getSupabase()
    .from("reviews")
    .select(REVIEW_FIELDS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить отзыв "${slug}": ${error.message}`);

  return data ? rowToReview(data) : null;
}
