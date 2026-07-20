"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

import type { Stat } from "@/lib/stats";

// Цвета живут здесь, а не в базе, и это принципиально: Tailwind собирает
// CSS, сканируя исходники, — класс, пришедший из БД во время выполнения,
// в собранный CSS не попадёт и цвет молча не применится. В базе лежит
// смысловой accent ("orange"), а во что он превращается — знает компонент.
// Тот же приём, что ACCENT_CARD в ClientReviews.tsx.
const ACCENT_TEXT: Record<Stat["accent"], string> = {
  orange: "text-orange-400",
  lime: "text-lime-300",
  blue: "text-blue-400",
};

const ACCENT_BAR: Record<Stat["accent"], string> = {
  orange: "bg-orange-400",
  lime: "bg-lime-400",
  blue: "bg-blue-400",
};

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

function Divider({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex h-1 w-full">
      {stats.map((stat) => (
        <div key={stat.id} className={`h-full flex-1 ${ACCENT_BAR[stat.accent]}`} />
      ))}
    </div>
  );
}

// Цифры приходят пропсом: компонент клиентский ("use client" — счётчику
// нужна анимация подсчёта при появлении в кадре), поэтому данные грузит
// серверная главная страница и передаёт сюда готовыми.
export function Stats({ stats }: { stats: Stat[] }) {
  return (
    <section>
      <Divider stats={stats} />

      <div className="mx-auto max-w-6xl px-6">
        <div className="my-10 grid grid-cols-1 gap-6 sm:my-16 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              <div
                className={`text-4xl font-extrabold tabular-nums sm:text-6xl ${ACCENT_TEXT[stat.accent]}`}
              >
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
