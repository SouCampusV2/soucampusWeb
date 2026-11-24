export const DISCORD_INVITE = "https://discord.com/invite/EHudSpvEVV";

// Почта поддержки (Hostinger-ящик на своём домене). Показываем на /support
// и используем как отправителя в письмах (см. docs/SHOP.md → «Почта»).
export const SUPPORT_EMAIL = "support@soucampus.online";

// Публичный адрес прода. Нужен метаданным (metadataBase), sitemap, robots и
// JSON-LD, чтобы строить АБСОЛЮТНЫЕ ссылки (og:image, canonical) — соцсети и
// поисковики относительный путь не понимают. Одно место на весь сайт.
export const SITE_URL = "https://soucampus.online";

// Имя бренда для og:site_name, structured data и шаблона <title>.
export const SITE_NAME = "SouCampus builds";

// Короткое описание автора для structured data (ответ ИИ-поиска на «кто такой
// SouCampus») и как запасной description. Держим одной фразой.
export const SITE_TAGLINE =
  "SouCampus is a professional Minecraft builder crafting custom maps, structures and worlds on order.";

// Профили автора в сети для structured data (поле sameAs). Так поисковик
// связывает сайт, Discord, YouTube, Reddit и т.п. в ОДНУ сущность «SouCampus»
// — это усиливает брендовый ответ ИИ-поиска. Дописывать ссылки по мере того,
// как заводятся аккаунты (часть B SEO-плана: соцсети/Reddit/PlanetMinecraft).
export const SITE_SAMEAS: string[] = [
  DISCORD_INVITE,
  "https://www.planetminecraft.com/member/soucampus/",
  "https://www.instagram.com/soucampusbuilds/",
  "https://www.tiktok.com/@soucampus",
  "https://www.patreon.com/c/SouCampus",
  "https://www.reddit.com/user/SouCampus/",
  "https://www.youtube.com/@SouCampus",
  "https://x.com/SouCampusBuilds",
];

// Куда безопасно вести после входа/подтверждения почты.
//
// Пускаем ТОЛЬКО относительный путь своего сайта. Без этой проверки
// ссылка вида ?next=//evil.com логинила бы человека и тут же уводила на
// чужой домен — классический open redirect. Отсекаем два случая:
// абсолютный URL (не начинается со слэша) и протокол-относительный
// "//evil.com" — второй выглядит относительным, но браузер понимает его
// как чужой хост.
//
// Живёт в общем месте намеренно: раньше это условие стояло дословной
// копией в AuthForm и в /auth/callback, и усиление проверки в одном из
// них молча оставило бы второй дырявым. Обработчик callback опаснее
// формы — до него доходят по ссылке из письма, минуя весь UI.
export function safeNextPath(next: string | null | undefined, fallback = "/marketplace") {
  return isLocalPath(next) ? next : fallback;
}

/**
 * «Этот адрес ведёт внутрь сайта» — одна проверка на все места, где путь
 * приходит из данных: `next` после входа, ссылка уведомления, адрес
 * картинки (аудит 2026-11, S-21 и S-22).
 *
 * ⚠️ Двух слэшей мало. Браузер читает обратный слэш в адресе как прямой:
 * `/\evil.com` начинается с ОДНОГО слэша и прежнюю проверку проходил, а
 * открывался как `//evil.com`, то есть чужой сайт. Туда же — табуляция и
 * перевод строки: браузер их из адреса выбрасывает, и `/\t/evil.com`
 * превращается в то же самое. Поэтому запрет стоит на сами символы, где
 * бы в строке они ни были.
 */
export function isLocalPath(path: string | null | undefined): path is string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return false;
  // Backslash and ASCII control characters (code < 0x20, and 0x7f).
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i);
    if (code === 0x5c || code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About me" },
  { href: "/contact", label: "Contact" },
  { href: "/marketplace", label: "Marketplace" },
];
