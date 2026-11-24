"use client";

// Статистика плашкой, как на legko.company (скрин владельца 24.11), в наших
// цветах: плашка-категория, крупное число со счётчиком, подпись,
// тонкие разделители между колонками, искры на фоне.

import type { Stat } from "@/lib/stats";
import { Counter } from "@/components/Stats";
import { Sparkles } from "./Sparkles";

const CHIP: Record<string, string> = { orders: "Builds", reach: "Reach", clients: "Clients" };

function Columns({ stats, chip, caption, divider }: { stats: Stat[]; chip: string; caption: string; divider: string }) {
  return (
    <div className="relative grid gap-10 sm:grid-cols-3 sm:gap-0">
      {stats.map((s, i) => (
        <div key={s.id} className={`flex flex-col items-center text-center ${i > 0 ? `sm:border-l ${divider}` : ""}`}>
          <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${chip}`}>{CHIP[s.id] ?? s.label}</span>
          <span className="mt-4 text-6xl font-extrabold tracking-tight tabular-nums sm:text-7xl">
            <Counter to={s.value} suffix={s.suffix} />
          </span>
          <span className={`mt-3 text-base sm:text-lg ${caption}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/** С1. Оранжевая плашка: градиент сверху светлее, искры. Ближе всего к скрину. */
export function StatsOrange({ stats }: { stats: Stat[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(120%_90%_at_50%_0%,#fdba74_0%,#f97316_45%,#c2410c_100%)] px-6 py-14 text-white sm:py-16">
        <Sparkles />
        <Columns stats={stats} chip="bg-white/20 text-white backdrop-blur-sm" caption="text-orange-50" divider="border-white/25" />
      </div>
    </section>
  );
}

/** С2. Тёмная плашка с оранжевым и лаймовым свечением, числа цветные. */
export function StatsNight({ stats }: { stats: Stat[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-6 py-14 text-white sm:py-16">
        <div aria-hidden className="absolute -left-24 -top-24 size-80 rounded-full bg-orange-500/40 blur-[90px]" />
        <div aria-hidden className="absolute -bottom-28 -right-16 size-80 rounded-full bg-lime-400/30 blur-[90px]" />
        <Sparkles className="text-orange-200" />
        <Columns stats={stats} chip="bg-white/10 text-zinc-100" caption="text-zinc-300" divider="border-white/10" />
      </div>
    </section>
  );
}

/** С3. Лаймовая плашка, тёмный текст — как вторая сторона бренда. */
export function StatsLime({ stats }: { stats: Stat[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(120%_90%_at_50%_0%,#ecfccb_0%,#a3e635_55%,#65a30d_100%)] px-6 py-14 text-zinc-950 sm:py-16">
        <Sparkles className="text-white" />
        <Columns stats={stats} chip="bg-zinc-950/10 text-zinc-900" caption="text-zinc-800" divider="border-zinc-950/15" />
      </div>
    </section>
  );
}
