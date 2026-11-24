"use client";

import { useEffect, useRef, useState } from "react";

import type { Stat } from "@/lib/stats";
import { Sparkles } from "@/components/Sparkles";

// Цвета живут здесь, а не в базе, и это принципиально: Tailwind собирает
// CSS, сканируя исходники, — класс, пришедший из БД во время выполнения,
// в собранный CSS не попадёт и цвет молча не применится. В базе лежит
// смысловой accent ("orange"), а во что он превращается — знает компонент.
// Тот же приём, что ACCENT_CARD в ClientReviews.tsx.
const COUNT_DURATION_MS = 1500;

// Ease-out cubic — matches the feel of Motion's default "easeOut" closely
// enough for a number counter that only runs once per page view.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        let frame: number;
        const tick = (now: number) => {
          const progress = Math.min((now - start) / COUNT_DURATION_MS, 1);
          setValue(Math.round(to * easeOutCubic(progress)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
      },
      { rootMargin: "-100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

// Плашка над числом: что считаем (24.11, по образцу legko.company). По id
// строки из базы; новая строка без пары покажет свою подпись целиком.
const CHIP: Record<string, string> = { orders: "Builds", reach: "Reach", clients: "Clients" };

// Цифры приходят пропсом: компонент клиентский ("use client" — счётчику
// нужна анимация подсчёта при появлении в кадре), поэтому данные грузит
// серверная главная страница и передаёт сюда готовыми.
//
// С 24.11 — оранжевая плашка (лаборатория главной, вариант С1, выбор
// владельца: «работает в обеих темах»). Раньше — три цветных числа под
// полосой из трёх цветов; accent из базы больше не красит числа, плашка
// одна на все три.
export function Stats({ stats }: { stats: Stat[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-10 sm:pt-16">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(120%_90%_at_50%_0%,#fdba74_0%,#f97316_45%,#c2410c_100%)] px-6 py-14 text-white sm:py-16">
        <Sparkles />
        <div className="relative grid gap-10 sm:grid-cols-3 sm:gap-0">
          {stats.map((stat, i) => (
            <div
              key={stat.id}
              className={`flex flex-col items-center text-center ${i > 0 ? "sm:border-l sm:border-white/25" : ""}`}
            >
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                {CHIP[stat.id] ?? stat.label}
              </span>
              <span className="mt-4 text-6xl font-extrabold tracking-tight tabular-nums sm:text-7xl">
                <Counter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className="mt-3 text-base text-orange-50 sm:text-lg">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
