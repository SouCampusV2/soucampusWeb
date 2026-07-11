"use client";

import { motion } from "motion/react";
import { Button } from "@/components/Button";

export function ContactFooter() {
  return (
    <section className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6 py-28 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl"
        >
          Ready to talk about your map
        </motion.h2>
        <p className="mx-auto mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
          Tell me what you want to build — I&apos;ll reply with some options.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-8 inline-block"
        >
          <Button href="/contact" variant="primary" size="md" pageTransition>
            Message on Discord
          </Button>
        </motion.div>
      </div>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} SouCampus builds. All rights reserved.
      </footer>
    </section>
  );
}
