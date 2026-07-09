"use client";

import { motion } from "motion/react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.15),transparent_60%)]"
      />

      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
      >
        Minecraft build freelancer
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-950 sm:text-6xl dark:text-white"
      >
        Строю карты в Minecraft на заказ
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400"
      >
        От замков до целых карт под сервер — превращаю идею в готовый мир,
        который можно показать клиентам или игрокам.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col gap-4 sm:flex-row"
      >
        <Link
          href="/portfolio"
          className="rounded-full bg-zinc-950 px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 dark:bg-white dark:text-zinc-950"
        >
          Смотреть работы
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-zinc-300 px-7 py-3 text-sm font-semibold text-zinc-800 transition-transform hover:scale-105 dark:border-zinc-700 dark:text-zinc-200"
        >
          Заказать карту
        </Link>
      </motion.div>
    </section>
  );
}
