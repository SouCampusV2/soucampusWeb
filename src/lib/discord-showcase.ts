// Посты витрины в Discord из админки (2026-10-27).
//
// Владелец собирает пост в /admin/discord: черновик → превью «как в
// Discord» → «Publish». Сайт отправляет его сам, в вебхук канала витрины
// (DISCORD_SHOWCASE_WEBHOOK_URL). Вебхук выдаёт бот: /setup
// showcase_channel. Бот при этом ничего не делает и сайт не опрашивает.
//
// Почему вебхук, а не токен бота: ссылка вебхука умеет только писать,
// править и удалять СВОИ сообщения в ОДНОМ канале. Токен бота умеет всё
// на сервере — его на Vercel не кладём.
//
// Вебхук создан ботом (принадлежит приложению) — поэтому под постом можно
// повесить кнопки-ссылки. Кнопки-действия нельзя и не нужно.

/** Пост витрины — то, что лежит в discord_posts и рисуется в превью. */
export type ShowcasePost = {
  title: string;
  url: string | null; // заголовок-ссылка, обычно страница работы
  body: string; // текст под заголовком, Discord-markdown
  imageUrl: string | null; // большая картинка, абсолютный https
  color: string; // "#f97316"
  fields: { name: string; value: string; inline: boolean }[];
  buttons: { label: string; url: string }[];
  mention: "none" | "here" | "everyone";
  authorName: string; // строка над заголовком: "SouCampus portfolio · Order"
};

/** Работа портфолио в том виде, в каком её отдаёт getProject. */
export type ProjectForPost = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  image: string; // может быть относительным: /portfolio/x.webp
  priceLabel: string;
  sizeLabel: string;
  deadlineLabel: string;
  listingUrl: string | null;
  listingIsFree: boolean;
};

/** Относительный путь картинки → абсолютный: Discord сам не догадается. */
export function absoluteUrl(url: string | null, siteUrl: string): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${siteUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

/** Черновик из работы — стартовая точка, владелец правит всё в форме. */
export function draftFromProject(p: ProjectForPost, siteUrl: string): ShowcasePost {
  const page = `${siteUrl.replace(/\/$/, "")}/portfolio/${p.slug}`;
  const buttons = [{ label: "View on website", url: page }];
  if (p.listingUrl) buttons.push({ label: p.listingIsFree ? "Download free" : "Get this map", url: p.listingUrl });
  return {
    title: p.title,
    url: page,
    body: p.summary,
    imageUrl: absoluteUrl(p.image, siteUrl),
    color: "#f97316",
    fields: [
      { name: "Size", value: p.sizeLabel, inline: true },
      { name: "Built in", value: p.deadlineLabel, inline: true },
      { name: "Price", value: p.priceLabel, inline: true },
    ].filter((f) => f.value),
    buttons,
    mention: "none",
    authorName: `SouCampus portfolio · ${p.tag}`,
  };
}

// Пределы Discord (https://discord.com/developers/docs/resources/message#embed-object-embed-limits).
const LIMITS = { title: 256, body: 4096, fields: 25, fieldName: 256, fieldValue: 1024, total: 6000, buttons: 5, label: 80, author: 256 };
const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Похоже ли присланное на ShowcasePost по ФОРМЕ — типы полей, а не
 * пределы Discord. Черновик сохраняется и недописанным (пустой заголовок
 * — нормальный черновик), но строка, у которой fields не массив, уронила
 * бы и превью, и форму при следующем открытии. Дописано при переносе на
 * сайт 26.10.
 */
export function isShowcasePostShape(value: unknown): value is ShowcasePost {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  const text = (v: unknown) => typeof v === "string" && v.length <= 8000;
  const textOrNull = (v: unknown) => v === null || text(v);
  return (
    text(p.title) &&
    textOrNull(p.url) &&
    text(p.body) &&
    textOrNull(p.imageUrl) &&
    text(p.color) &&
    text(p.authorName) &&
    ["none", "here", "everyone"].includes(p.mention as string) &&
    Array.isArray(p.fields) &&
    p.fields.length <= 50 &&
    p.fields.every(
      (f) => f && typeof f === "object" && text(f.name) && text(f.value) && typeof f.inline === "boolean"
    ) &&
    Array.isArray(p.buttons) &&
    p.buttons.length <= 10 &&
    p.buttons.every((b) => b && typeof b === "object" && text(b.label) && text(b.url))
  );
}

/** null — пост можно отправлять; строка — что не так (показывается в форме). */
export function checkPost(post: ShowcasePost): string | null {
  if (!post.title.trim()) return "The post needs a title.";
  if (post.title.length > LIMITS.title) return `Title: at most ${LIMITS.title} characters.`;
  if (post.body.length > LIMITS.body) return `Text: at most ${LIMITS.body} characters.`;
  if (post.authorName.length > LIMITS.author) return `Top line: at most ${LIMITS.author} characters.`;
  if (!/^#[0-9a-fA-F]{6}$/.test(post.color)) return "Colour must look like #f97316.";
  if (post.url && !isHttps(post.url)) return "Title link must be an https address.";
  if (post.imageUrl && !isHttps(post.imageUrl)) return "Image must be an https address.";
  if (post.fields.length > LIMITS.fields) return `At most ${LIMITS.fields} fields.`;
  for (const f of post.fields) {
    if (!f.name.trim() || !f.value.trim()) return "Every field needs a name and a value.";
    if (f.name.length > LIMITS.fieldName || f.value.length > LIMITS.fieldValue) return "A field is too long.";
  }
  if (post.buttons.length > LIMITS.buttons) return `At most ${LIMITS.buttons} buttons.`;
  for (const b of post.buttons) {
    if (!b.label.trim() || b.label.length > LIMITS.label) return `Button labels: 1–${LIMITS.label} characters.`;
    if (!isHttps(b.url)) return "Buttons must link to https addresses.";
  }
  const total =
    post.title.length + post.body.length + post.authorName.length +
    post.fields.reduce((n, f) => n + f.name.length + f.value.length, 0);
  if (total > LIMITS.total) return `The whole post is over Discord's ${LIMITS.total}-character limit.`;
  if (!["none", "here", "everyone"].includes(post.mention)) return "Bad mention setting.";
  return null;
}

/** Тело запроса вебхука. Упоминания выключены, если владелец их не выбрал явно. */
export function toWebhookPayload(post: ShowcasePost) {
  const mention = post.mention === "none" ? "" : `@${post.mention}`;
  return {
    content: mention,
    allowed_mentions: { parse: post.mention === "none" ? [] : ["everyone"] },
    embeds: [
      {
        title: post.title,
        url: post.url ?? undefined,
        description: post.body || undefined,
        color: parseInt(post.color.slice(1), 16),
        author: post.authorName ? { name: post.authorName } : undefined,
        image: post.imageUrl ? { url: post.imageUrl } : undefined,
        fields: post.fields,
      },
    ],
    components: post.buttons.length
      ? [{ type: 1, components: post.buttons.map((b) => ({ type: 2, style: 5, label: b.label, url: b.url })) }]
      : [],
  };
}

type WebhookResult = { ok: true; messageId: string } | { ok: false; error: string };

async function call(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  fetchFn: typeof fetch
): Promise<Response> {
  return fetchFn(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const withQuery = (url: string) => `${url}${url.includes("?") ? "&" : "?"}wait=true&with_components=true`;

/** Опубликовать. wait=true — Discord возвращает сообщение, его id нужен для правки и удаления. */
export async function publishPost(webhookUrl: string, post: ShowcasePost, fetchFn: typeof fetch = fetch): Promise<WebhookResult> {
  const res = await call(withQuery(webhookUrl), "POST", toWebhookPayload(post), fetchFn);
  if (!res.ok) return { ok: false, error: `Discord answered ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const message = (await res.json()) as { id?: string };
  return message.id ? { ok: true, messageId: message.id } : { ok: false, error: "Discord did not return the message id." };
}

/** Поправить уже опубликованный пост на месте (опечатка, новая цена). */
export async function updatePost(webhookUrl: string, messageId: string, post: ShowcasePost, fetchFn: typeof fetch = fetch): Promise<WebhookResult> {
  const res = await call(withQuery(`${webhookUrl}/messages/${messageId}`), "PATCH", toWebhookPayload(post), fetchFn);
  if (!res.ok) return { ok: false, error: `Discord answered ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { ok: true, messageId };
}

/** Убрать пост из Discord. 404 — уже удалён руками: считаем успехом. */
export async function deletePost(webhookUrl: string, messageId: string, fetchFn: typeof fetch = fetch): Promise<WebhookResult> {
  const res = await call(`${webhookUrl}/messages/${messageId}`, "DELETE", null, fetchFn);
  if (!res.ok && res.status !== 404) return { ok: false, error: `Discord answered ${res.status}` };
  return { ok: true, messageId };
}
