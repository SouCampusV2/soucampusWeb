import type { SupabaseClient } from "@supabase/supabase-js";

// Свои отзывы текущего пользователя по его покупкам — чтобы в «My
// purchases» форма открывалась с уже выставленными звёздами и текстом.
// RLS отдаёт только СВОИ строки (политика "read own ratings"), так что
// фильтр по user_id — для явности.
//
// Отзывы не критичны для страницы: если запрос упал, просто возвращаем
// пустую карту (покупки и скачивания важнее).

export type OwnReview = { stars: number; body: string };

export async function readUserRatings(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, OwnReview>> {
  const query = (fields: string) =>
    supabase.from("product_ratings").select(fields).eq("user_id", userId);

  // body — из 20261026130000. Пока база её не знает, читаем без неё:
  // звёзды всё равно подсветятся.
  let { data, error } = await query("product_id, stars, body");
  if (error?.message.includes("body")) {
    ({ data, error } = await query("product_id, stars"));
  }
  if (error) return new Map();

  // Number() — колонка стала numeric ради половинок (миграция
  // 20260811130000), а numeric драйвер отдаёт строкой, чтобы не терять
  // точность на больших числах. Для "4.5" это лишнее, но сравнение
  // `value <= stars` на строке молча врёт.
  const map = new Map<string, OwnReview>();
  for (const row of (data ?? []) as unknown as {
    product_id: string;
    stars: number | string;
    body?: string | null;
  }[]) {
    map.set(row.product_id, { stars: Number(row.stars), body: row.body ?? "" });
  }
  return map;
}
