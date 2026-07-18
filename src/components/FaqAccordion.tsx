"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Minus } from "@phosphor-icons/react";

type FaqItem = {
  question: string;
  answer: string;
};

// Was a native <details>/<summary> accordion — no animation on open/close,
// just an instant show/hide plus a CSS group-open: icon swap. Replaced with
// React state (which question is open) so the answer can grow/shrink via
// framer-motion, same height: "auto" + AnimatePresence technique as the
// navbar's mobile dropdown (Navbar.tsx). Multiple questions can stay open at
// once, matching the old <details> behavior (each was independent).
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  return (
    <div className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
      {items.map((item) => {
        const isOpen = openQuestion === item.question;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenQuestion(isOpen ? null : item.question)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-6 text-left text-lg font-semibold text-zinc-950 dark:text-zinc-50"
            >
              {item.question}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                {isOpen ? (
                  <Minus size={20} weight="bold" />
                ) : (
                  <Plus size={20} weight="bold" />
                )}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="-mt-2 pb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
