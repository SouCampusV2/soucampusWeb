"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { PageGlow } from "@/components/PageGlow";
import { DURATION, EASE, staggerIndex } from "./motion-tokens";
import {
  CallToAction,
  H1,
  Quote,
  SECTION_PAD,
  Shell,
  StatsRow,
  Work,
  displayFont,
  toneSurface,
  useKitMotion,
  type Density,
  type MotionKind,
  type Tone,
  type TypeScale,
  type WorkLayout,
} from "./kit";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

// ============================================================
// Сборка варианта по описанию.
//
// Вариант здесь — это НАБОР РЕШЕНИЙ, записанный словами: какой первый
// экран, сколько воздуха, какого размера заголовки, чем крашены
// поверхности, как появляются блоки, в каком порядке идут секции и как
// показаны работы. Из тех же данных получаются заметно разные страницы.
//
// ⚠️ Текст в вариантах РАЗНЫЙ, и это не лень копирайтера. Композиция и
// формулировка — одно решение: «Worlds built by hand» просит крупного
// начертания и тишины вокруг, а «Ready-made maps, ready today» просит
// плотной сетки и кнопки рядом. Сравнивать макеты на одинаковом тексте
// значит сравнивать только отступы.
// ============================================================

export type HeroStyle =
  /** Всё по центру — как сейчас на сайте. */
  | "centered"
  /** Левый край, широкое поле справа. */
  | "left"
  /** Текст слева, фотография справа. */
  | "split"
  /** Фотография во всю ширину, текст поверх. */
  | "overlay"
  /** Узкая колонка по центру — «мобильный на десктопе». */
  | "column"
  /** Мелкая надстрочная строка, затем огромный заголовок. */
  | "kicker";

export type Section = "stats" | "work" | "quote" | "cta";

export type Preset = {
  id: string;
  label: string;
  /** Какой привезённый скилл дал идею. */
  skill: string;
  /** Что именно проверяет этот вариант. */
  idea: string;
  /** Чем за это платим. */
  risk: string;
  kicker?: string;
  headline: string;
  sub: string;
  hero: HeroStyle;
  tone: Tone;
  density: Density;
  scale: TypeScale;
  motion: MotionKind;
  sections: Section[];
  work: WorkLayout;
  workCount?: number;
  statsShape?: "plain" | "cards" | "inline";
  quoteShape?: "big" | "card";
  /** Показать ли свечение за первым экраном (наш PageGlow). */
  glow?: boolean;
};

export function ComposedVariant({
  preset,
  projects,
  reviews,
  stats,
}: {
  preset: Preset;
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
}) {
  const props = useKitMotion(preset.motion);
  const dark = preset.tone === "dark";

  return (
    <div className={dark ? "bg-zinc-950" : ""}>
      <HeroBlock preset={preset} projects={projects} />

      {preset.sections.map((section, i) => (
        <Shell key={section} tone={preset.tone} index={i + 1} density={preset.density}>
          {section === "stats" && (
            <StatsRow
              stats={stats}
              density={preset.density}
              scale={preset.scale === "loud" ? "normal" : preset.scale}
              motionProps={props}
              shape={preset.statsShape ?? "plain"}
            />
          )}

          {section === "work" && (
            <>
              <motion.h2
                {...props(0)}
                className={`${displayFont.className} mb-8 text-3xl tracking-tight sm:text-4xl ${
                  dark ? "text-zinc-50" : "text-zinc-950 dark:text-zinc-50"
                }`}
              >
                Selected work
              </motion.h2>
              <Work
                projects={projects}
                layout={preset.work}
                density={preset.density}
                motionProps={props}
                count={preset.workCount ?? 6}
              />
            </>
          )}

          {section === "quote" && (
            <Quote
              review={reviews[0]}
              scale={preset.scale}
              motionProps={props}
              shape={preset.quoteShape ?? "big"}
            />
          )}

          {section === "cta" && (
            <div className="flex flex-col items-start gap-6">
              <motion.h2
                {...props(0)}
                className={`${displayFont.className} max-w-2xl text-3xl tracking-tight sm:text-4xl ${
                  dark ? "text-zinc-50" : "text-zinc-950 dark:text-zinc-50"
                }`}
              >
                Tell me what you want built.
              </motion.h2>
              <CallToAction motionProps={props} invert={dark} />
            </div>
          )}
        </Shell>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Первый экран. Единственное место, где варианты расходятся сильно, —
// поэтому он и вынесен отдельно, а не сведён к параметру отступа.
// ------------------------------------------------------------
function HeroBlock({ preset, projects }: { preset: Preset; projects: Project[] }) {
  const dark = preset.tone === "dark";
  const textOnDark = dark || preset.hero === "overlay";
  const photo = projects[0];

  // Появление первого экрана — всегда сразу (animate), а не по
  // прокрутке: он уже на экране, и ждать от него нечего.
  const intro = (i: number) => ({
    initial: { opacity: 0, y: preset.motion === "none" ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: preset.motion === "none" ? 0 : DURATION.deliberate,
      delay: preset.motion === "none" ? 0 : staggerIndex(i),
      ease: EASE.decelerate,
    },
  });

  const title = (
    <motion.h1
      {...intro(1)}
      className={`${displayFont.className} ${H1[preset.scale]} tracking-tight ${
        textOnDark ? "text-[#fbfbff]" : "text-zinc-950 dark:text-zinc-50"
      }`}
    >
      {preset.headline}
    </motion.h1>
  );

  const sub = (
    <motion.p
      {...intro(2)}
      className={`mt-6 max-w-xl text-lg leading-8 ${
        textOnDark ? "text-zinc-200" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      {preset.sub}
    </motion.p>
  );

  const kicker = preset.kicker ? (
    <motion.p
      {...intro(0)}
      className={`text-sm font-semibold uppercase tracking-[0.2em] ${
        textOnDark ? "text-orange-300" : "text-orange-600 dark:text-orange-400"
      }`}
    >
      {preset.kicker}
    </motion.p>
  ) : null;

  const actions = (
    <motion.div {...intro(3)} className="mt-10">
      <CallToAction motionProps={() => ({})} invert={textOnDark} />
    </motion.div>
  );

  if (preset.hero === "overlay") {
    return (
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        {photo && (
          <Image
            src={photo.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950/85 via-zinc-950/40 to-zinc-950/10" />
        <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-32">
          {kicker}
          {title}
          {sub}
          {actions}
        </div>
      </section>
    );
  }

  if (preset.hero === "split") {
    return (
      <section
        className={`${toneSurface(preset.tone, 0)} ${SECTION_PAD[preset.density]}`}
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
          <div>
            {kicker}
            {title}
            {sub}
            {actions}
          </div>
          {photo && (
            <motion.div
              {...intro(2)}
              className="relative h-64 w-full overflow-hidden rounded-3xl sm:h-96"
            >
              <Image
                src={photo.image}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          )}
        </div>
      </section>
    );
  }

  const alignment =
    preset.hero === "centered"
      ? "items-center text-center"
      : preset.hero === "column"
        ? "items-start"
        : "items-start";

  const width = preset.hero === "column" ? "max-w-2xl" : "max-w-6xl";

  return (
    <section
      className={`relative ${toneSurface(preset.tone, 0)} ${SECTION_PAD[preset.density]} overflow-x-clip`}
    >
      {preset.glow && <PageGlow color="rgba(249,115,22,0.35)" />}
      <div className={`mx-auto flex w-full ${width} flex-col ${alignment} px-6`}>
        {kicker}
        {title}
        {sub}
        <div className={preset.hero === "centered" ? "flex justify-center" : ""}>
          {actions}
        </div>
      </div>
    </section>
  );
}
