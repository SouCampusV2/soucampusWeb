import type { Metadata } from "next";
import Link from "next/link";
import { HELP_BODY, HELP_H2, HelpPageHeader } from "@/components/HelpTabs";
import { WIKI_SECTIONS, WIKI_UPDATED, articlesInSection } from "@/lib/wiki";


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
    <main className="relative w-full overflow-x-clip">
      {/* Шапка общая для четырёх справочных страниц (HelpTabs.tsx). */}
      <HelpPageHeader active="wiki" title="Wiki" updated={WIKI_UPDATED}>
        The answers that would otherwise be repeated in Discord: getting a
        map into your game, what a download contains, and how commissions
        are priced and delivered.
      </HelpPageHeader>

      {/* Разделы идут в порядке WIKI_SECTIONS, статьи внутри — в порядке
          объявления в wiki.ts. Сортировки здесь нет намеренно: порядок
          справки задаёт автор, а не алфавит — «как поставить карту»
          обязана стоять первой. */}
      <div className={HELP_BODY}>
        {WIKI_SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 className={HELP_H2}>
              {section.title}
            </h2>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {section.description}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articlesInSection(section.id).map((article) => (
                <Link
                  key={article.slug}
                  href={`/wiki/${article.slug}`}
                  className="group rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 transition-colors hover:border-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-400"
                >
                  <h3 className="font-semibold text-zinc-950 group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
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
