"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда, круг 2 (16.11). Владелец выбрал З5 (заливка по
// прокрутке, секция обычной длины). Веер монохромный: в светлой теме
// пустой — белый, залитый — чёрный; в тёмной наоборот. Без окантовки.
import { useEffect, useRef, useState } from "react";
import { EnvelopeSimple, ChatCircleText, Wallet, Cube, Gift } from "@phosphor-icons/react";
import { PixelFan } from "@/components/brand/PixelArt";

const STEPS = [
  { title: "Request", icon: EnvelopeSimple, text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", icon: ChatCircleText, text: "We work out the details, style, timeline and price." },
  { title: "Deposit", icon: Wallet, text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", icon: Cube, text: "I build the map and show you progress along the way." },
  { title: "Delivery", icon: Gift, text: "Final walkthrough, revisions, remaining payment, map handover." },
];

/** Шаг 0→5 по тому, как секция проезжает через экран: длина секции не меняется. */
function useScrollStep() {
  const ref = useRef<HTMLElement>(null);
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

const TONES = {
  lime: "bg-lime-300 dark:bg-lime-950",
  plain: "bg-zinc-100 dark:bg-zinc-900",
};

export function OrderScroll({ tone }: { tone: keyof typeof TONES }) {
  const { ref, step } = useScrollStep();
  return (
    <section
      ref={ref}
      // Цвета веера — CSS-переменные: светлая тема белый → чёрный, тёмная наоборот.
      className={`${TONES[tone]} py-16 [--fan-off:#ffffff] [--fan-on:#09090b] sm:py-20 dark:[--fan-off:#09090b] dark:[--fan-on:#fafafa]`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PixelFan step={step} on="var(--fan-on)" off="var(--fan-off)" className="order-2 mx-auto w-56 md:order-1 md:w-full md:max-w-xs" />
        <div className="order-1 md:order-2">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">How an order works</h2>
          <p className="mt-2 max-w-xl text-zinc-700 dark:text-zinc-300">
            From the first message to a finished map — a transparent process in 5 steps.
          </p>
          <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`flex gap-3 transition-opacity duration-300 ${step > i ? "opacity-100" : "opacity-45"}`}>
                <span className="w-10 shrink-0 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {s.title}
                    <s.icon size={22} aria-hidden="true" className="shrink-0" />
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-zinc-700 dark:text-zinc-300">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
