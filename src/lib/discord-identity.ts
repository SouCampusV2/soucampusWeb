// От чьего имени сайт пишет в Discord (2026-10-26).
//
// Посты витрины и объявления уходят ВЕБХУКОМ, а не самим ботом: ссылка
// вебхука умеет писать только в свой канал, а токен бота — всё на
// сервере, и на Vercel его не кладём (разбор — discord-showcase.ts,
// ARCHITECTURE.md § 5.6). Подпись у сообщения вебхука — та, что пришлёт
// сайт (username, avatar_url); не пришлёт — имя самого вебхука
// («SouCampus Showcase»). Отсюда вопрос владельца 26.10: «почему пишет не
// наш бот?».
//
// Ответ здесь: имя и иконку берём у ПРИЛОЖЕНИЯ бота. Вебхук витрины
// создал бот, значит у вебхука есть application_id, а имя и иконку
// приложения Discord отдаёт без всякого ключа (/applications/<id>/rpc).
// Пост тогда подписан как бот — тем же именем и той же картинкой, с
// плашкой APP. Не удалось — запасное имя без картинки, публикация от
// этого не ломается.

export type DiscordIdentity = { username: string; avatarUrl: string | null };

/** Если Discord не ответил — хотя бы имя бота. */
export const FALLBACK_IDENTITY: DiscordIdentity = { username: "BoCampus", avatarUrl: null };

/** id и токен из ссылки вебхука; null — ссылка не похожа на вебхук. */
export function parseWebhookUrl(url: string): { id: string; token: string } | null {
  const match = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/(\d+)\/([\w-]+)\/?$/.exec(
    url.trim()
  );
  return match ? { id: match[1], token: match[2] } : null;
}

/**
 * Имя и иконка приложения, которому принадлежит вебхук.
 *
 * fetchFn снаружи — ради тестов. На сервере Next кэширует ответы на сутки
 * (next.revalidate): имя бота меняется раз в полгода, а страница
 * редактора открывается часто.
 */
export async function getDiscordBotIdentity(
  webhookUrl: string | undefined,
  fetchFn: typeof fetch = fetch
): Promise<DiscordIdentity> {
  const parsed = webhookUrl ? parseWebhookUrl(webhookUrl) : null;
  if (!parsed) return FALLBACK_IDENTITY;
  const cache = { next: { revalidate: 86_400 } } as RequestInit;
  try {
    const hook = await fetchFn(
      `https://discord.com/api/v10/webhooks/${parsed.id}/${parsed.token}`,
      cache
    );
    if (!hook.ok) return FALLBACK_IDENTITY;
    const { application_id: appId } = (await hook.json()) as { application_id?: string | null };
    if (!appId) return FALLBACK_IDENTITY;

    const app = await fetchFn(`https://discord.com/api/v10/applications/${appId}/rpc`, cache);
    if (!app.ok) return FALLBACK_IDENTITY;
    const { name, icon } = (await app.json()) as { name?: string; icon?: string | null };
    return {
      // «Discord» в имени вебхук не примет (checkPost) — на всякий случай.
      username: name && !/discord/i.test(name) ? name : FALLBACK_IDENTITY.username,
      avatarUrl: icon ? `https://cdn.discordapp.com/app-icons/${appId}/${icon}.png?size=256` : null,
    };
  } catch {
    return FALLBACK_IDENTITY;
  }
}
