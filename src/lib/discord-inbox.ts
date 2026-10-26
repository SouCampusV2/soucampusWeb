// Очередь «пришло из Discord» (/admin/discord → Inbox, 2026-10-27).
//
// Бот присылает факты, а не тексты: размер, цену, срок, фото, оценку.
// Здесь — как эти факты превращаются в заготовку для формы работы и в
// строку отзыва. Чистые функции без базы: их зовут и страница, и
// обработчик, и тесты. Читает и пишет очередь служебный ключ — в
// страницах и в /api/admin/discord, не здесь.

import type { PortfolioDraft, ReviewFromDiscord } from "@/lib/discord-bridge";
import { slugify } from "@/lib/portfolio-input";

/** Строка discord_inbox, как её отдаёт база. */
export type InboxRow = {
  key: string;
  kind: "portfolio_draft" | "review";
  payload: unknown;
  image_urls: string[] | null;
  created_at: string;
};

export type InboxItem =
  | { key: string; kind: "portfolio_draft"; createdAt: string; imageUrls: string[]; draft: PortfolioDraft }
  | { key: string; kind: "review"; createdAt: string; review: ReviewFromDiscord };

export function rowToInboxItem(row: InboxRow): InboxItem {
  if (row.kind === "review") {
    return {
      key: row.key,
      kind: "review",
      createdAt: row.created_at,
      review: row.payload as ReviewFromDiscord,
    };
  }
  return {
    key: row.key,
    kind: "portfolio_draft",
    createdAt: row.created_at,
    imageUrls: row.image_urls ?? [],
    draft: row.payload as PortfolioDraft,
  };
}

/**
 * Срок в днях → подпись на карточке работы: «~5 days», «~2 weeks».
 *
 * С тильдой: бот присылает фактические дни от заказа до сдачи, а на
 * сайте это обещание будущему клиенту — округлённое, а не табель.
 */
export function deadlineLabelFromDays(days: number | null): string {
  if (days === null || !Number.isFinite(days) || days <= 0) return "";
  const d = Math.round(days);
  if (d < 7) return `~${d} ${d === 1 ? "day" : "days"}`;
  if (d < 60) {
    const weeks = Math.round(d / 7);
    return `~${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.round(d / 30);
  return `~${months} months`;
}

/** Что форма работы получает заполненным. Тексты — нет: их пишет владелец. */
export type PortfolioPrefill = {
  tag: string;
  sizeLabel: string;
  sizeX: number | null;
  sizeZ: number | null;
  priceLabel: string;
  priceAmount: number | null;
  deadlineLabel: string;
  /** Первое — обложка, дальше — галерея. Уже в нашем бакете. */
  images: string[];
};

export function prefillFromDraft(draft: PortfolioDraft, imageUrls: string[]): PortfolioPrefill {
  return {
    // Работа из тикета — по определению заказ.
    tag: "Order",
    sizeLabel: draft.sizeLabel,
    sizeX: draft.sizeX,
    sizeZ: draft.sizeZ,
    priceLabel: draft.priceLabel,
    priceAmount: draft.priceAmount,
    deadlineLabel: deadlineLabelFromDays(draft.deadlineDays),
    images: imageUrls,
  };
}

/** Отзыв годится для сайта, только если в нём есть слова. Одна оценка — нет. */
export function reviewHasText(review: ReviewFromDiscord): boolean {
  return review.comment.trim().length > 0;
}

export type ReviewInput = {
  slug: string;
  name: string;
  role: string;
  flag: string;
  text: string;
  accent: "orange" | "lime";
};

export const REVIEW_LIMITS = { name: 100, role: 120, flag: 16, text: 2000, slug: 80 } as const;

/** Заготовка формы «Add to reviews» из присланного. */
export function reviewInputFrom(review: ReviewFromDiscord): ReviewInput {
  return {
    slug: slugify(review.name),
    name: review.name.trim(),
    role: "",
    flag: "",
    text: review.comment.trim(),
    accent: "orange",
  };
}

/**
 * Проверка формы отзыва. Текст для человека или null.
 *
 * Зовётся и в форме (чтобы не ходить на сервер ради отказа), и в
 * обработчике — там она настоящая.
 */
export function checkReviewInput(input: ReviewInput): string | null {
  if (!input || typeof input !== "object") return "bad request";
  const bad = (v: unknown, max: number) =>
    typeof v !== "string" || v.trim().length === 0 || v.length > max;
  if (bad(input.name, REVIEW_LIMITS.name)) return "Add the client's name.";
  if (bad(input.role, REVIEW_LIMITS.role)) return "Add who they are — e.g. “Owner, GuardiumMC”.";
  if (bad(input.text, REVIEW_LIMITS.text)) return "The review needs its text.";
  // Флаг необязателен (карточка без него просто не рисует флаг), но
  // короткий: это один эмодзи, а не поле для текста.
  if (typeof input.flag !== "string" || input.flag.length > REVIEW_LIMITS.flag) {
    return "The flag is a single emoji.";
  }
  if (
    typeof input.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) ||
    input.slug.length > REVIEW_LIMITS.slug
  ) {
    return "Address: lowercase letters, numbers and dashes.";
  }
  if (input.accent !== "orange" && input.accent !== "lime") return "bad request";
  return null;
}
