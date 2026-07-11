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
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(249,115,22,0.15),transparent_60%)]"
      />

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl tracking-tight text-zinc-950"
      >
        <span
          className={`${displayFont.className} block text-4xl leading-tight sm:text-6xl`}
        >
          SouCampus crafts
        </span>
        <span
          className={`${displayFont.className} mt-4 block text-4xl leading-tight sm:text-6xl`}
        >
          your ideas and dreams
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-xl text-lg text-zinc-600"
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
