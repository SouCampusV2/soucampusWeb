// Форма уведомления — то, что нужно ОБЕИМ сторонам.
//
// Отдельный файл появился по вполне физической причине: lib/notifications.ts
// тянет служебный ключ (supabase-admin) на верхнем уровне, и любой импорт
// оттуда из клиентского компонента утащил бы этот модуль в браузерный
// бандл. Для типов это безопасно (import type стирается при сборке), а вот
// для функции разбора строки и для лимита — уже нет.
//
// Здесь поэтому только то, что не знает ни про какие ключи: как выглядит
// уведомление и как превратить строку базы в него. И сервер, и браузер
// читают одну и ту же таблицу, и разбирать её двумя разными способами —
// верный путь к тому, что однажды они разойдутся.

export type NotificationKind =
  | "creator_application_submitted"
  | "creator_approved"
  | "creator_rejected"
  | "creator_revoked"
  | "map_approved"
  | "map_rejected"
  | "map_suspended"
  | "map_sold"
  | "purchase"
  | "announcement";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

/** Колонки, которые читают обе стороны. Один список — один запрос. */
export const NOTIFICATION_COLUMNS =
  "id, kind, title, body, href, created_at, read_at";

/** Сколько страниц уведомлений показываем — дальше уже архив. */
export const NOTIFICATIONS_LIMIT = 50;

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
