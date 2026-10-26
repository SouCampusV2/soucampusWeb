// Объявление в Discord — тем же нажатием, что и на сайте (2026-10-26).
//
// /admin/announce раскладывал объявление только по колоколам сайта.
// Теперь оно может уйти и в канал объявлений Discord — вебхуком
// DISCORD_ANNOUNCE_WEBHOOK_URL. Вебхук годится любой, хоть созданный
// руками в настройках канала: здесь обычный текст, без компонентов,
// которые требуют вебхука от приложения.
//
// Чистые функции + один fetch: формат сообщения проверяется тестом без
// сети.

import type { DiscordIdentity } from "@/lib/discord-identity";

export type AnnouncePing = "none" | "here" | "everyone";

export type DiscordAnnouncement = {
  title: string;
  text: string | null;
  /** Путь на сайте (/marketplace) — в Discord станет полной ссылкой. */
  href: string | null;
  ping: AnnouncePing;
};

/** Предел Discord на content обычного сообщения. */
const CONTENT_MAX = 2000;

/** Текст сообщения: крупный заголовок, текст, ссылка, пинг в конце. */
export function announcementContent(a: DiscordAnnouncement, siteUrl: string): string {
  const site = siteUrl.replace(/\/$/, "");
  const link = a.href ? (a.href.startsWith("/") ? `${site}${a.href}` : a.href) : null;
  const ping = a.ping === "none" ? "" : `@${a.ping}`;
  const parts = [`## ${a.title.trim()}`, a.text?.trim() ?? "", link ?? "", ping].filter(Boolean);
  const content = parts.join("\n");
  return content.length > CONTENT_MAX ? `${content.slice(0, CONTENT_MAX - 1)}…` : content;
}

/** Тело запроса вебхука. Пингует только то, что выбрано явно. */
export function announcementPayload(
  a: DiscordAnnouncement,
  siteUrl: string,
  identity: DiscordIdentity
) {
  return {
    content: announcementContent(a, siteUrl),
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
  const res = await fetchFn(`${webhookUrl}${webhookUrl.includes("?") ? "&" : "?"}wait=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  return `Discord answered ${res.status}: ${(await res.text()).slice(0, 200)}`;
}
