import Image from "next/image";
import { Info } from "@phosphor-icons/react/dist/ssr";
import type { ArticleSection } from "@/lib/article-blocks";

// Единственный отрисовщик тела текста — статьи Wiki, лицензии в /terms и
// поста What's new. До 2026-09-15 назывался WikiArticleBody и принимал
// статью целиком; принимает он теперь только разделы, потому что больше
// ему от статьи ничего и не было нужно, а у поста своя шапка.
//
// Блоки превращаются в разметку ЗДЕСЬ — в данных её нет, поэтому никакого
// dangerouslySetInnerHTML на этом пути не появится даже случайно.
//
// Пять видов блока, и они разные по смыслу, а не по виду:
//   text  — абзац.
//   steps — нумерованный порядок: шаги, которые делают ПОДРЯД.
//   list  — маркированный набор: пункты, независимые друг от друга.
//   note  — оговорка в рамке: то, что человек прочтёт, только если она
//           выбивается из потока.
//   image — картинка из public/ в собственной пропорции (появилась с
//           постами: новость «одиннадцать новых работ» без самих работ
//           была бы списком названий).
// Разница между steps и list не косметическая: перепутав их, мы говорим
// «делай в любом порядке» там, где порядок обязателен.
export function ArticleBody({ sections }: { sections: ArticleSection[] }) {
  return (
    <div className="mt-10 space-y-12">
      {sections.map((section) => (
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

              if (block.kind === "image") {
                return (
                  // Настоящие width/height, а не fill в рамке 16:9: рамка
                  // повторяет пропорцию исходника (article-blocks.ts).
                  // h-auto держит пропорцию при сжатии до ширины колонки,
                  // а размеры заранее резервируют место — текст ниже не
                  // прыгает, когда картинка догружается.
                  <figure key={key}>
                    <Image
                      src={block.src}
                      alt={block.alt}
                      width={block.width}
                      height={block.height}
                      sizes="(min-width: 768px) 48rem, 100vw"
                      className="h-auto w-full rounded-2xl"
                    />
                    {block.caption && (
                      <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
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
