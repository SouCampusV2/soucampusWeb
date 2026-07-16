"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

// TODO: replace with real numbers.
// Shape mirrors a future `stats` table (one row per stat, manually updated
// from time to time) — same pattern as the `reviews` array in ClientReviews.
// `updatedAt` isn't shown in the UI, it's just here so the data already
// looks like a DB row once Supabase is wired up.
const stats = [
  {
    id: "orders",
    label: "Crafted orders and projects",
    value: 246,
    suffix: "+",
    color: "text-orange-400",
    bar: "bg-orange-400",
    updatedAt: "2026-07-14",
  },
  {
    id: "reach",
    label: "Players who've seen the builds",
    value: 30,
    suffix: "K+",
    color: "text-lime-300",
    bar: "bg-lime-400",
    updatedAt: "2026-07-14",
  },
  {
    id: "clients",
    label: "Really happy clients",
    value: 81,
    suffix: "+",
    color: "text-blue-400",
    bar: "bg-blue-400",
    updatedAt: "2026-07-14",
  },
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

function Divider() {
  return (
    <div className="flex h-1 w-full">
      {stats.map((stat) => (
        <div key={stat.id} className={`h-full flex-1 ${stat.bar}`} />
      ))}
    </div>
  );
}

export function Stats() {
  return (
    <section>
      <Divider />

      <div className="mx-auto max-w-6xl px-6">
        <div className="my-10 grid grid-cols-1 gap-6 sm:my-16 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              <div
                className={`text-4xl font-extrabold tabular-nums sm:text-6xl ${stat.color}`}
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
