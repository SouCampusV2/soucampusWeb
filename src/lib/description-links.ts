import { SITE_URL, isLocalPath } from "@/lib/site";

// Куда может вести ссылка в описании карты (аудит 2026-11, S-18; решение
// владельца 12.11).
//
// ЧТО БЫЛО. Описание допускало ссылку на любой сайт. При этом правка
// описания живой карты в очередь не возвращает — менять его автор может
// когда угодно. Получался обход всей проверки файла одной строкой: под
// одобренной картой появляется «обновлённая версия здесь: …», и файл,
// которого мы не видели, просто лежит не у нас.
//
// ЧТО СТАЛО. Ссылка ведёт либо внутрь нашего сайта, либо на одну из
// трёх площадок, где у авторов карт и так есть страницы. Всё остальное
// ссылкой не становится.
//
// Правило одно на два места — и это главное в файле:
//   - шлюз записи (checkMapSubmission) отказывает при сохранении, чтобы
//     автор сразу увидел, какая ссылка не подошла;
//   - санитайзер (sanitizeDescription) превращает чужую ссылку в обычный
//     текст при показе — на случай описаний, сохранённых до правила, и
//     любого пути записи мимо шлюза.
// Защита — второе. Первое — вежливость: проверку при сохранении можно
// обойти, записав адрес хитрее, чем её читает разбор текста; санитайзер
// разбирает разметку по-настоящему, и мимо него не пройти.

/** Площадки, на которые можно сослаться. Поддомены (www.) — тоже. */
export const DESCRIPTION_LINK_DOMAINS = [
  "discord.gg",
  "discord.com",
  "builtbybit.com",
  "planetminecraft.com",
] as const;

/** Те же площадки словами — для текста отказа. */
export const DESCRIPTION_LINK_SITES = "SouCampus, Discord, BuiltByBit or Planet Minecraft";

const OWN_HOST = new URL(SITE_URL).hostname;

export function isAllowedDescriptionLink(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (!value) return false;

  // Внутрь сайта: «/@name», «/marketplace/…». Та же проверка, что у
  // `next` после входа — `/\evil.com` и «//evil.com» сюда не проходят.
  if (value.startsWith("/")) return isLocalPath(value);

  // Обратный слэш браузер читает как прямой, и разбор ниже видел бы
  // другой адрес, чем тот, по которому пойдёт человек.
  if (value.includes("\\")) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  // Только https. mailto:, http: и всё прочее — не «ссылка на площадку».
  if (url.protocol !== "https:") return false;
  // «https://discord.com@evil.com» — адрес с логином: хост здесь evil.com,
  // а глаз читает discord.com. Порт — туда же: площадкам он не нужен.
  if (url.username || url.password || url.port) return false;

  const host = url.hostname.toLowerCase();
  if (host === OWN_HOST || host === `www.${OWN_HOST}`) return true;
  // Точное имя или поддомен: «discord.com.evil.com» заканчивается не на
  // «.discord.com», а «notdiscord.com» — не на точку перед именем.
  return DESCRIPTION_LINK_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );
}

// Адреса ссылок в разметке описания. Разбор текстом, а не настоящим
// парсером: модуль нужен и в браузере (форма карты), и тащить туда
// парсер HTML ради подсказки незачем. Чем это плохо как ЗАЩИТА — в шапке.
const HREF = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** Ссылки описания, которые ведут не туда. Пустой список — всё в порядке. */
export function disallowedDescriptionLinks(html: string): string[] {
  const bad: string[] = [];
  for (const match of html.matchAll(HREF)) {
    const href = (match[1] ?? match[2] ?? match[3] ?? "").replace(/&amp;/g, "&");
    if (!isAllowedDescriptionLink(href)) bad.push(href);
  }
  return bad;
}
