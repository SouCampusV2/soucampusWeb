// Ссылки в профиле (2026-10-26): Discord, X, YouTube и прочее под именем
// на /@<username>.
//
// ⚠️ Настоящий запрет — в базе: profile_links_valid в миграции
// 20261026120000. Форма пишет в profiles прямо из браузера, и проверка
// здесь — только чтобы назвать человеку ошибку по-человечески ДО
// сохранения. Добавляешь вид или домен — дописывай в ОБА места.
//
// Модуль без "use client" и без сети: его читают и форма, и серверная
// страница профиля, и тесты.

export const PROFILE_LINK_KINDS = [
  "discord",
  "x",
  "youtube",
  "tiktok",
  "instagram",
  "twitch",
  "reddit",
  "planetminecraft",
  "builtbybit",
  "modrinth",
  "website",
] as const;

export type ProfileLinkKind = (typeof PROFILE_LINK_KINDS)[number];

export type ProfileLink = { kind: ProfileLinkKind; url: string };

/** Столько же, сколько в profile_links_valid. */
export const PROFILE_LINKS_MAX = 8;
const URL_MAX_LENGTH = 200;

/**
 * Подпись и разрешённые домены каждого вида.
 *
 * Домен по виду — главное правило всего модуля: ссылка с иконкой Discord
 * обязана вести на Discord, иначе знакомая иконка становится обёрткой
 * для фишинга. Поддомены проходят (www.youtube.com, m.twitch.tv).
 * У website доменов нет — у него и иконка нейтральная, и подписью
 * служит сам домен.
 */
export const PROFILE_LINK_META: Record<
  ProfileLinkKind,
  { label: string; domains: readonly string[] | null; placeholder: string }
> = {
  discord: { label: "Discord", domains: ["discord.gg", "discord.com"], placeholder: "discord.gg/your-server" },
  x: { label: "X", domains: ["x.com", "twitter.com"], placeholder: "x.com/yourname" },
  youtube: { label: "YouTube", domains: ["youtube.com", "youtu.be"], placeholder: "youtube.com/@yourname" },
  tiktok: { label: "TikTok", domains: ["tiktok.com"], placeholder: "tiktok.com/@yourname" },
  instagram: { label: "Instagram", domains: ["instagram.com"], placeholder: "instagram.com/yourname" },
  twitch: { label: "Twitch", domains: ["twitch.tv"], placeholder: "twitch.tv/yourname" },
  reddit: { label: "Reddit", domains: ["reddit.com"], placeholder: "reddit.com/user/yourname" },
  planetminecraft: { label: "Planet Minecraft", domains: ["planetminecraft.com"], placeholder: "planetminecraft.com/member/yourname" },
  builtbybit: { label: "BuiltByBit", domains: ["builtbybit.com"], placeholder: "builtbybit.com/creators/yourname" },
  modrinth: { label: "Modrinth", domains: ["modrinth.com"], placeholder: "modrinth.com/user/yourname" },
  website: { label: "Website", domains: null, placeholder: "yourwebsite.com" },
};

export function isProfileLinkKind(value: unknown): value is ProfileLinkKind {
  return (
    typeof value === "string" &&
    (PROFILE_LINK_KINDS as readonly string[]).includes(value)
  );
}

function hostMatches(host: string, domains: readonly string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

export type ProfileLinkCheck =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Проверить и привести к виду, который примет база.
 *
 * Без схемы — дописываем https:// (из адресной строки вставляют со
 * схемой, руками печатают без). http:// не «чиним» молча, а просим
 * https: ссылку человек дал сам, и подменять её адрес за него нельзя.
 *
 * Логин и порт в адресе запрещены — так же, как в базе:
 * https://discord.com@evil.com ведёт на evil.com, а читается как Discord.
 */
export function checkProfileLink(kind: ProfileLinkKind, raw: string): ProfileLinkCheck {
  const meta = PROFILE_LINK_META[kind];
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: `${meta.label}: add a link or remove the row.` };

  // Проверка на "://", а не на "http": иначе javascript:… получил бы
  // приставку и прошёл (тот же довод, что в contact-links.ts).
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: `${meta.label}: that doesn't look like a link.` };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: `${meta.label}: use an https:// link.` };
  }
  if (url.username || url.password || url.port) {
    return { ok: false, error: `${meta.label}: that doesn't look like a link.` };
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".")) {
    return { ok: false, error: `${meta.label}: that doesn't look like a link.` };
  }
  if (meta.domains && !hostMatches(host, meta.domains)) {
    return {
      ok: false,
      error: `${meta.label}: the link must point to ${meta.domains[0]}.`,
    };
  }

  const value = url.toString();
  if (value.length > URL_MAX_LENGTH) {
    return { ok: false, error: `${meta.label}: the link is too long.` };
  }
  return { ok: true, url: value };
}

/**
 * Разобрать то, что пришло из базы, в список для страницы.
 *
 * База уже стережёт запись, но значение остаётся вводом пользователя, и
 * отсюда оно попадает в href. Второй рубеж на выходе — тот же довод, что
 * у isHexColor: база стережёт запись, это — вывод. Негодная ссылка
 * молча выпадает, а не роняет профиль.
 */
export function parseProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];
  const links: ProfileLink[] = [];
  for (const item of value.slice(0, PROFILE_LINKS_MAX)) {
    if (!item || typeof item !== "object") continue;
    const { kind, url } = item as { kind?: unknown; url?: unknown };
    if (!isProfileLinkKind(kind) || typeof url !== "string") continue;
    const checked = checkProfileLink(kind, url);
    if (checked.ok) links.push({ kind, url: checked.url });
  }
  return links;
}

/** Что написать на чипе: у website — домен, у остальных — название. */
export function profileLinkLabel(link: ProfileLink): string {
  if (link.kind !== "website") return PROFILE_LINK_META[link.kind].label;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return PROFILE_LINK_META.website.label;
  }
}
