"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { PageGlow } from "@/components/PageGlow";
import { DURATION, EASE, staggerIndex } from "./motion-tokens";
import { FONTS, type FontId } from "./fonts";
import { COUNTRIES, HEADINGS, PLANS, STEPS } from "./content";
import {
  CallToAction,
  Countries,
  H1,
  Pricing,
  Reviews,
  SECTION_PAD,
  Shell,
  StatsRow,
  Steps,
  Work,
  toneSurface,
  useKitMotion,
  type CountriesShape,
  type Density,
  type MotionKind,
  type PricingShape,
  type ReviewsShape,
  type StepsShape,
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
// ⚠️ КАЖДЫЙ ВАРИАНТ ПОКАЗЫВАЕТ ВЕСЬ ЛЕНДИНГ. Первая версия лаборатории
// срезала контент до пяти секций — и это была ошибка: сравнивали не
// дизайн, а упрощение. Макет, красивый на трёх блоках, разваливается на
// семи отзывах и пяти тарифах, и узнать это надо ЗДЕСЬ, а не после
// переноса.
//
// Отличаются: первый экран, шрифт, акцент, плотность, шкала, тон,
// порядок секций, форма каждой секции и способ появления. Не
// отличается только текст самих секций — он с живого сайта.
// ============================================================

export type HeroStyle =
  | "centered"
  | "left"
  | "split"
  | "overlay"
  | "column"
  | "kicker";

export type Section =
  | "stats"
  | "work"
  | "countries"
  | "reviews"
  | "steps"
  | "pricing"
  | "cta";

export type Accent = "orange" | "lime" | "blue";

const ACCENT_TEXT: Record<Accent, string> = {
  orange: "text-orange-600 dark:text-orange-400",
  lime: "text-lime-600 dark:text-lime-400",
  blue: "text-blue-600 dark:text-blue-400",
};

export type Preset = {
  id: string;
  label: string;
  skill: string;
  idea: string;
  risk: string;
  kicker?: string;
  headline: string;
  sub: string;
  hero: HeroStyle;
  font: FontId;
  accent: Accent;
  tone: Tone;
  density: Density;
  scale: TypeScale;
  motion: MotionKind;
  /** Порядок секций. Набор всегда полный, меняется только очередь. */
  sections: Section[];
  work: WorkLayout;
  workCount?: number;
  statsShape?: "plain" | "cards" | "inline";
  reviewsShape?: ReviewsShape;
  stepsShape?: StepsShape;
  pricingShape?: PricingShape;
  countriesShape?: CountriesShape;
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
  const font = FONTS[preset.font].className;
  const accent = ACCENT_TEXT[preset.accent];
  // ⚠️ Класс `dark` на корне, а не только чёрный фон — и это главное в
  // тёмном варианте. `dark:` в проекте привязан к классу `.dark`
  // (globals.css: `&:where(.dark, .dark *)`), то есть к ТЕМЕ САЙТА, а не
  // к тону секции. Без класса блоки внутри красили текст по светлой
  // теме: названия шагов, тарифов и цены выходили чёрным по чёрному.
  // Прогон по содержимому этого не видел — текст в странице был, его
  // просто нельзя было прочитать; поймал скриншот.
  //
  // С классом на корне тёмная тема включается на поддереве варианта, и
  // каждый блок набора становится тёмным сам, без своей перекраски.
  return (
    <div className={preset.tone === "dark" ? "dark bg-zinc-950" : ""}>
      <HeroBlock preset={preset} projects={projects} font={font} accent={accent} />
      <ComposedSections preset={preset} projects={projects} reviews={reviews} stats={stats} />
    </div>
  );
}

/** Все секции варианта, кроме первого экрана. */
function ComposedSections({
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
  const font = FONTS[preset.font].className;
  const accent = ACCENT_TEXT[preset.accent];
  const dark = preset.tone === "dark";
  const headingColor = dark ? "text-zinc-50" : "text-zinc-950 dark:text-zinc-50";

  const heading = (text: string, sub?: string) => (
    <div className="mb-8">
      <motion.h2
        {...props(0)}
        className={`${font} text-3xl tracking-tight sm:text-4xl ${headingColor}`}
      >
        {text}
      </motion.h2>
      {sub && (
        <motion.p {...props(1)} className="mt-2 text-zinc-600 dark:text-zinc-400">
          {sub}
        </motion.p>
      )}
    </div>
  );

  return (
    <div className={dark ? "bg-zinc-950" : ""}>
      {preset.sections.map((section, i) => (
        <Shell key={section} tone={preset.tone} index={i + 1} density={preset.density}>
          {section === "stats" && (
            <StatsRow
              stats={stats}
              density={preset.density}
              scale={preset.scale === "loud" ? "normal" : preset.scale}
              motionProps={props}
              shape={preset.statsShape ?? "plain"}
              font={font}
            />
          )}

          {section === "work" && (
            <>
              {heading(HEADINGS.work, HEADINGS.workSub)}
              <Work
                projects={projects}
                layout={preset.work}
                density={preset.density}
                motionProps={props}
                count={preset.workCount ?? 6}
              />
            </>
          )}

          {section === "countries" && (
            <>
              {heading(HEADINGS.countries)}
              <Countries
                countries={COUNTRIES}
                shape={preset.countriesShape ?? "marquee"}
                motionProps={props}
              />
            </>
          )}

          {section === "reviews" && (
            <>
              {heading(HEADINGS.reviews)}
              <Reviews
                reviews={reviews}
                shape={preset.reviewsShape ?? "grid"}
                density={preset.density}
                scale={preset.scale}
                motionProps={props}
                font={font}
              />
            </>
          )}

          {section === "steps" && (
            <>
              {heading(HEADINGS.steps)}
              <Steps
                steps={STEPS}
                shape={preset.stepsShape ?? "cards"}
                density={preset.density}
                motionProps={props}
                accent={accent}
                font={font}
              />
            </>
          )}

          {section === "pricing" && (
            <>
              {heading(HEADINGS.pricing, HEADINGS.pricingSub)}
              <Pricing
                plans={PLANS}
                shape={preset.pricingShape ?? "bento"}
                density={preset.density}
                motionProps={props}
                font={font}
              />
            </>
          )}

          {section === "cta" && (
            <div className="flex flex-col items-start gap-6">
              <motion.h2
                {...props(0)}
                className={`${font} max-w-2xl text-3xl tracking-tight sm:text-4xl ${headingColor}`}
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
// Первый экран — единственное место, где варианты расходятся сильно,
// поэтому он вынесен отдельно, а не сведён к параметру отступа.
// ------------------------------------------------------------
function HeroBlock({
  preset,
  projects,
  font,
  accent,
}: {
  preset: Preset;
  projects: Project[];
  font: string;
  accent: string;
}) {
  const dark = preset.tone === "dark";
  const textOnDark = dark || preset.hero === "overlay";
  const photo = projects[0];

  // Первый экран появляется сразу (animate), а не по прокрутке: он уже
  // на экране, ждать от него нечего.
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
      className={`${font} ${H1[preset.scale]} tracking-tight ${
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
        textOnDark ? "text-orange-300" : accent
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
      <section className={`${toneSurface(preset.tone, 0)} ${SECTION_PAD[preset.density]}`}>
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

  const alignment = preset.hero === "centered" ? "items-center text-center" : "items-start";
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

// ============================================================
// Остаток лендинга для написанных руками вариантов.
//
// У семи рукописных вариантов своё — первый экран и приём движения, а
// шаги, тарифы, страны и все семь отзывов им рисовать заново незачем.
// Раньше их не было вовсе, и сравнение было нечестным: рукописный
// вариант выглядел короче и чище просто потому, что показывал треть
// страницы. Теперь каждый дорисовывает остаток В СВОЁМ СТИЛЕ — шрифт,
// акцент, тон и формы секций задаются тем же описанием, что у собранных.
// ============================================================

export type RestStyle = Pick<
  Preset,
  | "font"
  | "accent"
  | "tone"
  | "density"
  | "scale"
  | "motion"
  | "reviewsShape"
  | "stepsShape"
  | "pricingShape"
  | "countriesShape"
> & {
  /** Какие секции дорисовать и в каком порядке. */
  sections: Section[];
};

export function RestOfLanding({
  style,
  projects,
  reviews,
  stats,
}: {
  style: RestStyle;
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
}) {
  // Тот же рендер, что у собранных вариантов: первый экран не нужен,
  // поэтому рисуем только секции — через описание без героя.
  const preset: Preset = {
    id: "rest",
    label: "",
    skill: "",
    idea: "",
    risk: "",
    headline: "",
    sub: "",
    hero: "left",
    work: "grid",
    ...style,
  };
  return (
    <ComposedSections preset={preset} projects={projects} reviews={reviews} stats={stats} />
  );
}
