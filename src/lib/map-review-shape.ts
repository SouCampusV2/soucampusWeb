// Отзыв на карту — оценка звёздами + обязательный текст (2026-10-26).
//
// Здесь только то, что нужно и браузеру, и серверу: форма отзыва и
// проверки. Чтение из базы — map-reviews.ts.
//
// Не путать с reviews.ts: там отзывы КЛИЕНТОВ СТУДИИ на главной (Erik,
// Ghost…), а здесь — покупателей о картах магазина.

/** Столько же, сколько в product_ratings_body_check (20261026130000). */
export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 1000;

export type MapReview = {
  id: string;
  productId: string;
  userId: string;
  stars: number;
  body: string;
  createdAt: string;
  /** Правили ли после написания — показ скажет «edited». */
  edited: boolean;
  /** Имя написавшего. "—", если профиль недоступен. */
  username: string;
  nameColor: string | null;
  avatarUrl: string | null;
};

/** null — текст годится; строка — что сказать человеку. */
export function checkReviewBody(body: string): string | null {
  const length = body.trim().length;
  if (length < REVIEW_BODY_MIN) {
    return `Tell others why, at least ${REVIEW_BODY_MIN} characters.`;
  }
  if (length > REVIEW_BODY_MAX) {
    return `Keep it under ${REVIEW_BODY_MAX} characters.`;
  }
  return null;
}

/**
 * Годится ли число звёзд: от 0.5 до 5 с шагом в половину.
 *
 * Шаг в половину звезды есть в базе с 11.08 (20260811130000) и в
 * интерфейсе (RatingStars — две кнопки-половинки на звезду), но шлюз до
 * 26.10 пускал только целые — и половинка молча откатывалась. Теперь
 * правило одно на всех.
 */
export function isValidStars(stars: unknown): stars is number {
  return (
    typeof stars === "number" &&
    stars >= 0.5 &&
    stars <= 5 &&
    Number.isInteger(stars * 2)
  );
}
