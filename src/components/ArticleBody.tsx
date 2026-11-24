import Image from "next/image";
import { ArrowSquareOut, Info } from "@phosphor-icons/react/dist/ssr";
import type { ArticleSection } from "@/lib/article-blocks";
import { TERTIARY_COLORS, TERTIARY_UNDERLINE } from "@/components/Button";

// Единственный отрисовщик тела текста — статьи Wiki, лицензии в /terms и
// поста What's new. До 2026-09-15 назывался WikiArticleBody и принимал
// статью целиком; принимает он теперь только разделы, потому что больше
// ему от статьи ничего и не было нужно, а у поста своя шапка.
//
// Блоки превращаются в разметку ЗДЕСЬ — в данных её нет, поэтому никакого
// dangerouslySetInnerHTML на этом пути не появится даже случайно.
//
// Шесть видов блока, и они разные по смыслу, а не по виду:
//   text  — абзац.
//   steps — нумерованный порядок: шаги, которые делают ПОДРЯД.
//   list  — маркированный набор: пункты, независимые друг от друга.
//   note  — оговорка в рамке: то, что человек прочтёт, только если она
//           выбивается из потока.
//   image — картинка из public/ в собственной пропорции (появилась с
//           постами: новость «одиннадцать новых работ» без самих работ
//           была бы списком названий).
//   links — внешние ссылки списком: куда идти скачивать (с 2026-11-12).
//           Ветка обязана стоять ДО последнего return: тот рисует note
//           для всего, что не узнал, и ссылки превратились бы в пустую
//           рамку без единой ошибки.
// Разница между steps и list не косметическая: перепутав их, мы говорим
// «делай в любом порядке» там, где порядок обязателен.
//
// nested (17.11): тело вложено в раздел чужой страницы — лицензия на /terms
// под своим h2 «Licence: …». Тогда заголовки разделов статьи — h3 и
// мельче, иначе «You can» стоял бы вровень с заголовком самого раздела.
export function ArticleBody({ sections, nested = false }: { sections: ArticleSection[]; nested?: boolean }) {
  const Heading = nested ? "h3" : "h2";
  return (
    <div className={nested ? "mt-4 space-y-8" : "mt-10 space-y-12"}>
      {sections.map((section) => (
        <section key={section.heading}>
          <Heading
            className={
              nested
                ? "text-lg font-semibold text-zinc-950 dark:text-zinc-50"
                : "text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50"
            }
          >
            {section.heading}
          </Heading>

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

              if (block.kind === "links") {
                return (
                  <ul key={key} className="space-y-3">
                    {block.items.map((link) => (
                      <li key={link.href} className="flex gap-3">
                        <ArrowSquareOut
                          size={18}
                          weight="duotone"
                          className="mt-1 shrink-0 text-orange-400"
                        />
                        <span className="leading-7 text-zinc-600 dark:text-zinc-400">
                          {/* Чужой сайт — новая вкладка, и rel обязателен:
                              без noopener открытая страница получает
                              window.opener и может увести нашу вкладку. */}
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-semibold ${TERTIARY_COLORS} ${TERTIARY_UNDERLINE}`}
                          >
                            {link.label}
                          </a>
                          {link.detail && <>: {link.detail}</>}
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
