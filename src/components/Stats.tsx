"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

// TODO: replace with real numbers
const stats = [
  { label: "Completed orders", value: 246, suffix: "+", color: "text-orange-400", bar: "bg-orange-400" },
  { label: "Players who've seen the builds", value: 30, suffix: "K+", color: "text-lime-300", bar: "bg-lime-400" },
  { label: "Happy clients", value: 31, suffix: "+", color: "text-blue-400", bar: "bg-blue-400" },
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
    <section className="pb-16">
      <div className="flex h-1 w-full">
        {stats.map((stat) => (
          <div key={stat.label} className={`h-full flex-1 ${stat.bar}`} />
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className={`text-6xl font-extrabold tabular-nums ${stat.color}`}
              >
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-2 text-sm text-zinc-700">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
