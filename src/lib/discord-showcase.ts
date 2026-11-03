// Посты витрины в Discord из админки (2026-10-27).
//
// Владелец собирает пост в /admin/discord: черновик → превью «как в
// Discord» → «Publish». Сайт отправляет его сам, в вебхук канала витрины
// (DISCORD_SHOWCASE_WEBHOOK_URL; выдаёт бот: /setup showcase_channel).
// Реакции под постом ставит бот (/setup showcase_reactions) — вебхук этого
// не умеет.
//
// Стиль — «сообщение», как у студий-примеров владельца (Coastline): крупный
// заголовок с чертой, текст с эмодзи и пингом роли, список ссылок
// «- [текст](url) - **подпись**», большие картинки без рамки. Технически это
// сообщение Components V2: блоки текста + галерея картинок (+ кнопки по
// желанию). Картинки галереей, а не вложением: не надо качать и загружать
// файлы, хватает https-ссылки.
//
// Почему вебхук, а не токен бота: ссылка вебхука умеет только писать,
// править и удалять СВОИ сообщения в ОДНОМ канале.

import { callWebhook, webhookError, withParams } from "@/lib/discord-webhook";

/** Пост витрины — то, что лежит в discord_posts.post и рисуется в превью. */
export type ShowcasePost = {
  title: string;
  titleDash: boolean; // « ——» после заголовка, как в примере
  body: string; // Discord-markdown; эмодзи сервера — <:name:id>
  links: { label: string; url: string; tagline: string }[]; // "- [label](url) - **tagline**"
  imageUrls: string[]; // 1–4 большие картинки
  mention: "none" | "here" | "everyone" | "role";
  roleId: string | null; // для mention = "role" (ID роли из Discord, напр. @Showcase)
  buttons: { label: string; url: string }[]; // кнопки-ссылки под постом, по желанию
  username: string | null; // от чьего имени (по умолчанию — имя вебхука)
  avatarUrl: string | null; // аватар автора поста
};

/** Работа портфолио в том виде, в каком её отдаёт getProject. */
export type ProjectForPost = {
  slug: string;
  title: string;
  summary: string;
  image: string; // может быть относительным: /portfolio/x.webp
  gallery?: string[];
  sizeLabel: string;
  deadlineLabel: string;
  listingUrl: string | null;
  listingIsFree: boolean;
};

export const MAX_IMAGES = 4;

// ------------------------------------------------------------
// Каналы (2026-10-27, вечер). Владелец постит в три канала витрины, у
// каждого свой вебхук — его выдаёт бот: /setup site_channel kind:<…>.
// Вебхук, созданный ботом, подписывает пост как бот (discord-identity.ts),
// а реакции под постом бот ставит сам. Цвет плашки — как у закреплённых
// постов в этих каналах.
// ------------------------------------------------------------

export type ShowcaseChannel = "portfolio" | "premade" | "free";

export const SHOWCASE_CHANNELS: Record<
  ShowcaseChannel,
  { label: string; envVar: string; setupKind: string; color: number }
> = {
  portfolio: { label: "Portfolio", envVar: "DISCORD_SHOWCASE_WEBHOOK_URL", setupKind: "Portfolio", color: 0xf97316 },
  premade: { label: "Premade builds", envVar: "DISCORD_PREMADE_WEBHOOK_URL", setupKind: "Premade builds", color: 0x84cc16 },
  free: { label: "Free builds", envVar: "DISCORD_FREE_WEBHOOK_URL", setupKind: "Free builds", color: 0x3b82f6 },
};

export const CHANNEL_KEYS = Object.keys(SHOWCASE_CHANNELS) as ShowcaseChannel[];

export function isShowcaseChannel(value: unknown): value is ShowcaseChannel {
  return typeof value === "string" && value in SHOWCASE_CHANNELS;
}

/** Вебхук канала — только на сервере (ссылка = право писать в канал). */
export function channelWebhook(channel: ShowcaseChannel): string | undefined {
  return process.env[SHOWCASE_CHANNELS[channel].envVar] || undefined;
}

/** Цвет числом Discord → #rrggbb для превью. */
export const hexColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** Относительный путь → абсолютный: Discord сам не догадается. */
export function absoluteUrl(url: string | null, siteUrl: string): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${siteUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

/** Черновик из работы — стартовая точка, владелец правит всё в форме. */
export function draftFromProject(p: ProjectForPost, siteUrl: string): ShowcasePost {
  const site = siteUrl.replace(/\/$/, "");
  const facts = [p.sizeLabel && `${p.sizeLabel}`, p.deadlineLabel && `built in ${p.deadlineLabel}`].filter(Boolean).join(" · ");
  const links = [{ label: "See it on our website", url: `${site}/portfolio/${p.slug}`, tagline: "" }];
  if (p.listingUrl) links.push({ label: p.listingIsFree ? "Download it free" : "Get this map", url: p.listingUrl, tagline: "" });
  links.push({ label: "Order your own build", url: `${site}/contact`, tagline: "Let's create something together!" });
  return {
    title: p.title,
    titleDash: true,
    body: facts ? `${p.summary}\n-# ${facts}` : p.summary,
    links,
    imageUrls: [p.image, ...(p.gallery ?? [])]
      .map((u) => absoluteUrl(u, siteUrl))
      .filter((u): u is string => Boolean(u))
      .slice(0, MAX_IMAGES),
    mention: "none",
    roleId: null,
    buttons: [],
    username: null,
    avatarUrl: null,
  };
}

/** Карта маркетплейса — то, что нужно черновику поста из неё. */
export type ProductForPost = {
  slug: string;
  title: string;
  summary: string;
  /** Обложка первой, дальше галерея (Product.images). */
  images: string[];
  price: string;
  priceCents: number;
  mapSize: string | null;
  mcVersions: string[];
};

/** Бесплатная карта — в Free builds, платная — в Premade builds. */
export const channelForProduct = (p: { priceCents: number }): ShowcaseChannel =>
  p.priceCents === 0 ? "free" : "premade";

/** Черновик из карты маркетплейса: цена или «Free», размер, версии, ссылка на страницу. */
export function draftFromProduct(p: ProductForPost, siteUrl: string): ShowcasePost {
  const site = siteUrl.replace(/\/$/, "");
  const free = p.priceCents === 0;
  const facts = [
    free ? "Free" : p.price,
    p.mapSize,
    p.mcVersions.length ? `Minecraft ${p.mcVersions.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: p.title,
    titleDash: true,
    body: facts ? `${p.summary}
-# ${facts}` : p.summary,
    links: [
      { label: free ? "Download it free" : "Get this map", url: `${site}/marketplace/${p.slug}`, tagline: "" },
      { label: "Order your own build", url: `${site}/contact`, tagline: "Let's create something together!" },
    ],
    imageUrls: p.images
      .map((u) => absoluteUrl(u, siteUrl))
      .filter((u): u is string => Boolean(u))
      .slice(0, MAX_IMAGES),
    mention: "none",
    roleId: null,
    buttons: [],
    username: null,
    avatarUrl: null,
  };
}

const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/** Текст ссылки не должен ломать markdown: [ ] убираем, ) и пробелы в адресе кодируем. */
const linkLabel = (s: string) => s.replace(/[[\]]/g, "").trim();
const linkUrl = (u: string) => u.replace(/\)/g, "%29").replace(/ /g, "%20");

/** Строка пинга в конце текста. */
export function mentionText(post: ShowcasePost): string {
  if (post.mention === "role" && post.roleId) return `<@&${post.roleId}>`;
  if (post.mention === "here" || post.mention === "everyone") return `@${post.mention}`;
  return "";
}

/** Блоки текста поста, в том виде, в каком их увидит Discord (и нарисует превью). */
export function postText(post: ShowcasePost): { main: string; links: string } {
  const title = `# ${post.title.trim()}${post.titleDash ? " ——" : ""}`;
  const mention = mentionText(post);
  const body = [post.body.trim(), mention].filter(Boolean).join(" ");
  const links = post.links
    .map((l) => `- [${linkLabel(l.label)}](${linkUrl(l.url)})${l.tagline.trim() ? ` - **${l.tagline.trim()}**` : ""}`)
    .join("\n");
  return { main: [title, body].filter(Boolean).join("\n"), links };
}

// Пределы Discord для Components V2: весь текст сообщения ≤ 4000 символов,
// в галерее ≤ 10 картинок (мы берём ≤ 4), кнопок в ряду ≤ 5.
const LIMITS = { text: 4000, title: 200, links: 10, label: 80, buttons: 5, username: 80 };

/** null — пост можно отправлять; строка — что не так (показывается в форме). */
export function checkPost(post: ShowcasePost): string | null {
  if (!post.title.trim()) return "The post needs a title.";
  if (post.title.length > LIMITS.title) return `Title: at most ${LIMITS.title} characters.`;
  if (post.links.length > LIMITS.links) return `At most ${LIMITS.links} links.`;
  for (const l of post.links) {
    if (!linkLabel(l.label)) return "Every link needs a text.";
    if (!isHttps(l.url)) return "Links must be https addresses.";
  }
  if (!post.imageUrls.length) return "Add at least one picture.";
  if (post.imageUrls.length > MAX_IMAGES) return `At most ${MAX_IMAGES} pictures.`;
  if (!post.imageUrls.every(isHttps)) return "Pictures must be https addresses.";
  if (post.buttons.length > LIMITS.buttons) return `At most ${LIMITS.buttons} buttons.`;
  for (const b of post.buttons) {
    if (!b.label.trim() || b.label.length > LIMITS.label) return `Button labels: 1–${LIMITS.label} characters.`;
    if (!isHttps(b.url)) return "Buttons must link to https addresses.";
  }
  if (!["none", "here", "everyone", "role"].includes(post.mention)) return "Bad mention setting.";
  if (post.mention === "role" && !/^\d{17,20}$/.test(post.roleId ?? "")) {
    return "Role ping needs the role ID (Discord: right-click the role → Copy Role ID).";
  }
  if (post.username && (post.username.length > LIMITS.username || /discord/i.test(post.username))) {
    return "Author name: up to 80 characters and without the word “Discord” (Discord refuses it).";
  }
  if (post.avatarUrl && !isHttps(post.avatarUrl)) return "Avatar must be an https address.";
  const { main, links } = postText(post);
  if (main.length + links.length > LIMITS.text) return `The post is over Discord's ${LIMITS.text}-character limit.`;
  return null;
}

/**
 * Тело запроса вебхука (Components V2). Пингует только то, что выбрано явно.
 *
 * accentColor (27.10) — всё содержимое уходит в контейнер (type 17) с
 * цветной плашкой слева, как у закреплённых постов в каналах. Без цвета —
 * как раньше, блоки без рамки.
 */
export function toWebhookPayload(post: ShowcasePost, accentColor?: number) {
  const { main, links } = postText(post);
  const blocks: unknown[] = [{ type: 10, content: main }];
  if (links) blocks.push({ type: 10, content: links });
  blocks.push({ type: 12, items: post.imageUrls.map((url) => ({ media: { url } })) });
  if (post.buttons.length) {
    blocks.push({ type: 1, components: post.buttons.map((b) => ({ type: 2, style: 5, label: b.label, url: b.url })) });
  }
  const components = accentColor === undefined ? blocks : [{ type: 17, accent_color: accentColor, components: blocks }];
  const allowed_mentions =
    post.mention === "role" && post.roleId
      ? { parse: [], roles: [post.roleId] }
      : { parse: post.mention === "here" || post.mention === "everyone" ? ["everyone"] : [] };
  return {
    flags: 1 << 15, // IS_COMPONENTS_V2
    components,
    allowed_mentions,
    ...(post.username ? { username: post.username } : {}),
    ...(post.avatarUrl ? { avatar_url: post.avatarUrl } : {}),
  };
}

type WebhookResult = { ok: true; messageId: string } | { ok: false; error: string };

const withQuery = (url: string) => withParams(url, "wait=true&with_components=true");

/** Опубликовать. wait=true — Discord возвращает сообщение, его id нужен для правки и удаления. */
export async function publishPost(
  webhookUrl: string,
  post: ShowcasePost,
  fetchFn: typeof fetch = fetch,
  accentColor?: number
): Promise<WebhookResult> {
  const res = await callWebhook(withQuery(webhookUrl), "POST", toWebhookPayload(post, accentColor), fetchFn);
  if (!res.ok) return { ok: false, error: await webhookError(res) };
  const message = (await res.json()) as { id?: string };
  return message.id ? { ok: true, messageId: message.id } : { ok: false, error: "Discord did not return the message id." };
}

/**
 * Поправить опубликованный пост на месте. Имя и аватар автора у вебхука
 * после публикации не меняются — Discord их при правке игнорирует.
 */
export async function updatePost(
  webhookUrl: string,
  messageId: string,
  post: ShowcasePost,
  fetchFn: typeof fetch = fetch,
  accentColor?: number
): Promise<WebhookResult> {
  // Имя и аватар отбрасываются намеренно — Discord их при правке не принимает.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { username: _u, avatar_url: _a, ...payload } = toWebhookPayload(post, accentColor) as Record<string, unknown>;
  const res = await callWebhook(withQuery(`${webhookUrl}/messages/${messageId}`), "PATCH", payload, fetchFn);
  if (!res.ok) return { ok: false, error: await webhookError(res) };
  return { ok: true, messageId };
}

/** Убрать пост из Discord. 404 — уже удалён руками: считаем успехом. */
export async function deletePost(webhookUrl: string, messageId: string, fetchFn: typeof fetch = fetch): Promise<WebhookResult> {
  const res = await callWebhook(`${webhookUrl}/messages/${messageId}`, "DELETE", null, fetchFn);
  if (!res.ok && res.status !== 404) return { ok: false, error: `Discord answered ${res.status}` };
  return { ok: true, messageId };
}

// ------------------------------------------------------------
// Дописано при переносе на сайт (26.10).
// ------------------------------------------------------------

const text = (v: unknown, max = 8000) => typeof v === "string" && v.length <= max;
const textOrNull = (v: unknown) => v === null || text(v);

/**
 * Похоже ли присланное на ShowcasePost по ФОРМЕ — типы полей, а не
 * пределы Discord. Черновик сохраняется и недописанным (пустой заголовок
 * — нормальный черновик), но строка, у которой links не массив, уронила
 * бы и превью, и форму при следующем открытии.
 */
export function isShowcasePostShape(value: unknown): value is ShowcasePost {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    text(p.title) &&
    typeof p.titleDash === "boolean" &&
    text(p.body) &&
    Array.isArray(p.links) &&
    p.links.length <= 20 &&
    p.links.every((l) => l && typeof l === "object" && text(l.label) && text(l.url) && text(l.tagline)) &&
    Array.isArray(p.imageUrls) &&
    p.imageUrls.length <= 10 &&
    p.imageUrls.every((u) => text(u)) &&
    ["none", "here", "everyone", "role"].includes(p.mention as string) &&
    textOrNull(p.roleId) &&
    Array.isArray(p.buttons) &&
    p.buttons.length <= 10 &&
    p.buttons.every((b) => b && typeof b === "object" && text(b.label) && text(b.url)) &&
    textOrNull(p.username) &&
    textOrNull(p.avatarUrl)
  );
}

/**
 * Пост из базы → ShowcasePost, включая строки СТАРОГО формата.
 *
 * С 26.10 до вечера 26.10 на проде жил первый редактор — эмбед в рамке
 * (title, url, body, imageUrl, color, fields, buttons, mention). Сохранённые
 * им черновики и опубликованные посты в discord_posts остались, и без
 * перевода они исчезли бы из админки — а опубликованный стало бы нечем
 * поправить или убрать из канала. Перевод — лучшее приближение: ссылка
 * заголовка становится первой ссылкой списка, поля — мелкой строкой.
 *
 * null — строка не похожа ни на один формат.
 */
export function normalizeShowcasePost(value: unknown): ShowcasePost | null {
  if (isShowcasePostShape(value)) return value;
  if (!value || typeof value !== "object") return null;
  const old = value as Record<string, unknown>;
  if (!text(old.title) || !text(old.body ?? "")) return null;

  const fields = Array.isArray(old.fields)
    ? (old.fields as { name?: unknown; value?: unknown }[])
        .filter((f) => text(f?.name) && text(f?.value))
        .map((f) => `${f.name}: ${f.value}`)
    : [];
  const body = [String(old.body ?? "").trim(), fields.length ? `-# ${fields.join(" · ")}` : ""]
    .filter(Boolean)
    .join("\n");
  const mention = ["here", "everyone"].includes(old.mention as string)
    ? (old.mention as "here" | "everyone")
    : "none";

  return {
    title: old.title as string,
    titleDash: true,
    body,
    links: typeof old.url === "string" && old.url
      ? [{ label: "See it on our website", url: old.url, tagline: "" }]
      : [],
    imageUrls: typeof old.imageUrl === "string" && old.imageUrl ? [old.imageUrl] : [],
    mention,
    roleId: null,
    buttons: Array.isArray(old.buttons)
      ? (old.buttons as { label?: unknown; url?: unknown }[])
          .filter((b) => text(b?.label) && text(b?.url))
          .map((b) => ({ label: b.label as string, url: b.url as string }))
      : [],
    username: null,
    avatarUrl: null,
  };
}

/**
 * Роль, которую пингуют посты витрины по умолчанию (владелец, 26.10).
 * ID — из Discord (правый клик по роли → Copy Role ID). Имя нужно только
 * превью: Discord сам покажет «@Portfolio», а превью без него видит лишь
 * <@&id>.
 */
export const PORTFOLIO_ROLE = { id: "1564243306794197052", name: "Portfolio" } as const;

/**
 * Роли каналов витрины (владелец, 27.10): пост по умолчанию пингует роль
 * своего канала. Тот же принцип, что у PORTFOLIO_ROLE: ID из Discord, имя
 * — только для превью и кнопок.
 */
export const CHANNEL_ROLES: Record<ShowcaseChannel, { id: string; name: string }> = {
  portfolio: PORTFOLIO_ROLE,
  premade: { id: "1564358644169056286", name: "Premade builds" },
  free: { id: "1564358633142222858", name: "Free builds" },
};

/** Имя известной роли по ID; null — роль не из списка. */
export function knownRoleName(roleId: string | null): string | null {
  return Object.values(CHANNEL_ROLES).find((r) => r.id === roleId)?.name ?? null;
}
