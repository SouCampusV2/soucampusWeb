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
  /** Аватары клиента — из public/reviews. Пусто — рисуется заглушка. */
  avatars: string[];
};

// Аватары живут в коде, а не в базе, и это сознательно: сами файлы лежат в
// public/, то есть приезжают деплоем. Колонка в базе ссылалась бы на файл,
// которого в ветке может ещё не быть, а миграция ради десяти картинок —
// два прогона (preview и прод) на то, что меняется раз в полгода.
// Ключ — slug отзыва. Массив, потому что отзыв бывает от двоих
// (Luke & Sven): у каждого свой аватар, и склеивать их в одну картинку
// значило бы рисовать то, чего клиент не присылал.
// Есть тест: каждый путь отсюда обязан существовать в public/.
export const REVIEW_AVATARS: Record<string, string[]> = {
  erik: ["/reviews/erik.png"],
  ghost: ["/reviews/ghost.png"],
  rambomine: ["/reviews/rambomine.png"],
  "the-erik-cz": ["/reviews/the-erik-cz.png"],
  scooter: ["/reviews/scooter.png"],
  "luke-and-sven": ["/reviews/luke.png", "/reviews/sven.png"],
  nathan: ["/reviews/nathan.png"],
  giel: ["/reviews/giel.png"],
  muthely: ["/reviews/muthely.png"],
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
    avatars: REVIEW_AVATARS[row.slug] ?? [],
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
