import { getSupabase } from "@/lib/supabase";

// Реакция на карту (миграция 20260821170000).
//
// У карты ОДНА реакция, и выбирает её автор из списка, который владелец
// ведёт в базе. Посетители по ней жмут, как по лайку. Разбор, почему
// список живёт в базе, а не в коде (в отличие от палитры цвета ника), —
// в самой миграции.

export type ReactionOption = {
  id: string;
  emoji: string;
  /** Слово для средства чтения с экрана: смайлик сам по себе немой. */
  label: string;
  /**
   * Картинка 24×24 вместо символа — то, чем реакции станут. Когда
   * заполнена, показывается она; emoji остаётся запасным вариантом и
   * подписью в списке выбора.
   */
  imageUrl: string | null;
};

type Row = {
  id: string;
  emoji: string;
  label: string;
  image_url: string | null;
};

/**
 * Список доступных реакций.
 *
 * Пустой массив при любой беде — реакция украшение, а не содержание:
 * форма загрузки обязана открыться, даже если миграция ещё не прогнана
 * (тот же довод, что у getViewCounts и get_product_stats).
 */
export async function getReactionOptions(): Promise<ReactionOption[]> {
  const { data, error } = await getSupabase()
    .from("reaction_options")
    .select("id, emoji, label, image_url")
    .order("sort_order");

  if (error) {
    console.warn(`Список реакций недоступен: ${error.message}`);
    return [];
  }

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    emoji: r.emoji,
    label: r.label,
    imageUrl: r.image_url,
  }));
}

/**
 * Сколько нажатий у карт. Одним запросом на весь список, а не по
 * запросу на карту — иначе витрина из двадцати карточек дала бы
 * двадцать походов в базу.
 */
export async function getReactionCounts(
  productIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (productIds.length === 0) return counts;

  const { data, error } = await getSupabase().rpc("get_reaction_counts", {
    p_ids: productIds,
  });

  if (error) {
    console.warn(`Счётчики реакций недоступны: ${error.message}`);
    return counts;
  }

  for (const row of (data ?? []) as { product_id: string; reactions: number }[]) {
    counts.set(row.product_id, Number(row.reactions));
  }
  return counts;
}
