"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда (15.11): варианты первой секции /about. Владелец
// выбирает номер — выбранный переносится в AboutFlowerIntro, файл удаляется.
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Unbounded } from "next/font/google";
import { PixelFlower } from "@/components/brand/PixelArt";
import { Label } from "./Label";

const display = Unbounded({ weight: "800", subsets: ["latin"] });

type Variant = {
  /** Пиксельный знак или гладкий. */
  pixel: boolean;
  /** Где стоит цветок: снизу справа, сверху справа или справа по центру. */
  corner: "br" | "tr" | "r";
  /** Цвет свечения вокруг цветка (CSS-цвет с прозрачностью). */
  glow: string;
  /** Во сколько раз вырастает за прокрутку секции. */
  grow: number;
  /** Поворот за прокрутку, градусов. */
  turn: number;
  palette?: "orange" | "lime" | "cream" | "peach";
};

const PLACE = {
  br: "right-[-12rem] bottom-[-10rem] origin-bottom-right",
  tr: "right-[-10rem] top-[-6rem] origin-top-right",
  r: "right-[-14rem] top-1/2 -translate-y-1/2 origin-right",
};

export function AboutIntro({ v }: { v: Variant }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, v.grow]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, v.turn]);

  return (
    <section ref={ref} className="relative min-h-[1000px] overflow-hidden bg-white dark:bg-zinc-950">
      <motion.div
        style={reduce ? undefined : { scale, rotate }}
        className={`pointer-events-none absolute size-[40rem] sm:size-[46rem] ${PLACE[v.corner]}`}
      >
        {/* Свечение — мягкий круг за цветком, растёт вместе с ним. */}
        <div
          className="absolute inset-[-30%] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${v.glow}, transparent 65%)` }}
        />
        {v.pixel ? (
          <PixelFlower palette={v.palette ?? "orange"} className="relative size-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- SVG знака, оптимизировать нечего
          <img src="/brand/smooth/transparent/flower-neutral.svg" alt="" className="relative size-full" />
        )}
      </motion.div>

      <div className="relative mx-auto max-w-6xl px-6 pt-40">
        <div className="max-w-xl">
          <span className="text-sm font-semibold text-lime-600">About me</span>
          <h2 className={`${display.className} mt-3 text-5xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-7xl`}>
            SouCampus
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            8 years building worlds in Minecraft professionally. My goal is to turn every idea into a map worth
            exploring.
          </p>
        </div>
      </div>
    </section>
  );
}

const ABOUT_VARIANTS: { name: string; note: string; v: Variant }[] = [
  {
    name: "Пиксельный, снизу справа, оранжевое свечение",
    note: "Цветок наполовину за краем, растёт в 2.4 раза",
    v: { pixel: true, corner: "br", glow: "rgba(255,105,0,0.35)", grow: 2.4, turn: 12 },
  },
  {
    name: "Пиксельный, сверху справа, лаймовое свечение",
    note: "Оранжевый цветок на лаймовом свете, растёт в 2 раза",
    v: { pixel: true, corner: "tr", glow: "rgba(124,207,0,0.4)", grow: 2, turn: -10 },
  },
  {
    name: "Гладкий, снизу справа, оранжевое свечение",
    note: "Тот же ход, что №1, но гладкий знак — сравнить",
    v: { pixel: false, corner: "br", glow: "rgba(255,105,0,0.3)", grow: 2.4, turn: 12 },
  },
  {
    name: "Пиксельный лаймовый, справа по центру, персиковое свечение",
    note: "Лаймовый цветок с оранжевой серединкой, растёт в 3 раза",
    v: { pixel: true, corner: "r", glow: "rgba(255,184,106,0.5)", grow: 3, turn: 20, palette: "lime" },
  },
  {
    name: "Пиксельный кремовый, снизу справа, оранжевое свечение",
    note: "Светлый цветок на сильном оранжевом свете — мягче на белом фоне",
    v: { pixel: true, corner: "br", glow: "rgba(255,105,0,0.55)", grow: 2.6, turn: 8, palette: "cream" },
  },
];

/** Все варианты подряд, с подписями. */
export function AboutLab() {
  return ABOUT_VARIANTS.map((a, i) => (
    <div key={a.name}>
      <Label n={`А${i + 1}`} name={a.name} note={a.note} />
      <AboutIntro v={a.v} />
    </div>
  ));
}
