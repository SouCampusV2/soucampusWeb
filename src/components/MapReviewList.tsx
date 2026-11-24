import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StarRating } from "@/components/StarRating";
import { LocalTime } from "@/components/LocalTime";
import type { MapReview } from "@/lib/map-review-shape";
import { nameColorStyle } from "@/lib/name-colors";

// Отзывы на карты (2026-10-26): кто, сколько звёзд, за что.
//
// ОДИН компонент на два места — раздел под картой и вкладку Reviews на
// профиле автора. На профиле у отзыва ещё и название карты (productTitle):
// автор продаёт несколько, и «5 звёзд» без «за что» ничего не значит.
//
// Серверный: звёзды и аватар — из dist/ssr, текст — простым JSX, React
// экранирует его сам (тот же довод, что у био: это ввод пользователя,
// HTML отсюда не рендерится никогда).

export function MapReviewList({
  reviews,
  productTitles,
}: {
  reviews: MapReview[];
  /** id карты → { название, slug } — только на профиле. */
  productTitles?: Map<string, { title: string; slug: string }>;
}) {
  return (
    <ul className="space-y-3">
      {reviews.map((review) => {
        const product = productTitles?.get(review.productId);
        return (
          <li
            key={review.id}
            className="rounded-3xl border border-zinc-200 bg-[#fbfbff] p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {review.username !== "—" ? (
                <Link
                  href={`/@${encodeURIComponent(review.username.toLowerCase())}`}
                  className="inline-flex min-w-0 items-center gap-2 font-medium text-zinc-950 hover:underline dark:text-zinc-50"
                >
                  <Avatar avatarUrl={review.avatarUrl} size={28} />
                  <span
                    className="truncate"
                    style={nameColorStyle(review.nameColor)}
                  >
                    {review.username}
                  </span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 text-zinc-500">
                  <Avatar avatarUrl={null} size={28} />—
                </span>
              )}
              <StarRating rating={review.stars} size={14} />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {review.stars.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                <LocalTime value={review.createdAt} />
                {review.edited && " · edited"}
              </span>
            </div>
            {product && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                on{" "}
                <Link
                  href={`/marketplace/${product.slug}`}
                  className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  {product.title}
                </Link>
              </p>
            )}
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {review.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
