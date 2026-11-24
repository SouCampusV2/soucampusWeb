"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilSimple, Star, StarHalf, X } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { StarRating } from "@/components/StarRating";
import { rateProduct } from "@/lib/social-client";
import { useUser } from "@/lib/useUser";
import {
  checkReviewBody,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
} from "@/lib/map-review-shape";

// Отзыв на купленную карту — в «My purchases» (2026-10-26).
//
// До 26.10 здесь были звёзды, сохранявшиеся по клику. С обязательным
// текстом (решение владельца) клик по звезде больше ничего не
// сохраняет: оценка без слов не принимается ни шлюзом, ни базой
// (product_ratings_body_check). Поэтому в строке покупки — звёзды для
// чтения и кнопка, а звёзды-кнопки и текст — в окне, с одной кнопкой
// «Post». Тот же приём, что у ссылок в настройках.

export function ReviewButton({
  productId,
  title,
  initial,
}: {
  productId: string;
  title: string;
  /** Свой прежний отзыв; null — ещё не оценивал. */
  initial: { stars: number; body: string } | null;
}) {
  const [open, setOpen] = useState(false);
  // Старая оценка без текста (до 26.10) — тоже «есть», но её надо
  // дописать: кнопка зовёт это правкой.
  const hasReview = initial !== null && initial.stars > 0;

  return (
    <>
      {hasReview && <StarRating rating={initial.stars} size={14} />}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
      >
        {hasReview ? (
          <>
            <PencilSimple size={12} aria-hidden />
            Edit review
          </>
        ) : (
          "Write a review"
        )}
      </button>
      {open && (
        <ReviewDialog
          productId={productId}
          title={title}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Отзыв прямо на странице БЕСПЛАТНОЙ карты (27.10): писать может любой
 * вошедший, покупка не нужна (шлюз /api/feedback это и проверяет).
 * Страница собрана заранее и не знает, кто смотрит, поэтому вход
 * выясняет браузер; пока неизвестно — ничего, чтобы не мигать «Sign in».
 * Прежний свой отзыв здесь не подгружается: новый его заменит (одна
 * оценка на пару карта–человек).
 */
export function FreeMapReview({
  productId,
  slug,
  title,
}: {
  productId: string;
  slug: string;
  title: string;
}) {
  const { user, loading } = useUser();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/marketplace/${slug}`)}`}
        className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
      >
        Sign in to write a review
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <ReviewButton productId={productId} title={title} initial={null} />
    </span>
  );
}

function ReviewDialog({
  productId,
  title,
  initial,
  onClose,
}: {
  productId: string;
  title: string;
  initial: { stars: number; body: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const length = body.trim().length;
  const ready = stars > 0 && checkReviewBody(body) === null;

  async function post() {
    if (!ready) {
      setError(stars === 0 ? "Pick how many stars." : checkReviewBody(body));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Через шлюз (/api/feedback): он проверяет вход, покупку, лимит и
      // текст. Кто пишет, отсюда не сообщается — сервер знает это из
      // сессии.
      await rateProduct(productId, stars, body.trim());
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your review.");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Review ${title}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-[#fbfbff] p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Your review</h2>
            <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-5">
          <StarPicker value={stars} onChange={setStars} disabled={saving} />
        </div>

        <label htmlFor={`review-${productId}`} className="sr-only">
          What did you like or not?
        </label>
        <textarea
          id={`review-${productId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={REVIEW_BODY_MAX}
          placeholder="What did you like? How did it work on your server? Shown publicly with your name."
          className="mt-4 w-full resize-y rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50 dark:placeholder:text-zinc-500"
        />
        <p className="mt-1 text-right text-xs text-zinc-500 dark:text-zinc-400">
          {length < REVIEW_BODY_MIN ? `${REVIEW_BODY_MIN - length} more to go` : `${length}/${REVIEW_BODY_MAX}`}
        </p>

        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button type="button" variant="primary" onClick={post} loading={saving} disabled={saving || !ready} className="flex-1">
            {saving ? "Posting…" : initial?.body ? "Update review" : "Post review"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Шаг — половина звезды (миграция 20260811130000). Каждая звезда это две
// кнопки-половинки, а не одна: определять «попал в левую или правую
// часть» по координате курсора значило бы, что с клавиатуры и с тача
// половинку не поставить вовсе. Две настоящие кнопки обходятся табом,
// нажимаются пальцем и сами себя объявляют скринридеру.
const STEPS = [1, 2, 3, 4, 5];

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (stars: number) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rate this map">
      {STEPS.map((step) => (
        <span key={step} className="relative inline-flex p-0.5" onMouseLeave={() => setHover(0)}>
          <StarIcon value={step} shown={shown} />
          {/* Две прозрачные половинки поверх картинки. Сама звезда
              нарисована один раз под ними — иначе пришлось бы резать
              иконку пополам и следить, чтобы половины сходились. */}
          {[step - 0.5, step].map((half) => (
            <button
              key={half}
              type="button"
              disabled={disabled}
              onMouseEnter={() => setHover(half)}
              onFocus={() => setHover(half)}
              onBlur={() => setHover(0)}
              onClick={() => onChange(half)}
              aria-label={`${half} star${half === 1 ? "" : "s"}`}
              aria-pressed={value === half}
              className={`absolute inset-y-0 w-1/2 cursor-pointer disabled:cursor-not-allowed ${
                half === step ? "right-0" : "left-0"
              }`}
            />
          ))}
        </span>
      ))}
      <span className="ml-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {shown > 0 ? shown.toFixed(1) : ""}
      </span>
    </div>
  );
}

/** Целая, половина или пустая — смотря куда дотянулась текущая оценка. */
function StarIcon({ value, shown }: { value: number; shown: number }) {
  const filled = value <= shown;
  const half = !filled && value - 0.5 <= shown;

  if (half) {
    return <StarHalf size={28} weight="fill" className="text-orange-400" aria-hidden />;
  }
  return (
    <Star
      size={28}
      weight={filled ? "fill" : "regular"}
      className={filled ? "text-orange-400" : "text-zinc-300 dark:text-zinc-600"}
      aria-hidden
    />
  );
}
