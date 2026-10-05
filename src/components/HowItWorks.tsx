"use client";

import { FadeIn } from "@/components/FadeIn";

const steps = [
  { title: "Request", text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", text: "We work out the details, style, timeline and price." },
  { title: "Deposit", text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", text: "I build the map and show you progress along the way." },
  { title: "Delivery", text: "Final walkthrough, revisions, remaining payment, map handover." },
];

// Цвет секции следует акценту страницы: на главной лайм, на /contact
// синий (2026-10-05) — там всё синее, от свечения до кнопки Discord.
// Шаги и тексты общие: процесс заказа один, где бы о нём ни рассказывали.
const TONES = {
  lime: { bg: "bg-lime-300 dark:bg-lime-950", accent: "text-blue-800 dark:text-blue-400" },
  blue: { bg: "bg-blue-300 dark:bg-blue-950", accent: "text-blue-900 dark:text-blue-300" },
} as const;

export function HowItWorks({ tone = "lime" }: { tone?: keyof typeof TONES }) {
  const colors = TONES[tone];
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

        <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, i) => (
            <FadeIn key={step.title} y={24} delay={i * 80} className="relative">
              <span className={`text-4xl font-bold ${colors.accent}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{step.text}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
