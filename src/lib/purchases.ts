import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Купил ли этот человек эту карту — вопрос СЕРВЕРА (2026-09-21).
 *
 * В базе на него отвечает has_purchased(product_id), но она берёт
 * человека из JWT (auth.uid()/auth.email()), а у служебного ключа JWT
 * пустой: под ним она всегда отвечает «нет». Поэтому у неё появился
 * близнец has_purchased_for(product_id, user_id, email), которому
 * человека называют явно (миграция 20260921120000).
 *
 * ⚠️ Правило осталось В БАЗЕ, и переписывать его здесь запросом к
 * orders нельзя. Оно с подвохом: заказ засчитывается и по user_id, и по
 * почте гостевого заказа — иначе покупка, сделанная до регистрации,
 * перестала бы считаться. Две копии такого правила однажды ответят
 * по-разному, и человек молча потеряет право, за которое заплатил.
 *
 * Отказ базы — это «нет». Ошибку пишем в лог: право, выданное по сбою
 * проверки, хуже отказа.
 */
export async function hasPurchased(
  productId: string,
  userId: string,
  email: string | undefined
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("has_purchased_for", {
    p_product_id: productId,
    p_user_id: userId,
    p_email: email ?? null,
  });

  if (error) {
    console.error("Проверка покупки не сработала:", error.message);
    return false;
  }
  return data === true;
}
