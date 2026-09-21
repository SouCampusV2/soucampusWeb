"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Unbounded } from "next/font/google";
import { Button, BUTTON_PILL } from "@/components/Button";
import { DURATION, EASE, staggerIndex, useReveal } from "./motion-tokens";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

export const displayFont = Unbounded({ subsets: ["latin"], weight: ["600", "700"] });

// ============================================================
// Набор блоков лендинга, из которых собираются варианты.
//
// ПОЧЕМУ НАБОР, А НЕ ДВАДЦАТЬ ОТДЕЛЬНЫХ СТРАНИЦ. Двадцать рукописных
// лендингов — это двадцать копий одного и того же: заголовок, цифры,
// работы, отзыв, призыв. Копии разъезжаются (в этом проекте так уже
// было с градиентом — семь штук, и чинили каждый раз одну), а главное —
// сравнивать их нечестно: разница пряталась бы в мелочах вёрстки, а не
// в замысле.
//
// Здесь наоборот: содержимое ОДНО И ТО ЖЕ, а отличается то, что и
// должно отличаться в дизайне — плотность, ритм, размер шрифта, тон,
// порядок блоков и способ появления. Тогда переключение показывает
// именно решение, а не случайный отступ.
//
// ⚠️ Каждый вариант объявляет, ЧЕЙ ОН: какой привезённый скилл дал
// идею. Это не украшение — через неделю «почему тут так» должно
// отвечаться без догадок.
// ============================================================

/** Плотность: сколько воздуха между блоками и внутри них. */
export type Density = "tight" | "normal" | "airy";

/** Размер шрифта заголовков относительно обычного. */
export type TypeScale = "calm" | "normal" | "loud";

/** Тон поверхностей: чем красим фоны секций. */
export type Tone = "plain" | "bands" | "tonal" | "dark" | "paper";

/** Как появляются блоки при прокрутке. */
export type MotionKind = "none" | "fade" | "rise" | "stagger" | "scale";

export const SECTION_PAD: Record<Density, string> = {
  tight: "py-10",
  normal: "py-16",
  airy: "py-28 sm:py-36",
};

export const GAP: Record<Density, string> = {
  tight: "gap-2",
  normal: "gap-4",
  airy: "gap-8",
};

export const H1: Record<TypeScale, string> = {
  calm: "text-3xl sm:text-4xl",
  normal: "text-4xl sm:text-6xl",
  loud: "text-5xl leading-[1.02] sm:text-8xl",
};

export const H2: Record<TypeScale, string> = {
  calm: "text-xl sm:text-2xl",
  normal: "text-3xl sm:text-4xl",
  loud: "text-4xl sm:text-6xl",
};

/** Фон секции по тону. Индекс нужен «полосам»: они чередуются. */
export function toneSurface(tone: Tone, index: number): string {
  switch (tone) {
    case "bands":
      return index % 2 === 1
        ? "bg-orange-50/60 dark:bg-orange-950/10"
        : "bg-transparent";
    case "tonal":
      // Одна краска, разная светлота — то, что скилл color-system
      // называет тональной шкалой: цвет остаётся один, меняется тон.
      return [
        "bg-transparent",
        "bg-orange-50/70 dark:bg-orange-950/15",
        "bg-orange-100/60 dark:bg-orange-950/25",
      ][index % 3];
    case "dark":
      return "bg-zinc-950 text-zinc-100";
    case "paper":
      return "bg-[#f4f1ea] dark:bg-zinc-900";
    default:
      return "bg-transparent";
  }
}

/**
 * Появление блока. Один вызов на все варианты: способ движения —
 * параметр, а не своя копия анимации в каждом файле.
 *
 * `none` возвращает пустой объект, то есть элемент просто есть. Это
 * тоже вариант дизайна, и на него стоит посмотреть: страница без
 * единого появления читается быстрее и спокойнее.
 */
export function useKitMotion(kind: MotionKind) {
  const reveal = useReveal();

  return function props(index = 0) {
    if (kind === "none") return {};
    if (kind === "fade") {
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: DURATION.slow, ease: EASE.decelerate },
      };
    }
    if (kind === "scale") {
      return {
        initial: { opacity: 0, scale: 0.96 },
        whileInView: { opacity: 1, scale: 1 },
        viewport: { once: true, margin: "-80px" },
        transition: {
          duration: DURATION.slow,
          delay: staggerIndex(index),
          ease: EASE.decelerate,
        },
      };
    }
    if (kind === "stagger") return reveal(index);
    return reveal(0);
  };
}

// ------------------------------------------------------------
// Блоки
// ------------------------------------------------------------

export function Shell({
  children,
  tone,
  index,
  density,
}: {
  children: React.ReactNode;
  tone: Tone;
  index: number;
  density: Density;
}) {
  return (
    <section className={`${toneSurface(tone, index)} ${SECTION_PAD[density]}`}>
      <div className="mx-auto w-full max-w-6xl px-6">{children}</div>
    </section>
  );
}

export function StatsRow({
  stats,
  density,
  scale,
  motionProps,
  shape = "plain",
}: {
  stats: Stat[];
  density: Density;
  scale: TypeScale;
  motionProps: (i?: number) => object;
  shape?: "plain" | "cards" | "inline";
}) {
  if (shape === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {stats.map((stat, i) => (
          <motion.p
            key={stat.id}
            {...motionProps(i)}
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            <span className="font-bold text-zinc-950 dark:text-zinc-50">
              {stat.value}
              {stat.suffix}
            </span>{" "}
            {stat.label}
          </motion.p>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 ${GAP[density]}`}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.id}
          {...motionProps(i)}
          className={
            shape === "cards"
              ? "rounded-2xl border border-zinc-950/[0.08] p-5 dark:border-zinc-50/[0.08]"
              : ""
          }
        >
          <p
            className={`${displayFont.className} ${H2[scale]} tracking-tight text-zinc-950 dark:text-zinc-50`}
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
  );
}

export type WorkLayout = "grid" | "list" | "strip" | "bento" | "single";

export function Work({
  projects,
  layout,
  density,
  motionProps,
  count = 6,
}: {
  projects: Project[];
  layout: WorkLayout;
  density: Density;
  motionProps: (i?: number) => object;
  count?: number;
}) {
  const items = projects.slice(0, count);

  if (layout === "list") {
    return (
      <ol className="divide-y divide-zinc-950/[0.08] dark:divide-zinc-50/[0.08]">
        {items.map((project, i) => (
          <motion.li key={project.slug} {...motionProps(i)}>
            <Link
              href={`/portfolio/${project.slug}`}
              className="group grid grid-cols-1 items-center gap-6 py-7 sm:grid-cols-[3rem_1fr_10rem]"
            >
              <span className="text-sm font-semibold tabular-nums text-zinc-400 dark:text-zinc-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 transition-colors group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400">
                  {project.title}
                </h3>
                <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  {project.summary}
                </p>
              </div>
              <div className="relative hidden h-20 w-full overflow-hidden rounded-xl sm:block">
                <Image src={project.image} alt="" fill sizes="10rem" className="object-cover" />
              </div>
            </Link>
          </motion.li>
        ))}
      </ol>
    );
  }

  if (layout === "strip") {
    return (
      <div
        data-draggable
        className={`flex overflow-x-auto pb-4 [scrollbar-width:none] ${GAP[density]}`}
      >
        {items.map((project, i) => (
          <motion.div key={project.slug} {...motionProps(i)} className="shrink-0">
            <Link href={`/portfolio/${project.slug}`} className="group block">
              <div className="relative h-52 w-72 overflow-hidden rounded-2xl sm:h-64 sm:w-80">
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes="20rem"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 font-semibold text-zinc-950 dark:text-zinc-50">
                {project.title}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    );
  }

  if (layout === "single") {
    const project = items[0];
    if (!project) return null;
    return (
      <motion.div {...motionProps(0)}>
        <Link href={`/portfolio/${project.slug}`} className="group block">
          <div className="relative h-80 w-full overflow-hidden rounded-3xl sm:h-[28rem]">
            <Image
              src={project.image}
              alt=""
              fill
              sizes="100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <p className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {project.title}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">{project.summary}</p>
        </Link>
      </motion.div>
    );
  }

  // grid и bento отличаются одним: в bento первая плитка крупнее.
  return (
    <div className={`grid sm:grid-cols-3 ${GAP[density]}`}>
      {items.map((project, i) => (
        <motion.div
          key={project.slug}
          {...motionProps(i)}
          className={layout === "bento" && i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}
        >
          <Link href={`/portfolio/${project.slug}`} className="group block">
            <div
              className={`relative overflow-hidden rounded-2xl ${
                layout === "bento" && i === 0 ? "h-64 sm:h-full sm:min-h-[18rem]" : "h-40"
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
  );
}

export function Quote({
  review,
  scale,
  motionProps,
  shape = "big",
}: {
  review: Review | undefined;
  scale: TypeScale;
  motionProps: (i?: number) => object;
  shape?: "big" | "card";
}) {
  if (!review) return null;

  if (shape === "card") {
    return (
      <motion.figure
        {...motionProps(0)}
        className="rounded-3xl border border-zinc-950/[0.08] p-8 dark:border-zinc-50/[0.08]"
      >
        <blockquote className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
          “{review.text}”
        </blockquote>
        <figcaption className="mt-5 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {review.name} · {review.role} {review.flag}
        </figcaption>
      </motion.figure>
    );
  }

  return (
    <motion.figure {...motionProps(0)} className="mx-auto max-w-4xl">
      <blockquote
        className={`${displayFont.className} ${H2[scale]} leading-snug tracking-tight text-zinc-950 dark:text-zinc-50`}
      >
        “{review.text}”
      </blockquote>
      <figcaption className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-semibold text-zinc-950 dark:text-zinc-50">
          {review.name}
        </span>{" "}
        · {review.role} {review.flag}
      </figcaption>
    </motion.figure>
  );
}

export function CallToAction({
  motionProps,
  invert = false,
}: {
  motionProps: (i?: number) => object;
  invert?: boolean;
}) {
  return (
    <motion.div {...motionProps(0)} className="flex flex-col items-start gap-4 sm:flex-row">
      {invert ? (
        <Link
          href="/contact"
          className={`${BUTTON_PILL} bg-[#fbfbff] text-zinc-950 hover:bg-zinc-200`}
        >
          Order a map
        </Link>
      ) : (
        <Button href="/contact" variant="primary" size="md">
          Order a map
        </Button>
      )}
      <Link
        href="/portfolio"
        className={`${BUTTON_PILL} ${
          invert
            ? "border-2 border-white/40 text-[#fbfbff] hover:border-white/70"
            : "border-2 border-orange-500 text-orange-500 hover:border-orange-600 hover:text-orange-600 dark:border-orange-400 dark:text-orange-400"
        }`}
      >
        See the work
      </Link>
    </motion.div>
  );
}
