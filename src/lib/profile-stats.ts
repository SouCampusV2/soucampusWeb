import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Цифры на профиле у каждого (просьба владельца 25.10, по образцу
// BuiltByBit): сколько купил, сколько написал, сколько отреагировал.
//
// Служебным ключом, потому что все три таблицы закрыты от посторонних:
// заказы — личное, product_comments браузеру закрыта с 22.09, реакции
// читаются только по карте. Наружу уходит ЧИСЛО, ни одной строки — так
// же, как profile_is_client отдаёт «да/нет» без единого заказа.
//
// ⚠️ Модуль тянет служебный ключ — только для серверных компонентов.

export type ProfileStats = {
  /** Разных купленных карт, по оплаченным заказам под аккаунтом. */
  purchases: number | null;
  /** Живых комментариев — удалённые не в счёт. */
  comments: number | null;
  /** Реакций, поставленных человеком под картами. */
  reactions: number | null;
};

/**
 * Три числа одним махом. null у числа — не «ноль», а «не узнали»:
 * страница покажет прочерк, а не соврёт нулём.
 */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  // Без служебного ключа — «не узнали», а не падение. Ключа нет в CI, а
  // страница профиля собирается заранее (generateStaticParams): 25–26.10
  // исключение отсюда роняло сборку в CI четыре прогона подряд, пока
  // локально, с .env.local, всё было зелёным. Тот же приём, что у
  // счётчиков просмотров (views.ts).
  let db: ReturnType<typeof getSupabaseAdmin>;
  try {
    db = getSupabaseAdmin();
  } catch (err) {
    console.warn(
      `Статистика профиля недоступна, страница соберётся с прочерками: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { purchases: null, comments: null, reactions: null };
  }

  const [orders, comments, reactions] = await Promise.all([
    // Разные карты, а не строки: одна карта, купленная гостем и потом
    // под аккаунтом, — одна покупка. Гостевые заказы без user_id сюда
    // не попадают: связать их с человеком можно только по почте, а
    // почту профиля мы наружу не трогаем.
    db
      .from("order_items")
      .select("product_id, orders!inner(user_id, status)")
      .eq("orders.user_id", userId)
      .eq("orders.status", "paid"),
    db
      .from("product_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_by", null),
    db
      .from("product_reactions")
      .select("product_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  for (const [name, result] of [
    ["заказы", orders],
    ["комментарии", comments],
    ["реакции", reactions],
  ] as const) {
    if (result.error) console.warn(`Статистика профиля (${name}): ${result.error.message}`);
  }

  return {
    purchases: orders.error
      ? null
      : new Set((orders.data ?? []).map((row) => row.product_id)).size,
    comments: comments.error ? null : (comments.count ?? 0),
    reactions: reactions.error ? null : (reactions.count ?? 0),
  };
}
