// Объявление в Discord — тем же нажатием, что и на сайте (2026-10-26).
//
// /admin/announce раскладывал объявление только по колоколам сайта.
// Теперь оно может уйти и в канал объявлений Discord — вебхуком
// DISCORD_ANNOUNCE_WEBHOOK_URL. Вебхук годится любой, хоть созданный
// руками в настройках канала: эмбед, в отличие от компонентов витрины,
// вебхука от приложения не требует.
//
// С 27.10 объявление — эмбед с оранжевой плашкой сайта слева, а не
// голый текст. Пинг остаётся в content: внутри эмбеда @everyone не
// срабатывает.
//
// Чистые функции + один fetch: формат сообщения проверяется тестом без
// сети.

import type { DiscordIdentity } from "@/lib/discord-identity";
import { callWebhook, webhookError, withParams } from "@/lib/discord-webhook";

export type AnnouncePing = "none" | "here" | "everyone";

export type DiscordAnnouncement = {
  title: string;
  text: string | null;
  /** Путь на сайте (/marketplace) — в Discord станет полной ссылкой. */
  href: string | null;
  ping: AnnouncePing;
};

/** Пределы Discord на эмбед. */
const TITLE_MAX = 256;
const DESCRIPTION_MAX = 4096;

/** Оранжевый сайта (#F97316) — плашка слева у эмбеда. */
export const ANNOUNCE_COLOR = 0xf97316;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Путь на сайте → полная ссылка; внешняя ссылка — как есть. */
function fullLink(href: string | null, siteUrl: string): string | null {
  if (!href) return null;
  return href.startsWith("/") ? `${siteUrl.replace(/\/$/, "")}${href}` : href;
}

/** Тело запроса вебхука. Пингует только то, что выбрано явно. */
export function announcementPayload(
  a: DiscordAnnouncement,
  siteUrl: string,
  identity: DiscordIdentity
) {
  const url = fullLink(a.href, siteUrl);
  const text = a.text?.trim();
  return {
    content: a.ping === "none" ? undefined : `@${a.ping}`,
    embeds: [
      {
        title: clip(a.title.trim(), TITLE_MAX),
        ...(text ? { description: clip(text, DESCRIPTION_MAX) } : {}),
        ...(url ? { url } : {}),
        color: ANNOUNCE_COLOR,
      },
    ],
    allowed_mentions: { parse: a.ping === "none" ? [] : ["everyone"] },
    username: identity.username,
    ...(identity.avatarUrl ? { avatar_url: identity.avatarUrl } : {}),
  };
}

/** Отправить. null — ушло; строка — что ответил Discord. */
export async function sendDiscordAnnouncement(
  webhookUrl: string,
  payload: ReturnType<typeof announcementPayload>,
  fetchFn: typeof fetch = fetch
): Promise<string | null> {
  const res = await callWebhook(withParams(webhookUrl, "wait=true"), "POST", payload, fetchFn);
  return res.ok ? null : webhookError(res);
}
