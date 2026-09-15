import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageGlow } from "@/components/PageGlow";
import { UpdateMeta } from "@/components/UpdateMeta";
import { getAllUpdates, type UpdatePost } from "@/lib/updates";

// Тот же дисплейный шрифт, что у остальных заголовков сайта.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "What's new",
  description:
    "Everything that changed on SouCampus builds, newest first: new builds, new corners of the marketplace, and the fixes behind them.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
  const [latest, ...rest] = getAllUpdates();

  return (
    // Клип на полноширинном <main>, ограничение ширины — на секциях
    // внутри: требование PageGlow.
    <main className="relative w-full overflow-x-clip px-6">
      <section className="relative mx-auto max-w-6xl pb-8 pt-20 sm:pb-12">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <span className="text-sm font-semibold text-orange-500">
          What&apos;s new
        </span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Fresh from the workshop
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Everything that changed on the site, newest first — new builds, new
          corners of the marketplace, and the fixes you&apos;d only notice if
          they weren&apos;t there.
        </p>
      </section>

      <div className="mx-auto max-w-6xl space-y-4 pb-16 sm:pb-24">
        {latest && <LatestUpdate post={latest} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <UpdateCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </main>
  );
}

// Свежий пост — крупнее остальных, картинка рядом с текстом. Лента без
// акцента читается архивом, а новость обязана выглядеть новостью.
// priority только здесь: это первое, что видно на странице, и её LCP.
// Остальные обложки — ниже сгиба, им хватает ленивой загрузки.
function LatestUpdate({ post }: { post: UpdatePost }) {
  return (
    <Link
      href={`/updates/${post.slug}`}
      className="group grid overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] transition-colors hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-400 lg:grid-cols-2"
    >
      <div className="relative aspect-video">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          fill
          priority
          sizes="(min-width: 1024px) 36rem, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <UpdateMeta post={post} />
        {/* Заголовок внутри карточки, а не секции: он крупнее H3 соседних
            карточек, но не спорит с H1 страницы. */}
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">
          {post.title}
        </h2>
        <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">
          {post.summary}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
          Read the update
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}

// Карточка — та же рамка, что у статей вики, плюс обложка 16:9: кадры
// обложек подобраны под эту пропорцию (шапка updates.ts).
function UpdateCard({ post }: { post: UpdatePost }) {
  return (
    <Link
      href={`/updates/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] transition-colors hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-400"
    >
      <div className="relative aspect-video">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          fill
          sizes="(min-width: 1024px) 23rem, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="p-6">
        <UpdateMeta post={post} />
        <h3 className="mt-2 text-lg font-semibold text-zinc-950 group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">
          {post.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {post.summary}
        </p>
      </div>
    </Link>
  );
}
