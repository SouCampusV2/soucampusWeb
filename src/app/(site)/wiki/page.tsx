import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { PageGlow } from "@/components/PageGlow";
import { WIKI_SECTIONS, articlesInSection } from "@/lib/wiki";

// Тот же дисплейный шрифт, что у остальных заголовков сайта.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wiki",
  description:
    "How to install a downloaded Minecraft map, what is inside the download, and how a custom build gets ordered.",
  alternates: { canonical: "/wiki" },
};

export default function WikiIndexPage() {
  return (
    // Клип на полноширинном <main>, ограничение ширины — на секциях
    // внутри: требование PageGlow.
    <main className="relative w-full overflow-x-clip px-6">
      <section className="relative mx-auto max-w-6xl pb-8 pt-20 sm:pb-12">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <span className="text-sm font-semibold text-orange-500">Wiki</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Everything, written down
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          The answers that would otherwise be repeated in Discord: getting a
          map into your game, what a download contains, and how commissions
          are priced and delivered.
        </p>
      </section>

      {/* Разделы идут в порядке WIKI_SECTIONS, статьи внутри — в порядке
          объявления в wiki.ts. Сортировки здесь нет намеренно: порядок
          справки задаёт автор, а не алфавит — «как поставить карту»
          обязана стоять первой. */}
      <div className="mx-auto max-w-6xl space-y-14 pb-16 sm:pb-24">
        {WIKI_SECTIONS.map((section) => (
          <section key={section.id}>
            {/* Заголовок раздела внутри длинного документа — без
                sm:-шага, как в /privacy и в теле статьи вики
                (DESIGN.md → «Типографика»). До 07.09 здесь стоял ещё и
                sm:text-3xl, и на сайте было ТРИ разных начертания
                «заголовка секции» вместо двух. */}
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {section.description}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articlesInSection(section.id).map((article) => (
                <Link
                  key={article.slug}
                  href={`/wiki/${article.slug}`}
                  className="group rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 transition-colors hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-400"
                >
                  <h3 className="font-semibold text-zinc-950 group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {article.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
