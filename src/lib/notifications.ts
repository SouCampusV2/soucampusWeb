import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Уведомления: что площадка говорит человеку сама, без его вопроса.
//
// Пишутся ТОЛЬКО отсюда и только служебным ключом — политики insert у
// таблицы нет вовсе (см. миграцию 20260810120000). Читает каждый свои,
// под своей сессией: подмешивать сюда служебный ключ незачем, RLS уже
// отфильтрует чужие строки.

// Тип, разбор строки и лимит живут в notification-shape.ts — их читает и
// браузер, а сюда ему нельзя (в шапке этого файла служебный ключ).
// Реэкспорт оставлен, чтобы для остального кода ничего не менялось.
export type {
  Notification,
  NotificationKind,
} from "@/lib/notification-shape";
export { NOTIFICATIONS_LIMIT } from "@/lib/notification-shape";

import {
  NOTIFICATION_COLUMNS,
  NOTIFICATIONS_LIMIT,
  toNotification,
  type Notification,
  type NotificationKind,
  type NotificationRow,
} from "@/lib/notification-shape";

const MAX_TITLE = 160;
const MAX_BODY = 1000;

/**
 * Ссылка уведомления — только внутрь сайта.
 *
 * В href едет текст, который в некоторых случаях складывается из
 * пользовательских данных (slug карты), а само уведомление человек видит
 * как сообщение ОТ САЙТА и кликает не глядя. Это ровно та комбинация, из
 * которой получается фишинг, поэтому наружу не пускаем вообще: путь
 * обязан начинаться с одного слэша. `//evil.com` браузер считает внешним
 * адресом — отсюда вторая проверка.
 */
function safeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  return href;
}

export type NewNotification = {
  kind: NotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
};

/**
 * Отправить уведомление одному человеку.
 *
 * НИКОГДА не бросает и не возвращает ошибку. Уведомление — всегда
 * побочное действие чего-то более важного: оплаты, одобрения карты,
 * отзыва статуса. Уронить оплату из-за ненаписанной строки в почтовом
 * ящике было бы обменом ценного на дешёвое. Ошибка уходит в лог сервера.
 */
export async function notify(
  userId: string,
  notification: NewNotification
): Promise<void> {
  await notifyMany([userId], notification);
}

/** То же для списка адресатов — одной вставкой, а не циклом запросов. */
export async function notifyMany(
  userIds: string[],
  notification: NewNotification
): Promise<void> {
  const recipients = Array.from(new Set(userIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const rows = recipients.map((userId) => ({
    user_id: userId,
    kind: notification.kind,
    title: notification.title.slice(0, MAX_TITLE),
    body: notification.body?.slice(0, MAX_BODY) ?? null,
    href: safeHref(notification.href),
  }));

  try {
    const { error } = await getSupabaseAdmin().from("notifications").insert(rows);
    if (error) console.error("Уведомление не отправлено:", error.message);
  } catch (err) {
    console.error(
      "Уведомление не отправлено:",
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Разослать всем аккаунтам — распродажа, смена правил.
 *
 * Веером по строке на человека (почему так — в шапке миграции). Список
 * берём из profiles: строка там есть у каждого зарегистрированного,
 * триггер заводит её при регистрации.
 */
export async function notifyEveryone(
  notification: NewNotification
): Promise<number> {
  try {
    const { data, error } = await getSupabaseAdmin().from("profiles").select("id");
    if (error) {
      console.error("Рассылка: список получателей недоступен:", error.message);
      return 0;
    }
    const ids = (data ?? []).map((row) => row.id as string);
    await notifyMany(ids, notification);
    return ids.length;
  } catch (err) {
    console.error(
      "Рассылка не удалась:",
      err instanceof Error ? err.message : err
    );
    return 0;
  }
}

/** Аккаунт в выпадашке «кому» на странице рассылки. */
export type Recipient = { id: string; username: string };

/**
 * Все аккаунты — для выбора адресата в админке. Служебным ключом: чужие
 * строки profiles закрыты RLS, а владельцу нужен именно чужой список.
 *
 * Без пагинации намеренно: при сотнях аккаунтов выпадашка справляется, а
 * когда их станет тысячи, выпадашка перестанет быть подходящим способом
 * выбора раньше, чем запрос станет тяжёлым, — и менять придётся её, а не
 * этот запрос.
 */
export async function getRecipients(): Promise<Recipient[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("id, username")
      .order("username");

    if (error) {
      console.warn(`Список получателей недоступен: ${error.message}`);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id as string,
      username: row.username as string,
    }));
  } catch {
    return [];
  }
}

/** Все админы — адресаты служебных уведомлений (новая заявка и т.п.). */
export async function getAdminIds(): Promise<string[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("profiles")
      .select("id")
      .eq("is_admin", true);
    if (error) {
      console.error("Список админов недоступен:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.id as string);
  } catch {
    return [];
  }
}

/** Свои уведомления, свежие сверху. Под сессией пользователя. */
export async function getNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error) {
    // Страница не должна падать из-за списка уведомлений — и особенно
    // из-за непрогнанной миграции.
    console.warn(`Уведомления недоступны: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => toNotification(row as NotificationRow));
}

/**
 * Сколько непрочитанных. Отдельным запросом с head: считаем строки, не
 * вытаскивая их — колокол в навбаре показывает только число.
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.warn(`Счётчик уведомлений недоступен: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}
