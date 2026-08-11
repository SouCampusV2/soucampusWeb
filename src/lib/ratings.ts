import type { SupabaseClient } from "@supabase/supabase-js";

// Оценки текущего пользователя по его товарам — чтобы в «My purchases»
// подсветить уже выставленные звёзды. RLS отдаёт только СВОИ строки
// (политика "read own ratings"), так что фильтр по user_id — для явности.
//
// Оценки не критичны для профиля: если запрос упал, просто возвращаем
// пустую карту (профиль и скачивания важнее одной подсветки звёзд).
export async function readUserRatings(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("product_ratings")
    .select("product_id, stars")
    .eq("user_id", userId);

  if (error) return new Map();

  // Number() — колонка стала numeric ради половинок (миграция
  // 20260811130000), а numeric драйвер отдаёт строкой, чтобы не терять
  // точность на больших числах. Для "4.5" это лишнее, но сравнение
  // `value <= stars` на строке молча врёт.
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { product_id: string; stars: number | string }[]) {
    map.set(row.product_id, Number(row.stars));
  }
  return map;
}
