import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllReviews, getReview } from "@/lib/reviews";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Quotes } from "@phosphor-icons/react/dist/ssr";
import { BackLink } from "@/components/BackLink";
import { Flag } from "@/components/Flag";
import { ReviewAvatar } from "@/components/ReviewAvatar";
import { ACCENT_CARD, ACCENT_RING, ACCENT_TEXT } from "@/lib/review-accent";
import type { Review } from "@/lib/reviews";

export async function generateStaticParams() {
  const reviews = await getAllReviews();
  return reviews.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) return { title: "Not found" };

  return {
    title: `${review.name} — client review`,
    description: review.text,
    alternates: { canonical: `/reviews/${review.slug}` },
    openGraph: {
      type: "article",
      title: `${review.name} — client review`,
      description: review.text,
      url: `/reviews/${review.slug}`,
    },
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Весь список, а не один отзыв: нужны соседи для ссылок внизу. Отзывов
  // десяток, и страница собирается заранее — лишний запрос стоит ноль.
  const reviews = await getAllReviews();
  const at = reviews.findIndex((r) => r.slug === slug);
  if (at === -1) notFound();
  const review = reviews[at];

  // По кругу: с последнего «дальше» ведёт на первый. Тупик в конце ленты
  // отзывов ничего не сообщает, кроме того, что их мало.
  const prev = reviews.length > 1 ? reviews[(at - 1 + reviews.length) % reviews.length] : null;
  const next = reviews.length > 1 ? reviews[(at + 1) % reviews.length] : null;

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <div className="mx-auto max-w-3xl">
        {/* Назад — к ЭТОЙ карточке в карусели на главной, а не к началу
            страницы: якорь #review-<slug> разбирает сама ClientReviews
            (почему не обычный id — в её шапке). До 24.09 ссылка вела на
            /#reviews с подписью Home и из-за PageTransition приводила на
            самый верх главной. */}
        <BackLink href={`/#review-${review.slug}`}>All reviews</BackLink>

        <article
          className={`mt-6 rounded-3xl p-6 sm:p-12 ${ACCENT_CARD[review.accent]}`}
        >
          <header className="flex items-center gap-4 sm:gap-5">
            <ReviewAvatar
              avatars={review.avatars}
              name={review.name}
              size="lg"
              ringClassName={ACCENT_RING[review.accent]}
              priority
            />
            <div className="min-w-0">
              {/* Имя переносится, а не обрезается: «Luke & Sven» на
                  телефоне не влезает в строку рядом с двумя аватарами, а
                  многоточие в заголовке прячет половину клиентов. */}
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {review.name}
                {review.flag && <Flag emoji={review.flag} className="ml-2 align-middle" />}
              </h1>
              <p
                className={`mt-1 text-sm font-medium uppercase tracking-wide ${ACCENT_TEXT[review.accent]}`}
              >
                {review.role}
              </p>
            </div>
          </header>

          <blockquote className="mt-8 sm:mt-10">
            <Quotes
              size={40}
              weight="fill"
              aria-hidden
              className={ACCENT_TEXT[review.accent]}
            />
            <p className="mt-4 text-xl font-medium leading-8 sm:text-2xl sm:leading-10">
              {review.text}
            </p>
          </blockquote>
        </article>

        {prev && next && (
          <nav
            aria-label="More reviews"
            className="mt-10 grid gap-4 sm:grid-cols-2"
          >
            <NeighborLink review={prev} direction="prev" />
            <NeighborLink review={next} direction="next" />
          </nav>
        )}
      </div>
    </main>
  );
}

// Сосед снизу страницы: аватар, имя, стрелка в сторону перехода.
// Стрелка — та же иконка Phosphor, что в BackLink, и сдвигается на
// наведении так же: направление подсказывает, что будет по клику.
function NeighborLink({
  review,
  direction,
}: {
  review: Review;
  direction: "prev" | "next";
}) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className={`group flex items-center gap-4 rounded-3xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 ${
        isNext ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Arrow
        size={18}
        weight="bold"
        className={`shrink-0 text-orange-500 transition-transform dark:text-orange-400 ${
          isNext ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
        }`}
      />
      <ReviewAvatar
        avatars={review.avatars}
        name={review.name}
        size="sm"
        // Фон ссылки — фон страницы (и светлеет на наведении), поэтому
        // обводка второго аватара — цвет страницы, а не акцента.
        ringClassName="ring-[#fbfbff] dark:ring-zinc-950"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {isNext ? "Next review" : "Previous review"}
        </span>
        <span className="block truncate font-semibold text-zinc-950 dark:text-zinc-50">
          {review.name}
        </span>
      </span>
    </Link>
  );
}
