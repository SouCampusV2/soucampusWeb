import type { Review } from "@/lib/reviews";

type Accent = Review["accent"];

// Цвета отзыва — ОДИН словарь на карусель и страницу отзыва. Страница
// красится тем же тоном, что карточка, по которой кликнули: человек
// попадает «внутрь» той же карточки, а не на новый экран.
//
// Отдельный модуль, а не reviews.ts: тот тянет клиент Supabase, а
// ClientReviews — клиентский компонент, и словарь цветов не повод везти
// в браузер доступ к базе.

// Only two card accents (orange/lime) — the CTA button stays orange either
// way (primary color per DESIGN.md), the accent only tints the card itself.
export const ACCENT_CARD: Record<Accent, string> = {
  orange: "bg-orange-100 text-zinc-950 dark:bg-orange-950 dark:text-zinc-50",
  lime: "bg-lime-100 text-zinc-950 dark:bg-lime-950 dark:text-zinc-50",
};

// Обводка второго аватара (Luke & Sven) — цвет фона своей карточки,
// иначе кружки сливаются. Поменяешь фон в ACCENT_CARD — меняй и её.
export const ACCENT_RING: Record<Accent, string> = {
  orange: "ring-orange-100 dark:ring-orange-950",
  lime: "ring-lime-100 dark:ring-lime-950",
};

// Кавычка и подпись роли на странице отзыва. Lime в светлой теме на шаг
// темнее по той же причине, что ссылка «Read story» в карусели: lime-500
// на светлом фоне не читается (контраст ~1.9).
export const ACCENT_TEXT: Record<Accent, string> = {
  orange: "text-orange-600 dark:text-orange-400",
  lime: "text-lime-700 dark:text-lime-400",
};
