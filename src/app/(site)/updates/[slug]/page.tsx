import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageGlow } from "@/components/PageGlow";
import { ArticleBody } from "@/components/ArticleBody";
import { BackLink } from "@/components/BackLink";
import { Button, INLINE_LINK } from "@/components/Button";
import { UpdateMeta } from "@/components/UpdateMeta";
import { UPDATES, getAllUpdates, getUpdate } from "@/lib/updates";

const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Посты лежат в коде, поэтому все адреса известны на сборке и страницы
// собираются заранее (● в выводе build). Чужой слаг — notFound().
export function generateStaticParams() {
  return UPDATES.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getUpdate(slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/updates/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `/updates/${post.slug}`,
      publishedTime: post.date,
      // Относительный путь достраивает metadataBase из корневого layout:
      // ссылка на пост в Discord покажет обложку, а не пустую рамку.
      images: [post.cover.src],
    },
  };
}

// Страница поста устроена как статья вики, а не как деталь-страница
// работы или карты — со свечением и дисплейным шрифтом. Правило «деталь
// без hero» (DESIGN.md, 08.08) про страницы, где главное — сама вещь на
// фотографии. Здесь главное — текст, а обложка его иллюстрирует.
export default async function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getUpdate(slug);
  if (!post) notFound();

  // Соседи по ленте, а не по порядку объявления в файле: «новее» и
  // «старше» обязаны значить ровно то, что написано.
  const feed = getAllUpdates();
  const index = feed.findIndex((item) => item.slug === post.slug);
  const newer = index > 0 ? feed[index - 1] : null;
  const older = index < feed.length - 1 ? feed[index + 1] : null;

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <div className="relative mx-auto max-w-6xl pb-16 pt-20 sm:pb-24">
        <PageGlow color="rgba(251,146,60,0.35)" />

        <article className="mx-auto max-w-3xl">
          <BackLink href="/updates">All updates</BackLink>

          <div className="mt-8">
            <UpdateMeta post={post} />
          </div>
          <h1
            className={`${displayFont.className} mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            {post.summary}
          </p>

          <figure className="mt-10">
            <div className="relative aspect-video overflow-hidden rounded-3xl">
              <Image
                src={post.cover.src}
                alt={post.cover.alt}
                fill
                priority
                sizes="(min-width: 768px) 48rem, 100vw"
                className="object-cover"
              />
            </div>
            {post.cover.pictured && (
              <figcaption className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Pictured:{" "}
                <Link
                  href={`/portfolio/${post.cover.pictured.slug}`}
                  className={INLINE_LINK}
                >
                  {post.cover.pictured.name}
                </Link>
              </figcaption>
            )}
          </figure>

          <ArticleBody sections={post.body} />

          {post.link && (
            <div className="mt-12">
              <Button href={post.link.href}>{post.link.label}</Button>
            </div>
          )}

          {/* Соседи. Пустая колонка у края держит «старше» справа, даже
              когда «новее» нет, — тот же приём, что у статей вики. */}
          <nav
            aria-label="More updates"
            className="mt-16 flex gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800"
          >
            <div className="flex-1">
              {newer && (
                <Link
                  href={`/updates/${newer.slug}`}
                  className="group inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                >
                  <ArrowLeft size={16} className="shrink-0" />
                  <span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-500">
                      Newer
                    </span>
                    {newer.title}
                  </span>
                </Link>
              )}
            </div>
            <div className="flex-1 text-right">
              {older && (
                <Link
                  href={`/updates/${older.slug}`}
                  className="group inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                >
                  <span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-500">
                      Older
                    </span>
                    {older.title}
                  </span>
                  <ArrowRight size={16} className="shrink-0" />
                </Link>
              )}
            </div>
          </nav>
        </article>
      </div>
    </main>
  );
}
