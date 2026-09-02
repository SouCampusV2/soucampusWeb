import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageGlow } from "@/components/PageGlow";
import { WikiArticleBody } from "@/components/WikiArticleBody";
import { BackLink } from "@/components/BackLink";
import {
  WIKI_ARTICLES,
  WIKI_SECTIONS,
  articlesInSection,
  getWikiArticle,
} from "@/lib/wiki";

const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Статьи лежат в коде, а не в базе, поэтому список адресов известен на
// сборке целиком и не требует запроса. Всё, чего здесь нет, отдаёт 404
// (dynamicParams по умолчанию true, но getWikiArticle вернёт null и
// notFound() сработает раньше).
export function generateStaticParams() {
  return WIKI_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getWikiArticle(slug);
  if (!article) return { title: "Not found" };

  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/wiki/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      url: `/wiki/${article.slug}`,
    },
  };
}

export default async function WikiArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getWikiArticle(slug);
  if (!article) notFound();

  // Соседи считаются по ОБЩЕМУ порядку статей, а не внутри раздела:
  // человек, дочитавший последнюю статью про карты, идёт дальше по
  // справке, а не упирается в тупик на границе раздела.
  const index = WIKI_ARTICLES.findIndex((item) => item.slug === article.slug);
  const previous = index > 0 ? WIKI_ARTICLES[index - 1] : null;
  const next =
    index < WIKI_ARTICLES.length - 1 ? WIKI_ARTICLES[index + 1] : null;

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <div className="relative mx-auto max-w-6xl pb-16 pt-20 sm:pb-24">
        <PageGlow color="rgba(251,146,60,0.35)" />

        <BackLink href="/wiki">Back to wiki</BackLink>

        <div className="mt-8 gap-12 lg:flex">
          {/* Оглавление. На узких экранах оно уезжает ВНИЗ (order-2), а не
              прячется: справочник без списка соседних статей — набор
              несвязанных страниц, а на телефоне длинный список поверх
              текста читался бы как препятствие перед ответом. */}
          <nav className="order-2 mt-16 shrink-0 lg:order-1 lg:mt-0 lg:w-56">
            <div className="lg:sticky lg:top-28">
              {WIKI_SECTIONS.map((section) => (
                <div key={section.id} className="mb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {section.title}
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {articlesInSection(section.id).map((item) => {
                      const current = item.slug === article.slug;
                      return (
                        <li key={item.slug}>
                          <Link
                            href={`/wiki/${item.slug}`}
                            // aria-current, а не только цвет: читалка
                            // экрана цвет не произносит, и без него
                            // «где я» слышно не было бы.
                            aria-current={current ? "page" : undefined}
                            className={
                              current
                                ? "text-sm font-semibold text-orange-600 dark:text-orange-400"
                                : "text-sm text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                            }
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <article className="order-1 min-w-0 flex-1 lg:order-2 lg:max-w-3xl">
            <span className="text-sm font-semibold text-orange-500">
              {WIKI_SECTIONS.find((s) => s.id === article.section)?.title}
            </span>
            <h1
              className={`${displayFont.className} mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
            >
              {article.title}
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              {article.summary}
            </p>

            <WikiArticleBody article={article} />

            {/* Соседи. Пустая колонка у краёв списка держит «следующую»
                справа даже когда предыдущей нет — иначе она прыгала бы
                влево на первой статье. */}
            <div className="mt-16 flex gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
              <div className="flex-1">
                {previous && (
                  <Link
                    href={`/wiki/${previous.slug}`}
                    className="group inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                  >
                    <ArrowLeft size={16} />
                    <span>{previous.title}</span>
                  </Link>
                )}
              </div>
              <div className="flex-1 text-right">
                {next && (
                  <Link
                    href={`/wiki/${next.slug}`}
                    className="group inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                  >
                    <span>{next.title}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
