"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Unbounded } from "next/font/google";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";

// Первая секция /about с 16.11 (бренд, docs/BRAND-IDEAS.md, раздел 2;
// выбрана в лаборатории — вариант А2·1). Слева — SouCampus, пара фраз,
// команды и кнопки; в правом верхнем углу — большой пиксельный цветок
// SouCampus на лаймовом свечении, растёт и поворачивается при прокрутке.
// Заменила AuthorCta («зелёное яблоко на пол-экрана»).
//
// Решения владельца по ходу (15–16.11), чтобы не вернуть отвергнутое:
//   · цветок пиксельный и зелёный (About — лаймовая страница), без тени;
//   · крупный сразу, а не вырастающий из маленького; размер — от ширины
//     экрана, на широком мониторе маленький цветок «терялся»;
//   · бейджа «About me» над заголовком нет — убран по просьбе;
//   · секция прозрачная: свечение и лёгкое размытие под текстом, без
//     белой подложки во всю ширину.
//
// ⚠️ Пиксельный знак — SVG одним контуром на часть (PixelArt.tsx): при
// росте в 1.8 раза отдельные прямоугольники давали щели между клетками.

const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Студии и команды. Первые три — из таймлайна ниже на этой же странице,
// новые (now) — со слов владельца 16.11.
const TEAMS = [
  { name: "HoneyFrost", href: "https://honeyfrost.net" },
  { name: "BreadBuilds" },
  { name: "Odyssey" },
  { name: "Coastline", href: "https://coastline.gg/", now: true },
  { name: "Master Duckies", href: "https://www.masterduckies.com/", now: true },
  { name: "Keystone Games", href: "https://keystonegames.us/portfolio", now: true },
];

const FLOWER = {
  grow: 1.8, // во сколько раз вырастает за прокрутку секции
  turn: -10, // поворот за прокрутку, градусов
};

const CHIP =
  "flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";

export function AboutFlowerIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, FLOWER.grow]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, FLOWER.turn]);

  return (
    // -mt-[82px]: обёртка навбара (sticky) занимает ~82px в потоке, и без
    // этого над свечением была белая полоса — тот же приём был у AuthorCta.
    <section ref={sectionRef} className="relative -mt-[82px] overflow-hidden">
      <motion.div
        style={reduce ? undefined : { scale, rotate }}
        aria-hidden="true"
        className="pointer-events-none absolute right-[-8vw] top-[-6rem] size-[min(58vw,37rem)] origin-top-right lg:size-[min(45vw,48rem)]"
      >
        <div
          className="absolute inset-[-25%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(124,207,0,0.4), transparent 65%)" }}
        />
        <PixelFlower palette="lime" className="relative size-full" />
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-44 sm:pb-32 sm:pt-52">
        <div className="max-w-xl rounded-3xl bg-white/50 p-1 backdrop-blur-[2px] dark:bg-zinc-950/40">
          <h1
            className={`${displayFont.className} text-5xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-7xl`}
          >
            SouCampus
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            8 years building worlds in Minecraft professionally — maps and worlds for servers, studios and
            Marketplace teams. My goal is to turn every idea into a map worth exploring.
          </p>

          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Teams I&apos;ve built with
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {TEAMS.map((t) => {
              const label = (
                <>
                  {t.name}
                  {t.now && (
                    <span className="rounded-full bg-orange-500 px-1.5 text-[10px] font-bold uppercase text-zinc-950">
                      now
                    </span>
                  )}
                </>
              );
              return (
                <li key={t.name}>
                  {t.href ? (
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${CHIP} hover:bg-zinc-200 dark:hover:bg-zinc-800`}
                    >
                      {label}
                    </a>
                  ) : (
                    <span className={CHIP}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/portfolio" className={`${BUTTON_PILL} ${BUTTON_COLORS.primary}`}>
              See my builds
            </Link>
            <Link href="/contact" className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}>
              Order a build
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
