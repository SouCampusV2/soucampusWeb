"use client";

import { motion } from "motion/react";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";

// KUniforma (как у HoneyFrost) — проприетарный шрифт, файла нет.
// Unbounded — крупный геометричный шрифт, похожий по духу, используем
// для всего заголовка целиком (обе строки).
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export function Hero() {
  return (
    <section className="relative flex flex-col items-center px-6 pb-10 pt-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[772px] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.35),transparent_70%)]"
      />

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl tracking-tight text-zinc-950 dark:text-zinc-50"
      >
        <span
          className={`${displayFont.className} block text-4xl leading-tight sm:text-6xl`}
        >
          SouCampus crafts
        </span>
        <span
          className={`${displayFont.className} mt-4 block text-4xl leading-tight sm:text-6xl`}
        >
          your <span className="text-lime-500">ideas</span> and{" "}
          <span className="text-blue-500">dreams</span>
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400"
      >
        I create custom maps, structures and entire worlds in Minecraft — from
        scratch to a breathtaking masterpiece
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col gap-4 sm:flex-row"
      >
        <Button href="/portfolio" variant="primary" size="md" pageTransition>
          See what I&apos;ve built
        </Button>
        <Button href="/contact" variant="secondary" size="md" pageTransition>
          Order a map
        </Button>
      </motion.div>
    </section>
  );
}
