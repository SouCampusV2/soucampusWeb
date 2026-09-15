import { Info } from "@phosphor-icons/react/dist/ssr";
import type { WikiArticle } from "@/lib/wiki";

// Единственный отрисовщик тела статьи. Блоки из wiki.ts превращаются в
// разметку ЗДЕСЬ — в данных её нет, поэтому никакого
// dangerouslySetInnerHTML на этом пути не появится даже случайно.
//
// Четыре вида блока, и они разные по смыслу, а не по виду:
//   text  — абзац.
//   steps — нумерованный порядок: шаги, которые делают ПОДРЯД.
//   list  — маркированный набор: пункты, независимые друг от друга.
//   note  — оговорка в рамке: то, что человек прочтёт, только если она
//           выбивается из потока.
// Разница между steps и list не косметическая: перепутав их, мы говорим
// «делай в любом порядке» там, где порядок обязателен.
export function WikiArticleBody({ article }: { article: WikiArticle }) {
  return (
    <div className="mt-10 space-y-12">
      {article.body.map((section) => (
        <section key={section.heading}>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {section.heading}
          </h2>

          <div className="mt-4 space-y-4">
            {section.blocks.map((block, index) => {
              // Ключ по индексу — блоки внутри секции неподвижны: список
              // статический, ничего не сортируется и не удаляется на
              // лету, поэтому индекс здесь честно постоянный.
              const key = `${section.heading}-${index}`;

              if (block.kind === "text") {
                return (
                  <p
                    key={key}
                    className="leading-7 text-zinc-600 dark:text-zinc-400"
                  >
                    {block.text}
                  </p>
                );
              }

              if (block.kind === "steps") {
                return (
                  <ol key={key} className="space-y-3">
                    {block.items.map((item, step) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-zinc-950 dark:bg-orange-400">
                          {step + 1}
                        </span>
                        <span className="leading-7 text-zinc-600 dark:text-zinc-400">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ol>
                );
              }

              if (block.kind === "list") {
                return (
                  <ul key={key} className="space-y-2">
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                        <span className="leading-7 text-zinc-600 dark:text-zinc-400">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              }

              return (
                <div
                  key={key}
                  className="flex gap-3 rounded-2xl border border-zinc-200 bg-[#fbfbff] p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Info
                    size={20}
                    weight="duotone"
                    className="mt-0.5 shrink-0 text-orange-400"
                  />
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {block.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
