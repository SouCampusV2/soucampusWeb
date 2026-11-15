"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда (15.11): варианты «How an order works» с
// пиксельным веером. Владелец выбирает номер — выбранный переносится в
// src/components/HowItWorks.tsx, файл удаляется.
import { useEffect, useRef, useState } from "react";
import { EnvelopeSimple, ChatCircleText, Wallet, Cube, Gift } from "@phosphor-icons/react";
import { PixelFan, type FanColors } from "@/components/brand/PixelArt";

const STEPS = [
  { title: "Request", icon: EnvelopeSimple, text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", icon: ChatCircleText, text: "We work out the details, style, timeline and price." },
  { title: "Deposit", icon: Wallet, text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", icon: Cube, text: "I build the map and show you progress along the way." },
  { title: "Delivery", icon: Gift, text: "Final walkthrough, revisions, remaining payment, map handover." },
];

const ORANGE: FanColors = {
  fill: "#ff6900",
  fillEdge: "#c23a00",
  empty: "#ffffff",
  emptyEdge: "#18181b",
  sun: "#ffb86a",
  sunEdge: "#c23a00",
};
const LIME_ON_WHITE: FanColors = {
  fill: "#7ccf00",
  fillEdge: "#3d6300",
  empty: "#f4f4f5",
  emptyEdge: "#a1a1aa",
  sun: "#ffb86a",
  sunEdge: "#3d6300",
};
const WHITE_ON_LIME: FanColors = {
  fill: "#ffffff",
  fillEdge: "#3d6300",
  empty: "#bbf451",
  emptyEdge: "#5ea500",
  sun: "#fff7ed",
  sunEdge: "#3d6300",
};

/** Шаг 0→5 по одному раз в `ms`, когда блок впервые показался. */
function usePlayOnView(ms = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Без движения — сразу целый веер (в таймере: setState прямо в
      // эффекте линтер React запрещает — лишний каскад рендеров).
      timer = window.setTimeout(() => setStep(5));
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let s = 0;
        timer = window.setInterval(() => {
          s += 1;
          setStep(s);
          if (s >= 5) window.clearInterval(timer);
        }, ms);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [ms]);
  return { ref, step };
}

/** Шаг 0→5 по тому, как секция проезжает через экран: длина секции не меняется. */
function useScrollStep() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 — верх секции у низа экрана, 1 — низ секции на 70% высоты экрана.
      const t = (vh - r.top) / (r.height + vh * 0.3);
      setStep(Math.max(0, Math.min(5, Math.floor(t * 6))));
    };
    const on = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", on);
    };
  }, []);
  return { ref, step };
}

function Heading() {
  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">How an order works</h2>
      <p className="mt-2 max-w-xl text-zinc-700 dark:text-zinc-300">
        From the first message to a finished map — a transparent process in 5 steps.
      </p>
    </>
  );
}

function StepText({ i, active = true, compact = false }: { i: number; active?: boolean; compact?: boolean }) {
  const s = STEPS[i];
  return (
    <div className={`transition-opacity duration-300 ${active ? "opacity-100" : "opacity-45"}`}>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {s.title}
        <s.icon size={22} aria-hidden="true" className="shrink-0" />
      </h3>
      <p className={`mt-1 text-sm text-zinc-700 dark:text-zinc-300 ${compact ? "max-w-xs" : ""}`}>{s.text}</p>
    </div>
  );
}

const Num = ({ i, active }: { i: number; active: boolean }) => (
  <span
    className={`w-10 shrink-0 text-2xl font-bold tabular-nums text-blue-800 transition-opacity dark:text-blue-400 ${active ? "opacity-100" : "opacity-40"}`}
  >
    {String(i + 1).padStart(2, "0")}
  </span>
);

/** 1 — сам заполняется при показе: шаги списком слева, веер справа. */
export function OrderPlay() {
  const { ref, step } = usePlayOnView();
  return (
    <section ref={ref} className="bg-lime-300 py-16 dark:bg-lime-950 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <Heading />
          <ol className="mt-8 space-y-4">
            {STEPS.map((_, i) => (
              <li key={i} className="flex gap-4">
                <Num i={i} active={step > i} />
                <StepText i={i} active={step > i} />
              </li>
            ))}
          </ol>
        </div>
        <PixelFan step={step} colors={ORANGE} className="mx-auto w-56 sm:w-72 md:w-full md:max-w-sm" />
      </div>
    </section>
  );
}

/** 2 — по наведению: шаги в ряд, веер показывает, докуда дошёл заказ. */
export function OrderHover() {
  const { ref, step: played } = usePlayOnView(400);
  const [hover, setHover] = useState<number | null>(null);
  const step = hover === null ? played : hover + 1;
  return (
    <section ref={ref} className="bg-white py-16 dark:bg-zinc-950 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Heading />
          </div>
          <PixelFan step={step} colors={LIME_ON_WHITE} className="w-28 shrink-0 sm:w-40" />
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((_, i) => (
            <li
              key={i}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="rounded-2xl p-3 outline-none transition-colors hover:bg-lime-50 focus-visible:bg-lime-50 dark:hover:bg-lime-950/40"
            >
              <span className="text-3xl font-bold text-lime-600">{String(i + 1).padStart(2, "0")}</span>
              <div className="mt-2">
                <StepText i={i} active={step > i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** 3 — мини-веера: у каждого шага вместо номера маленький веер, залитый до него. */
export function OrderMini() {
  return (
    <section className="bg-orange-50 py-16 dark:bg-zinc-900 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Heading />
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((_, i) => (
            <li key={i}>
              <PixelFan step={i + 1} colors={ORANGE} className="w-16" />
              <div className="mt-3">
                <StepText i={i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** 4 — крупный веер над шагами, по центру; шаги рядом под ним. */
export function OrderCenter() {
  const { ref, step } = usePlayOnView();
  return (
    <section ref={ref} className="bg-lime-300 py-16 text-center dark:bg-lime-950 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <PixelFan step={step} colors={WHITE_ON_LIME} className="mx-auto w-48 sm:w-64" />
        <div className="mt-6 flex flex-col items-center">
          <Heading />
        </div>
        <ol className="mt-10 grid gap-6 text-left sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((_, i) => (
            <li key={i} className="flex gap-3">
              <Num i={i} active={step > i} />
              <StepText i={i} active={step > i} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** 5 — заливка по прокрутке, но секция обычной длины: веер слева, шаги в две колонки. */
export function OrderScroll() {
  const { ref, step } = useScrollStep();
  return (
    <section ref={ref} className="bg-lime-300 py-16 dark:bg-lime-950 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PixelFan step={step} colors={ORANGE} className="order-2 mx-auto w-56 md:order-1 md:w-full md:max-w-xs" />
        <div className="order-1 md:order-2">
          <Heading />
          <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {STEPS.map((_, i) => (
              <li key={i} className="flex gap-3">
                <Num i={i} active={step > i} />
                <StepText i={i} active={step > i} compact />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
