"use client";

import { useEffect, useRef, useState } from "react";
import {
  EnvelopeSimple,
  ChatCircleText,
  Wallet,
  Cube,
  Gift,
} from "@phosphor-icons/react/dist/ssr";
import { FadeIn } from "@/components/FadeIn";
import fan from "@/lib/fan-shape.json";

// Иконка на шаг (2026-10-06, набор выбран владельцем): письмо → разговор
// → кошелёк → блок → подарок. Простые и однозначные, без игровых
// метафор. `dist/ssr` — как на /about: иконкам не нужен
// контекст Phosphor, и так они не тянут его в бандл.
const steps = [
  { title: "Request", icon: EnvelopeSimple, text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", icon: ChatCircleText, text: "We work out the details, style, timeline and price." },
  { title: "Deposit", icon: Wallet, text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", icon: Cube, text: "I build the map and show you progress along the way." },
  { title: "Delivery", icon: Gift, text: "Final walkthrough, revisions, remaining payment, map handover." },
];

// Веер SouCampus заполняется по шагам (бренд, 15.11, docs/BRAND-IDEAS.md,
// раздел 3). Сначала он пустой — видна только окантовка; шаг дошёл до
// середины экрана — его часть веера заливается цветом: шаг 1 — солнце,
// шаги 2–5 — по три лепестка слева направо (12 лепестков на 4 шага). На
// пятом шаге веер целый. Прокрутили назад — заливка уходит.
// Контуры — из public/brand/parts/fan-parts.svg (scripts/flower-shape.mjs
// пишет src/lib/fan-shape.json).
const PETALS_PER_STEP = 3;

// Цвет секции следует акценту страницы: на главной лайм, на /contact
// синий (2026-10-05) — там всё синее, от свечения до кнопки Discord.
// Шаги и тексты общие: процесс заказа один, где бы о нём ни рассказывали.
// Веер: пустой — светлый с тёмной окантовкой, залитый — оранжевый, цвет
// студии. Владелец хочет перепробовать сочетания — менять здесь.
const TONES = {
  lime: {
    bg: "bg-lime-300 dark:bg-lime-950",
    accent: "text-blue-800 dark:text-blue-400",
    empty: "fill-white dark:fill-zinc-900",
    filled: "fill-orange-500",
    stroke: "stroke-zinc-950 dark:stroke-lime-200",
  },
  blue: {
    bg: "bg-blue-300 dark:bg-blue-950",
    accent: "text-blue-900 dark:text-blue-300",
    empty: "fill-white dark:fill-zinc-900",
    filled: "fill-orange-500",
    stroke: "stroke-zinc-950 dark:stroke-blue-200",
  },
} as const;

export function HowItWorks({ tone = "lime" }: { tone?: keyof typeof TONES }) {
  const colors = TONES[tone];
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  // Сколько шагов пройдено (0–5): верх шага выше 60% высоты экрана.
  const [reached, setReached] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.6;
      setReached(stepRefs.current.filter((el) => el && el.getBoundingClientRect().top < line).length);
    };
    // Прокрутка приходит чаще кадров — считаем не чаще раза за кадр.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // motion-reduce: заливка меняется сразу, без перехода.
  const part = (on: boolean) =>
    `${on ? colors.filled : colors.empty} ${colors.stroke} transition-[fill] duration-[400ms] motion-reduce:transition-none`;

  return (
    <section className={`${colors.bg} py-16 sm:py-28`}>
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            How an order works
          </h2>
        </FadeIn>
        <p className="mt-2 max-w-xl text-zinc-700 dark:text-zinc-300">
          From the first message to a finished map — a transparent process in
          5 steps.
        </p>

        {/* Слева шаги, справа веер (общий принцип владельца: текст слева,
            визуал справа). Веер прилипает, пока идут шаги; на телефоне —
            небольшой, прилипает над шагами. */}
        <div className="mt-10 grid gap-8 sm:mt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
          <div className="sticky top-20 z-10 flex justify-center md:order-2 md:top-28 md:self-start">
            <svg
              viewBox={fan.viewBox}
              aria-hidden="true"
              className="w-28 drop-shadow-sm sm:w-40 md:w-full md:max-w-[28rem]"
              strokeWidth={0.6}
              strokeLinejoin="round"
            >
              <path d={fan.sun} className={part(reached >= 1)} />
              {fan.petals.map((d, i) => (
                <path key={i} d={d} className={part(reached >= 2 + Math.floor(i / PETALS_PER_STEP))} />
              ))}
            </svg>
          </div>

          <ol className="md:order-1">
            {steps.map((step, i) => (
              <li
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="py-6 sm:py-10 md:min-h-[38svh]"
              >
                {/* Номер ярче, когда шаг пройден — в такт вееру. */}
                <span
                  className={`text-4xl font-bold transition-opacity duration-300 ${colors.accent} ${reached > i ? "opacity-100" : "opacity-40"}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Иконка справа от названия шага, цветом текста (просьба
                    владельца 06.10). 24px: 28 рядом с заголовком в 18px
                    оказалось крупно, владелец уменьшил. */}
                <h3 className="mt-2 flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {step.title}
                  <step.icon size={24} aria-hidden="true" className="shrink-0" />
                </h3>
                <p className="mt-1 max-w-sm text-zinc-700 dark:text-zinc-300">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
