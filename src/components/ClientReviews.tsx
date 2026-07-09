"use client";

import { motion } from "motion/react";

const reviews = [
  {
    name: "Клиент А",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Работа выполнена в срок.",
  },
  {
    name: "Клиент Б",
    text: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    name: "Клиент В",
    text: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  },
];

export function ClientReviews() {
  return (
    <section className="bg-zinc-50 py-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
        >
          Отзывы клиентов
        </motion.h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {reviews.map((review, i) => (
            <motion.blockquote
              key={review.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black"
            >
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                &ldquo;{review.text}&rdquo;
              </p>
              <footer className="mt-4 text-sm font-semibold text-zinc-950 dark:text-white">
                {review.name}
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
