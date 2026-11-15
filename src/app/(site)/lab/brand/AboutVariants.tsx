"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда, круг 2 (16.11). Владелец выбрал А2: цветок в
// правом верхнем углу, бейдж About me. Просьбы: цветок зелёный (About —
// лаймовая страница), заметно крупнее на широком экране, секция ниже,
// слева больше содержания. Здесь — три варианта цветка на этой основе.
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Unbounded } from "next/font/google";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { PixelFlower } from "@/components/brand/PixelArt";
import { Label } from "./Label";

const display = Unbounded({ weight: "800", subsets: ["latin"] });

// Студии и команды. Первые три — из таймлайна /about, новые — со слов
// владельца 16.11 (ссылки он прислал). Стаж в тексте ждёт сверки года.
const TEAMS = [
  { name: "HoneyFrost", href: "https://honeyfrost.net" },
  { name: "BreadBuilds" },
  { name: "Odyssey" },
  { name: "Coastline", href: "https://coastline.gg/", isNew: true },
  { name: "Master Duckies", href: "https://www.masterduckies.com/", isNew: true },
  { name: "Keystone Games", href: "https://keystonegames.us/portfolio", isNew: true },
];

type Variant = {
  /** Тень блока у пиксельного цветка. */
  shadow: boolean;
  /** Сколько цветок «за краем» и насколько он большой. */
  size: "big" | "huge";
  glow: string;
  grow: number;
  turn: number;
};

const SIZE = {
  // Размер от ширины экрана: на широком мониторе цветок растёт вместе с ним.
  big: "size-[min(72vw,46rem)] right-[-8vw] top-[-6rem] lg:size-[min(56vw,60rem)]",
  huge: "size-[min(90vw,56rem)] right-[-16vw] top-[-12rem] lg:size-[min(66vw,74rem)]",
};

function AboutIntro({ v }: { v: Variant }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, v.grow]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, v.turn]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-white dark:bg-zinc-950">
      <motion.div
        style={reduce ? undefined : { scale, rotate }}
        className={`pointer-events-none absolute origin-top-right ${SIZE[v.size]}`}
      >
        <div
          className="absolute inset-[-25%] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${v.glow}, transparent 65%)` }}
        />
        <PixelFlower palette="lime" shadow={v.shadow ? "#3d630066" : undefined} className="relative size-full" />
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-36 sm:pb-32 sm:pt-44">
        <div className="max-w-xl rounded-3xl bg-white/50 p-1 backdrop-blur-[2px] dark:bg-zinc-950/40">
          <span className="inline-block rounded-full bg-lime-100 px-3 py-1 text-sm font-semibold text-lime-700 dark:bg-lime-950 dark:text-lime-400">
            About me
          </span>
          <h2 className={`${display.className} mt-4 text-5xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-7xl`}>
            SouCampus
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            8 years building worlds in Minecraft professionally — maps and worlds for servers, studios and
            Marketplace teams. My goal is to turn every idea into a map worth exploring.
          </p>

          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Teams I&apos;ve built with
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {TEAMS.map((t) => {
              const chip = (
                <>
                  {t.name}
                  {t.isNew && (
                    <span className="rounded-full bg-orange-500 px-1.5 text-[10px] font-bold uppercase text-zinc-950">now</span>
                  )}
                </>
              );
              const cls =
                "flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
              return (
                <li key={t.name}>
                  {t.href ? (
                    <a href={t.href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-zinc-200 dark:hover:bg-zinc-800`}>
                      {chip}
                    </a>
                  ) : (
                    <span className={cls}>{chip}</span>
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

const VARIANTS: { name: string; note: string; v: Variant }[] = [
  {
    name: "Зелёный цветок, без тени, крупный",
    note: "Лаймовое свечение, при прокрутке растёт в 1.8 раза",
    v: { shadow: false, size: "big", glow: "rgba(124,207,0,0.4)", grow: 1.8, turn: -10 },
  },
  {
    name: "Зелёный цветок с тенью блока",
    note: "Тот же, что первый, плюс тень на клетку вниз-вправо",
    v: { shadow: true, size: "big", glow: "rgba(124,207,0,0.4)", grow: 1.8, turn: -10 },
  },
  {
    name: "Зелёный цветок ещё больше, сильнее за краем",
    note: "Свечение ярче, растёт в 2.2 раза",
    v: { shadow: false, size: "huge", glow: "rgba(124,207,0,0.55)", grow: 2.2, turn: -14 },
  },
];

export function AboutLab() {
  return VARIANTS.map((a, i) => (
    <div key={a.name}>
      <Label n={`А2·${i + 1}`} name={a.name} note={a.note} />
      <AboutIntro v={a.v} />
    </div>
  ));
}
