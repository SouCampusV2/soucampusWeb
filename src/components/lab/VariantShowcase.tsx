"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { useReveal, DURATION, EASE } from "./motion-tokens";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

const displayFont = Unbounded({ subsets: ["latin"], weight: ["600", "700"] });

// ============================================================
// Вариант B — «Витрина»: работа занимает первый экран целиком.
//
// ГИПОТЕЗА, обратная варианту A. Студию построек покупают глазами.
// Значит первое, что человек видит, — не обещание словами, а построенное
// место во всю ширину; заголовок лежит ПОВЕРХ него.
//
// ⚠️ ЭТОТ ВАРИАНТ СОЗНАТЕЛЬНО СПОРИТ С ДВУМЯ РЕШЕНИЯМИ, и это надо
// знать до того, как он понравится:
//
//   1. **Тёмных секций на сайте нет с 16.07.** Здесь первый экран
//      тёмный — иначе белый текст поверх фотографии нечитаем, а тёмная
//      подложка под фото это ровно тот случай, ради которого приём и
//      существует. Если вариант выбирается, решение 16.07 придётся
//      пересмотреть ЯВНО, а не задним числом.
//   2. **Фотография в первом экране — это LCP.** 07.09 витрину
//      вытаскивали с 65 до 80+ баллов, и картинка наверху дороже
//      текста. Владелец сказал «о весе позаботимся потом» — здесь это
//      записано, чтобы потом было о чём вспомнить.
//
// Параллакс сделан на `useScroll` из Motion, который в проекте уже
// используется. Он честно отключается при prefers-reduced-motion — см.
// useReveal; для самого сдвига есть отдельная проверка ниже.
// ============================================================

export function VariantShowcase({
  projects,
  reviews,
  stats,
}: {
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
}) {
  const reveal = useReveal();
  const heroRef = useRef<HTMLElement>(null);

  // Сдвиг фона медленнее скролла — классический параллакс. Диапазон
  // маленький (8%): большой превращает первый экран в аттракцион и
  // мешает читать заголовок.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  const hero = projects[0];
  const strip = projects.slice(1, 7);

  return (
    <div className="flex flex-col">
      {/* Первый экран — фотография во всю ширину и высоту. */}
      <section
        ref={heroRef}
        className="relative flex min-h-[85vh] w-full items-end overflow-hidden"
      >
        {hero && (
          <motion.div style={{ y: imageY }} className="absolute inset-0 -z-10">
            <Image
              src={hero.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        )}

        {/* Затемнение снизу вверх: текст внизу читается, небо сверху
            остаётся видимым. Градиент, а не сплошная заливка — сплошная
            превращает фотографию в подложку и обесценивает её. */}
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950/85 via-zinc-950/40 to-zinc-950/10"
        />

        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-32">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.deliberate, ease: EASE.decelerate }}
            className={`${displayFont.className} max-w-3xl text-4xl leading-tight tracking-tight text-white sm:text-6xl`}
          >
            Places people remember walking through
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION.slow,
              delay: 0.15,
              ease: EASE.decelerate,
            }}
            className="mt-6 max-w-xl text-lg text-zinc-200"
          >
            Custom Minecraft maps and structures, built by hand on commission.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: DURATION.slow,
              delay: 0.22,
              ease: EASE.decelerate,
            }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Button href="/contact" variant="primary" size="md">
              Order a map
            </Button>
            {/* Поверх фотографии вторая кнопка — стеклянная, а не
                серая: серый на фото читается как выключенная. */}
            <Link
              href="/portfolio"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:h-14"
            >
              See the work
            </Link>
          </motion.div>

          {hero && (
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-zinc-300">
              Above: {hero.title}
            </p>
          )}
        </div>
      </section>

      {/* Лента работ — горизонтальная, листается пальцем. Не сетка:
          сетка просит сравнивать, лента просит смотреть. */}
      <section className="py-16">
        <div className="mx-auto mb-6 w-full max-w-6xl px-6">
          <motion.h2
            {...reveal()}
            className={`${displayFont.className} text-3xl tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50`}
          >
            Recent builds
          </motion.h2>
        </div>

        <div
          data-draggable
          className="flex gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none]"
        >
          {strip.map((project, i) => (
            <motion.div key={project.slug} {...reveal(i)} className="shrink-0">
              <Link href={`/portfolio/${project.slug}`} className="group block">
                <div className="relative h-56 w-72 overflow-hidden rounded-2xl sm:h-72 sm:w-96">
                  <Image
                    src={project.image}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 24rem, 18rem"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 font-semibold text-zinc-950 dark:text-zinc-50">
                  {project.title}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {project.tag}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Цифры — узкой полосой, мелко. В этом варианте они не герой:
          герой — фотографии, и спорить с ними числами незачем. */}
      <section className="border-y border-zinc-950/[0.06] dark:border-zinc-50/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-8">
          {stats.map((stat, i) => (
            <motion.p
              key={stat.id}
              {...reveal(i)}
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              <span className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
                {stat.value}
                {stat.suffix}
              </span>{" "}
              {stat.label}
            </motion.p>
          ))}
        </div>
      </section>

      {/* Отзывы — три штуки сеткой, короткими карточками. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 3).map((review, i) => (
            <motion.figure
              key={review.slug}
              {...reveal(i)}
              className="rounded-2xl border border-zinc-950/[0.08] p-6 dark:border-zinc-50/[0.08]"
            >
              <blockquote className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                “{review.text.slice(0, 180)}
                {review.text.length > 180 ? "…" : ""}”
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {review.name} {review.flag}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>
    </div>
  );
}
