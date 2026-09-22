// Форма комментария — то, что нужно ОБЕИМ сторонам.
//
// ⚠️ ОТДЕЛЬНЫЙ ФАЙЛ ПО ФИЗИЧЕСКОЙ ПРИЧИНЕ, а не ради красоты.
// lib/comments.ts тянет служебный ключ (supabase-admin) на верхнем
// уровне — он нужен админке, которой положено читать чужие строки. Любой
// импорт ЗНАЧЕНИЯ оттуда из клиентского компонента утащил бы этот модуль
// в браузерный бандл. Для типов это безопасно (import type стирается при
// сборке), а для списка колонок и функции разбора — уже нет.
//
// Ровно тот же файл и ровно та же причина, что у notification-shape.ts.
// Первая версия комментариев (21.08) наступила на эти грабли: клиент
// импортировал COMMENT_COLUMNS прямо из comments.ts, и сборка на это не
// пожаловалась — служебный ключ не попал бы в бандл (у переменной нет
// префикса NEXT_PUBLIC_), но сам модуль поехал бы, а вместе с ним и
// возможность однажды позвать оттуда что-то настоящее.
//
// Здесь поэтому только то, что не знает ни про какие ключи: как выглядит
// комментарий и как превратить строку базы в него. И сервер, и браузер
// читают одну и ту же таблицу, и разбирать её двумя разными способами —
// верный путь к тому, что однажды они разойдутся.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isHexColor } from "@/lib/creators";

/**
 * Откуда лента читается снаружи — представление, а не таблица
 * (миграция 20260922120000).
 *
 * ⚠️ Текст удалённого комментария представление уже не отдаёт: его
 * режет база, а не показ. До 22.09 резал только rowToComment, а
 * product_comments отдавала body удалённого любому, кто спросит её
 * напрямую из консоли. Сама таблица браузеру закрыта; читает её только
 * админка служебным ключом — ей текст снятого нужен.
 */
export const COMMENT_FEED = "public_comments";

/** Колонки ленты. Один список на все три места, где она читается. */
export const COMMENT_COLUMNS =
  "id, product_id, user_id, body, deleted_by, created_at, updated_at";

export type Comment = {
  id: string;
  productId: string;
  userId: string;
  /** Текст. У удалённого — пустая строка: наружу он не отдаётся. */
  body: string;
  /** Кто удалил; null — комментарий живой. */
  deletedBy: "author" | "creator" | "moderator" | null;
  createdAt: string;
  /** Правили ли после написания — показ говорит об этом «edited». */
  edited: boolean;
  /** Имя написавшего. "—", если профиль недоступен. */
  username: string;
  /** Цвет ника — привилегия купивших; null у остальных. */
  nameColor: string | null;
  /** Аватар написавшего; null — рисуем заглушку того же размера. */
  avatarUrl: string | null;
};

export type CommentRow = {
  id: string;
  product_id: string;
  user_id: string;
  body: string;
  deleted_by: "author" | "creator" | "moderator" | null;
  created_at: string;
  updated_at: string;
};

/** Подпись под комментарием — приезжает из public_profiles отдельно. */
export type CommentAuthor = {
  username: string;
  nameColor: string | null;
  avatarUrl: string | null;
};

/**
 * Подписи под комментариями — одной пачкой на всю ленту.
 *
 * Клиент передаётся снаружи: на сервере это публичный или служебный, в
 * браузере — браузерный. Сама выборка одинакова, и держать её в двух
 * местах незачем.
 *
 * Из public_profiles, а не из profiles: там открыт ровно безопасный
 * поднабор колонок, и читать его может кто угодно, включая анонима.
 */
export async function commentAuthors(
  db: SupabaseClient,
  userIds: string[]
): Promise<Map<string, CommentAuthor>> {
  const map = new Map<string, CommentAuthor>();
  if (userIds.length === 0) return map;

  const { data } = await db
    .from("public_profiles")
    .select("id, username, name_color, avatar_url")
    .in("id", userIds);

  for (const p of data ?? []) {
    map.set(p.id as string, {
      username: p.username as string,
      // Цвет едет прямо в атрибут style, поэтому форма проверяется ещё
      // раз здесь. Ограничение в базе стережёт ЗАПИСЬ, это — ВЫВОД:
      // значение из базы всё равно остаётся вводом пользователя. Ровно
      // тот же рубеж, что у rowToCreator (creators.ts).
      nameColor: isHexColor(p.name_color) ? p.name_color : null,
      // Адрес картинки в атрибут src кладётся как есть — но приезжает он
      // из profiles, то есть это ввод пользователя. Пускаем только то,
      // что похоже на обычную ссылку: строку, а не javascript: и не
      // data:. Тот же рубеж «база стережёт запись, код стережёт вывод»,
      // что строкой выше у цвета.
      avatarUrl:
        typeof p.avatar_url === "string" && /^https?:\/\//.test(p.avatar_url)
          ? p.avatar_url
          : null,
    });
  }
  return map;
}

/**
 * Строка базы → комментарий сайта.
 *
 * ТЕКСТ УДАЛЁННОГО НАРУЖУ НЕ ОТДАЁТСЯ ВОВСЕ. Прятать его в разметке было
 * бы обманом: строка всё равно приезжает в браузер, и достать её из
 * инструментов разработчика — дело секунды. Раз комментарий удалён, его
 * текста не должно быть в ответе.
 *
 * @param revealDeleted показать текст даже у удалённого. ТОЛЬКО для
 * админки: мягкое удаление затем и существует, чтобы владелец мог
 * посмотреть, за что снял, и решить, что делать с написавшим. Публичной
 * ленте этот флаг не передаётся никогда.
 */
export function rowToComment(
  row: CommentRow,
  author: CommentAuthor | undefined,
  revealDeleted = false
): Comment {
  const deleted = row.deleted_by !== null;
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    body: deleted && !revealDeleted ? "" : row.body,
    deletedBy: row.deleted_by,
    createdAt: row.created_at,
    // Секунда разницы — это не правка, а погрешность записи: updated_at
    // ставит триггер, и он срабатывает в той же транзакции, что insert.
    edited:
      !deleted &&
      new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() >
        1000,
    username: author?.username ?? "—",
    nameColor: author?.nameColor ?? null,
    avatarUrl: author?.avatarUrl ?? null,
  };
}
