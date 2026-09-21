"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Unbounded } from "next/font/google";
import { BUTTON_PILL } from "@/components/Button";
import { useReveal, DURATION, EASE, staggerIndex } from "./motion-tokens";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

const displayFont = Unbounded({ subsets: ["latin"], weight: ["600", "700"] });

// ============================================================
// Вариант C — «Блоки»: ритм самой игры, перенесённый в вёрстку.
//
// ГИПОТЕЗА. Первые два варианта — это хорошие лендинги, которые могли бы
// продавать что угодно: поменяй фотографии, и получится студия
// интерьеров. Здесь сделана попытка, чтобы страница выглядела как СВОЙ
// продукт: сетка из квадратов разного размера, появление клетками,
// ступенчатые края.
//
// Приём взят из того, что на сайте уже есть и заказано владельцем:
// анимация перехода между страницами рисует волну КЛЕТКАМИ. Здесь та же
// мысль применена к появлению секций — блоки встают лесенкой по
// диагонали, как будто их ставят.
//
// ⚠️ ГЛАВНЫЙ РИСК ЭТОГО ВАРИАНТА — НЕ ТЕХНИЧЕСКИЙ. Тематическая вёрстка
// стареет быстрее нейтральной и сужает: студия, которая выглядит как
// «сайт про Minecraft», сложнее продаёт заказ на 25000 блоков компании.
// Это решение о позиционировании, а не о цвете, и принимать его надо
// с открытыми глазами (`docs/BUSINESS.md` — про то, кто покупатель).
//
// Цвета наши, но используется вся тройка сразу: оранжевый как главный,
// lime и blue — как подложки соседних блоков. На обычных страницах так
// не делают намеренно (хаос из равнозначных акцентов), здесь это
// проверяется.
// ============================================================

export function VariantBlocks({
  projects,
  stats,
}: {
  projects: Project[];
  /** Отзывы рисует общий остаток страницы (RestOfLanding). */
  reviews?: Review[];
  stats: Stat[];
}) {
  const reveal = useReveal();
  const tiles = projects.slice(0, 5);

  return (
    <div className="flex flex-col">
      {/* Первый экран — сетка 2×2 из смысловых блоков, а не строка
          текста. Заголовок занимает один блок, а не всю ширину. */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Блок 1 — заголовок, на два столбца и две строки. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE.decelerate }}
            className="flex flex-col justify-between rounded-3xl bg-orange-500 p-8 sm:col-span-2 sm:row-span-2 dark:bg-orange-400"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-950/70">
              SouCampus builds
            </p>
            <h1
              className={`${displayFont.className} mt-8 text-4xl leading-tight tracking-tight text-zinc-950 sm:text-5xl`}
            >
              Maps built block by block, on commission
            </h1>
            {/* ⚠️ Обычная secondary-кнопка здесь НЕ РАБОТАЕТ, и это
                видно только на живом экране: она оранжевая с оранжевой
                обводкой, а лежит на оранжевом поле — то есть исчезает.
                Первый прогон именно так и выглядел.

                На цветной плашке кнопка обязана быть контрастной к
                НЕЙ, а не к странице. Тот же приём, что у стеклянной
                кнопки поверх фотографии в варианте B. */}
            <div className="mt-8">
              <Link
                href="/contact"
                className={`${BUTTON_PILL} bg-zinc-950 text-[#fbfbff] hover:bg-zinc-800`}
              >
                Order a map
              </Link>
            </div>
          </motion.div>

          {/* Блоки 2–3 — фотографии, встают следом лесенкой. */}
          {tiles.slice(0, 2).map((project, i) => (
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: DURATION.slow,
                delay: staggerIndex(i + 1),
                ease: EASE.decelerate,
              }}
              className="relative h-48 overflow-hidden rounded-3xl sm:h-auto"
            >
              <Link href={`/portfolio/${project.slug}`} className="group block h-full">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/80 to-transparent p-4 text-sm font-semibold text-white">
                  {project.title}
                </span>
              </Link>
            </motion.div>
          ))}

          {/* Блок 4 — lime, короткий аргумент. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: DURATION.slow,
              delay: staggerIndex(3),
              ease: EASE.decelerate,
            }}
            className="flex flex-col justify-center rounded-3xl bg-lime-400 p-8 dark:bg-lime-500"
          >
            <p
              className={`${displayFont.className} text-3xl tracking-tight text-zinc-950`}
            >
              16
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-950/80">
              builds delivered, each one from scratch
            </p>
          </motion.div>

          {/* Блок 5 — blue, второй аргумент. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: DURATION.slow,
              delay: staggerIndex(4),
              ease: EASE.decelerate,
            }}
            className="flex flex-col justify-center rounded-3xl bg-blue-400 p-8 dark:bg-blue-500"
          >
            <p className="text-sm font-medium leading-6 text-zinc-950/85">
              Ready-made maps you can download today — or a commission built to
              your brief.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 text-sm font-semibold text-zinc-950 underline decoration-2 underline-offset-4"
            >
              Browse the marketplace
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Цифры — квадратными плитками, появляются по диагонали. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.id}
              {...reveal(i)}
              // Не aspect-square: на широком экране квадрат под двумя
              // строчками текста превращается в пустую коробку — видно
              // на первом же скриншоте. Минимальная высота держит ритм
              // сетки, не заставляя плитку раздуваться.
              className="flex min-h-[8rem] flex-col justify-between rounded-2xl border border-zinc-950/[0.08] p-5 dark:border-zinc-50/[0.08]"
            >
              <p
                className={`${displayFont.className} text-3xl tracking-tight text-zinc-950 dark:text-zinc-50`}
              >
                {stat.value}
                {stat.suffix}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Работы — сетка разноразмерных плиток. Первая широкая: без
          акцента сетка читается как каталог, а не как избранное. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <motion.h2
          {...reveal()}
          className={`${displayFont.className} text-3xl tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50`}
        >
          The work
        </motion.h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {tiles.map((project, i) => (
            <motion.div
              key={project.slug}
              {...reveal(i)}
              className={i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
            >
              <Link href={`/portfolio/${project.slug}`} className="group block">
                <div
                  className={`relative overflow-hidden rounded-2xl ${
                    i === 0 ? "h-64 sm:h-full sm:min-h-[20rem]" : "h-40"
                  }`}
                >
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {project.title}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
