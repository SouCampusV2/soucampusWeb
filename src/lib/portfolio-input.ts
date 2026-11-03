import { PORTFOLIO_IMAGES_BUCKET, isPendingObject } from "@/lib/upload-limits";

// Работа портфолио, какой её присылает форма админки (2026-10-25).
//
// До сегодня работы добавлялись руками: строка в Table Editor, файлы в
// public/portfolio, коммит. Теперь — формой /admin/portfolio, как карты.
//
// Модуль без серверных импортов НАМЕРЕННО: проверку зовут и форма (чтобы
// сказать «нельзя» до загрузки картинок), и обработчик
// /api/admin/portfolio (там она — настоящая). Тот же приём, что у
// checkMapSubmission: одна функция, два места, ноль копий.

export const PROJECT_LIMITS = {
  title: 120,
  slug: 80,
  tag: 40,
  summary: 300,
  description: 5000,
  label: 60,
  url: 2048,
  gallery: 15,
} as const;

/** Что присылает форма. Числа — уже числами или null. */
export type ProjectInput = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  description: string;
  priceLabel: string;
  priceAmount: number | null;
  sizeLabel: string;
  sizeX: number | null;
  sizeZ: number | null;
  deadlineLabel: string;
  isFeatured: boolean;
  sortOrder: number | null;
  listingUrl: string | null;
  listingIsFree: boolean;
  /** Обложка — главное фото, оно же карточка в сетке. */
  image: string;
  /** Остальные кадры по порядку. */
  gallery: string[];
};

/**
 * Адрес из названия: «Redspire Commons» → «redspire-commons».
 * Только подсказка для поля — проверяет slug всё равно checkProjectInput.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROJECT_LIMITS.slug);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Можно ли показывать эту картинку на странице работы.
 *
 * Два вида, как у карт (isOwnImageUrl), только бакет свой:
 *   "/portfolio/…"          — старые работы, файлы в public/;
 *   наш Storage, бакет      — всё, что загружено формой.
 *            portfolio-images
 * Чужой адрес не пускаем по той же причине, что везде: картинку грузит
 * браузер каждого посетителя, а значит владелец адреса видит их IP.
 */
export function isPortfolioImageUrl(url: string, supabaseUrl: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > PROJECT_LIMITS.url) {
    return false;
  }
  // Непроверенная загрузка — ещё не наша картинка, см. PENDING_PREFIX.
  if (isPendingObject(url)) return false;
  // «//evil.com» — протокол-относительный адрес наружу, не наш файл.
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!supabaseUrl) return false;
  const base = supabaseUrl.replace(/\/+$/, "");
  return url.startsWith(`${base}/storage/v1/object/public/${PORTFOLIO_IMAGES_BUCKET}/`);
}

function badText(value: unknown, max: number): boolean {
  return typeof value !== "string" || value.trim().length === 0 || value.length > max;
}

function badNumber(value: unknown): boolean {
  return value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0);
}

/**
 * Проверка присланного. Текст для человека или null, если всё в порядке.
 * Текст человеческий: на другом конце владелец, а не отладчик.
 */
export function checkProjectInput(input: ProjectInput, supabaseUrl: string): string | null {
  if (badText(input.title, PROJECT_LIMITS.title)) {
    return `Give the work a title, up to ${PROJECT_LIMITS.title} characters.`;
  }
  if (typeof input.slug !== "string" || !SLUG_RE.test(input.slug) || input.slug.length > PROJECT_LIMITS.slug) {
    return "The address can only use lowercase letters, numbers and single dashes.";
  }
  if (badText(input.tag, PROJECT_LIMITS.tag)) {
    return `Add a tag (Order, Personal project…), up to ${PROJECT_LIMITS.tag} characters.`;
  }
  if (badText(input.summary, PROJECT_LIMITS.summary)) {
    return `Write a short summary, up to ${PROJECT_LIMITS.summary} characters.`;
  }
  if (badText(input.description, PROJECT_LIMITS.description)) {
    return `Write a description, up to ${PROJECT_LIMITS.description} characters.`;
  }
  // Подписи обязательны: страница работы печатает их строкой фактов, и
  // колонки в базе not null. «—» — честный ответ, если сказать нечего.
  if (badText(input.priceLabel, PROJECT_LIMITS.label)) return "Fill in the price label (e.g. €150 or —).";
  if (badText(input.sizeLabel, PROJECT_LIMITS.label)) return "Fill in the size label (e.g. 250×250).";
  if (badText(input.deadlineLabel, PROJECT_LIMITS.label)) return "Fill in the deadline label (e.g. 1 week).";

  if (badNumber(input.priceAmount)) return "The price must be a positive number or empty.";
  if (badNumber(input.sizeX) || badNumber(input.sizeZ)) return "Size in blocks must be positive numbers or empty.";
  if (input.sortOrder !== null && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
    return "The order must be a whole number or empty.";
  }

  if (input.listingUrl !== null) {
    // Только https, как и ограничение projects_listing_url_https в базе:
    // адрес печатается в href, и javascript: ушёл бы в разметку как есть.
    if (typeof input.listingUrl !== "string" || !/^https:\/\/\S+$/.test(input.listingUrl) || input.listingUrl.length > PROJECT_LIMITS.url) {
      return "The store link must start with https://.";
    }
  }

  if (!isPortfolioImageUrl(input.image, supabaseUrl)) return "Add a cover image.";
  if (!Array.isArray(input.gallery) || input.gallery.length > PROJECT_LIMITS.gallery) {
    return `Up to ${PROJECT_LIMITS.gallery} gallery images.`;
  }
  if (input.gallery.some((url) => !isPortfolioImageUrl(url, supabaseUrl))) {
    return "One of the gallery images isn't ours. Remove it and upload it again.";
  }
  return null;
}
