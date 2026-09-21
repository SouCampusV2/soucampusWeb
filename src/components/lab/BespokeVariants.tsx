"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { CallToAction, Work, displayFont, useKitMotion } from "./kit";
import { DURATION, EASE, staggerIndex } from "./motion-tokens";
import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";

// ============================================================
// Четыре варианта, которые конфигом не выражаются: у них отличается не
// раскладка, а САМО ДВИЖЕНИЕ. Каждый — линза одного из привезённых
// анимационных скиллов.
//
// ⚠️ НИ ОДНА БИБЛИОТЕКА ИЗ СКИЛЛОВ СЮДА НЕ УСТАНОВЛЕНА, и это решение,
// а не лень. GSAP, anime.js, react-spring, Lottie и AOS — это пять
// новых зависимостей в проекте, который с 29.07 наоборот СНИМАЕТ Motion
// со страниц ради веса, а 07.09 вытаскивал витрину с 65 до 80+ баллов.
// Поставить их «на посмотреть» значит принять решение о
// производительности молча и за владельца.
//
// Поэтому здесь воспроизведён ПРИЁМ, ради которого каждую из них берут,
// на том, что уже есть (Motion + CSS). Если вариант понравится, тогда и
// обсуждается, нужна ли под него библиотека — уже зная, что именно она
// даёт на этой конкретной странице.
// ============================================================

type Props = { projects: Project[]; reviews: Review[]; stats: Stat[] };

// ------------------------------------------------------------
// 1. Прокрутка управляет — линза gsap-scrolltrigger.
//
// Приём, ради которого берут ScrollTrigger: первый экран ПРИКРЕПЛЁН, а
// прокрутка не листает его, а проигрывает. Здесь то же самое на
// position: sticky и useScroll: фотография приближается, заголовок
// уезжает, полоса прогресса показывает, сколько осталось.
// ------------------------------------------------------------
export function VariantScrub({ projects, stats }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.25]);
  const titleY = useTransform(scrollYProgress, [0, 1], reduced ? ["0%", "0%"] : ["0%", "-40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const photo = projects[0];

  return (
    <div>
      {/* Высота в два экрана: первый «прикреплён», второй — путь, по
          которому проигрывается анимация. */}
      <div ref={ref} className="relative h-[200vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {photo && (
            <motion.div style={{ scale }} className="absolute inset-0 -z-10">
              <Image src={photo.image} alt="" fill priority sizes="100vw" className="object-cover" />
            </motion.div>
          )}
          <div className="absolute inset-0 -z-10 bg-zinc-950/55" />

          <motion.div style={{ y: titleY, opacity: fade }} className="px-6 text-center">
            <h1
              className={`${displayFont.className} text-5xl leading-tight tracking-tight text-[#fbfbff] sm:text-7xl`}
            >
              Scroll through a world
            </h1>
            <p className="mt-6 text-lg text-zinc-200">
              The first screen plays instead of scrolling past.
            </p>
          </motion.div>

          {/* Полоса прогресса — единственное, что объясняет человеку,
              почему страница «не листается». Без неё прикреплённый
              экран читается как зависший. */}
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="absolute bottom-0 left-0 h-1 w-full origin-left bg-orange-500"
          />
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((stat) => (
            <p key={stat.id} className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                {stat.value}
                {stat.suffix}
              </span>{" "}
              {stat.label}
            </p>
          ))}
        </div>
        <div className="mt-12">
          <Work projects={projects} layout="strip" density="normal" motionProps={() => ({})} />
        </div>
        <div className="mt-12">
          <CallToAction motionProps={() => ({})} />
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// 2. Пружины — линза react-spring-physics.
//
// Приём: движение не по кривой времени, а по физике. Карточки
// отзываются на курсор с инерцией и перелётом, а не «проигрывают
// анимацию». Motion умеет то же самое через spring — библиотека не
// нужна, нужен подход.
// ------------------------------------------------------------
export function VariantSpring({ projects, reviews }: Props) {
  const reduced = useReducedMotion();

  return (
    <div>
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-20">
        <h1
          className={`${displayFont.className} max-w-3xl text-4xl leading-tight tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50`}
        >
          Things that move like things
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Drag a card. It resists, overshoots and settles — the way weight does.
        </p>
        <div className="mt-10">
          <CallToAction motionProps={() => ({})} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <SpringCard key={project.slug} project={project} reduced={!!reduced} />
          ))}
        </div>

        {reviews[0] && (
          <p className="mt-12 max-w-2xl text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            “{reviews[0].text}” — {reviews[0].name}
          </p>
        )}
      </section>
    </div>
  );
}

function SpringCard({ project, reduced }: { project: Project; reduced: boolean }) {
  // Пружина: жёсткость и затухание вместо длительности. Числа подобраны
  // так, чтобы перелёт был заметен, но не выглядел желе.
  const lift = useSpring(0, { stiffness: 300, damping: 18 });

  return (
    <motion.div
      drag={reduced ? false : true}
      dragSnapToOrigin
      dragElastic={0.18}
      whileTap={{ cursor: "grabbing" }}
      onHoverStart={() => lift.set(reduced ? 0 : -8)}
      onHoverEnd={() => lift.set(0)}
      style={{ y: lift }}
      className="cursor-grab"
    >
      <Link href={`/portfolio/${project.slug}`} className="block" draggable={false}>
        <div className="relative h-44 overflow-hidden rounded-2xl">
          <Image src={project.image} alt="" fill sizes="33vw" className="object-cover" draggable={false} />
        </div>
        <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {project.title}
        </p>
      </Link>
    </motion.div>
  );
}

// ------------------------------------------------------------
// 3. Таймлайн — линза animejs.
//
// Приём: не «каждый блок появляется сам по себе», а одна
// поставленная последовательность — как в титрах. Буквы заголовка,
// затем подпись, затем кнопки, затем плитки, строго по счёту.
//
// ⚠️ Потолок из motion-system соблюдён: вся последовательность
// укладывается в 500мс, иначе это уже не ритм, а ожидание.
// ------------------------------------------------------------
export function VariantTimeline({ projects, stats }: Props) {
  const reduced = useReducedMotion();
  const letters = "SouCampus".split("");

  return (
    <div>
      <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-24">
        <h1
          className={`${displayFont.className} text-6xl tracking-tight text-zinc-950 sm:text-8xl dark:text-zinc-50`}
          aria-label="SouCampus"
        >
          {letters.map((letter, i) => (
            <motion.span
              key={`${letter}-${i}`}
              aria-hidden
              initial={{ opacity: 0, y: reduced ? 0 : 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : DURATION.moderate,
                delay: reduced ? 0 : i * 0.03,
                ease: EASE.decelerate,
              }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.3, duration: DURATION.slow }}
          className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400"
        >
          A staged sequence, not twelve separate animations.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.4, duration: DURATION.slow }}
          className="mt-10"
        >
          <CallToAction motionProps={() => ({})} />
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduced ? 0 : 0.45 + staggerIndex(i),
                duration: DURATION.moderate,
                ease: EASE.decelerate,
              }}
              className="rounded-2xl bg-zinc-950/[0.03] p-5 dark:bg-zinc-50/[0.04]"
            >
              <p className={`${displayFont.className} text-2xl text-zinc-950 dark:text-zinc-50`}>
                {stat.value}
                {stat.suffix}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12">
          <Work projects={projects} layout="bento" density="normal" motionProps={() => ({})} count={5} />
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------
// 4. Готовые компоненты — линза animated-component-libraries
//    (Magic UI / React Bits).
//
// Приём: страница собирается из узнаваемых «эффектных» блоков —
// бегущая строка, счётчик, светящаяся рамка. Быстро, эффектно и
// одинаково у всех, кто берёт ту же библиотеку.
//
// ⚠️ Последнее — и есть главный риск этого варианта, а не вес. Сайт,
// собранный из чужих готовых эффектов, выглядит как чужой сайт.
// ------------------------------------------------------------
export function VariantTicker({ projects, stats }: Props) {
  const props = useKitMotion("rise");
  const reduced = useReducedMotion();

  return (
    <div>
      <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-20 text-center">
        {/* Светящаяся рамка — тот самый «gradient border» из таких
            наборов. Сделан на двух слоях, без библиотеки. */}
        <div className="mx-auto inline-block rounded-full bg-gradient-to-r from-orange-500 via-lime-400 to-blue-400 p-[2px]">
          <p className="rounded-full bg-[#fbfbff] px-5 py-2 text-sm font-semibold text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
            Open for commissions
          </p>
        </div>

        <h1
          className={`${displayFont.className} mx-auto mt-8 max-w-3xl text-4xl leading-tight tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50`}
        >
          Built to order, shipped as a file
        </h1>

        <div className="mt-10 flex justify-center">
          <CallToAction motionProps={() => ({})} />
        </div>
      </section>

      {/* Бегущая строка — приём, который в таких наборах идёт первым
          пунктом. У нас он уже есть в CountriesMarquee, здесь тот же
          механизм применён к названиям работ. */}
      <section className="overflow-hidden border-y border-zinc-950/[0.06] py-6 dark:border-zinc-50/[0.06]">
        <motion.div
          animate={reduced ? {} : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="flex w-max gap-10 whitespace-nowrap"
        >
          {[...projects, ...projects].map((project, i) => (
            <span
              key={`${project.slug}-${i}`}
              className={`${displayFont.className} text-2xl text-zinc-400 dark:text-zinc-600`}
            >
              {project.title}
            </span>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.id} {...props(i)} className="text-center">
              <p className={`${displayFont.className} text-4xl text-zinc-950 dark:text-zinc-50`}>
                {stat.value}
                {stat.suffix}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14">
          <Work projects={projects} layout="grid" density="normal" motionProps={props} />
        </div>
      </section>
    </div>
  );
}
