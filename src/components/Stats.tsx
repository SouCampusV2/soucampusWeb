"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

// TODO: заменить на реальные цифры
const stats = [
  { label: "Выполненных заказов", value: 30, suffix: "+" },
  { label: "Довольных клиентов", value: 25, suffix: "+" },
  { label: "Игроков видели постройки", value: 7, suffix: "МЛН+" },
];

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

export function Stats() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-4xl font-bold tabular-nums text-zinc-950 dark:text-white">
              <Counter to={stat.value} suffix={stat.suffix} />
            </div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
