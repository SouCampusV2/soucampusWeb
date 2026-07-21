export const DISCORD_INVITE = "https://discord.com/invite/EHudSpvEVV";

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
export const SITE_SAMEAS: string[] = [DISCORD_INVITE];

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About me" },
  { href: "/contact", label: "Contact" },
];
