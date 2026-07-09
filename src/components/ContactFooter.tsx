"use client";

import { motion } from "motion/react";

export function ContactFooter() {
  return (
    <section className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
        >
          Готов обсудить твою карту
        </motion.h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
          Напиши, что хочешь построить — отвечу и предложу варианты.
        </p>

        <motion.a
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          href="/contact"
          className="mt-8 inline-block rounded-full bg-zinc-950 px-7 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 dark:bg-white dark:text-zinc-950"
        >
          Написать в Discord
        </motion.a>
      </div>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} SouCampus builds. Все права защищены.
      </footer>
    </section>
  );
}
