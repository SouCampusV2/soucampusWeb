"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { useReveal, DURATION, EASE, staggerIndex } from "./motion-tokens";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

const displayFont = Unbounded({ subsets: ["latin"], weight: ["600", "700"] });

// ============================================================
// Вариант A — «Издание»: лендинг как разворот журнала.
//
// ГИПОТЕЗА. Сейчас первый экран выровнен по центру и читается как
// визитка: заголовок, подпись, две кнопки. Это вежливо и ничем не
// запоминается — так выглядит половина сайтов-студий.
//
// Здесь всё выровнено ПО ЛЕВОМУ КРАЮ и собрано в колонку с широким
// полем справа, как в печатном тексте. Глаз идёт сверху вниз по одной
// линии, а не скачет от центра к центру (F-паттерн из скилла
// visual-hierarchy).
//
// ЧЕМ ЖЕРТВУЕМ, И ЭТО НАДО ЗНАТЬ:
//   - фотографий на первом экране нет вовсе. Для студии построек это
//     спорно: работы — главный аргумент, и убрать их наверх значит
//     поверить, что слова продадут лучше картинки;
//   - зато первый экран грузится почти мгновенно, а LCP становится
//     текстом, а не фотографией.
//
// Цвета наши. Новое — тональные подложки: очень светлый оранжевый и
// лаймовый как фон целых полос, а не как акцент на кнопке.
// ============================================================

export function VariantEditorial({
  projects,
  reviews,
  stats,
}: {
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
}) {
  const reveal = useReveal();
  const featured = projects.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Первый экран: одна колонка, левое выравнивание, огромный тип. */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.moderate }}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400"
        >
          Minecraft build studio
        </motion.p>

        {/* Строки заголовка выезжают лесенкой — по строке, а не целиком.
            Шаг 40мс из motion-tokens: глаз успевает прочитать первую,
            пока приходит вторая. */}
        <h1
          className={`${displayFont.className} mt-6 max-w-4xl text-5xl leading-[1.05] tracking-tight text-zinc-950 sm:text-7xl dark:text-zinc-50`}
        >
          {["Worlds built", "by hand,", "not generated."].map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DURATION.deliberate,
                delay: staggerIndex(i),
                ease: EASE.decelerate,
              }}
              className="block"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, delay: 0.25, ease: EASE.decelerate }}
          className="mt-8 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400"
        >
          Custom maps, structures and entire worlds — from a rough idea to a
          place people want to walk through.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, delay: 0.3, ease: EASE.decelerate }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          {/* Главное действие одно — правило «один primary CTA на экран»
              из DESIGN.md и из скилла. Второе намеренно тише. */}
          <Button href="/portfolio" variant="primary" size="md">
            See what I&apos;ve built
          </Button>
          <Button href="/contact" variant="secondary" size="md">
            Order a map
          </Button>
        </motion.div>
      </section>

      {/* Полоса цифр — тонально, без карточек. Числа крупные, подписи
          мелкие: контраст размеров 1.5x и больше, как требует скилл. */}
      <section className="border-y border-zinc-950/[0.06] bg-orange-50/60 dark:border-zinc-50/[0.06] dark:bg-orange-950/10">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.id} {...reveal(i)}>
              <p
                className={`${displayFont.className} text-4xl tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50`}
              >
                {stat.value}
                <span className="text-orange-600 dark:text-orange-400">
                  {stat.suffix}
                </span>
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Работы — нумерованным списком, как статьи в оглавлении.
          Фотография появляется СПРАВА и только на широком экране: на
          телефоне это была бы четвёртая одинаковая карточка. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.h2
          {...reveal()}
          className={`${displayFont.className} text-3xl tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50`}
        >
          Selected work
        </motion.h2>

        <ol className="mt-10 divide-y divide-zinc-950/[0.08] dark:divide-zinc-50/[0.08]">
          {featured.map((project, i) => (
            <motion.li key={project.slug} {...reveal(i)}>
              <Link
                href={`/portfolio/${project.slug}`}
                className="group grid grid-cols-1 items-center gap-6 py-8 sm:grid-cols-[3rem_1fr_12rem]"
              >
                <span className="text-sm font-semibold tabular-nums text-zinc-400 dark:text-zinc-600">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-950 transition-colors group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">
                    {project.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
                    {project.summary}
                  </p>
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
                    {project.tag} · {project.size} · {project.deadline}
                  </p>
                </div>

                <div className="relative hidden h-28 w-full overflow-hidden rounded-xl sm:block">
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="12rem"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
            </motion.li>
          ))}
        </ol>

        <motion.div {...reveal()} className="mt-10">
          <Button href="/portfolio" variant="secondary" size="md">
            All sixteen builds
          </Button>
        </motion.div>
      </section>

      {/* Отзыв — один, крупной цитатой. Не карусель: карусель говорит
          «их много», цитата говорит «прочитай эту». */}
      {reviews[0] && (
        <section className="border-y border-zinc-950/[0.06] bg-lime-50/60 dark:border-zinc-50/[0.06] dark:bg-lime-950/10">
          <motion.figure
            {...reveal()}
            className="mx-auto w-full max-w-4xl px-6 py-20"
          >
            <blockquote
              className={`${displayFont.className} text-2xl leading-relaxed tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50`}
            >
              “{reviews[0].text}”
            </blockquote>
            <figcaption className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {reviews[0].name}
              </span>{" "}
              · {reviews[0].role} {reviews[0].flag}
            </figcaption>
          </motion.figure>
        </section>
      )}
    </div>
  );
}
