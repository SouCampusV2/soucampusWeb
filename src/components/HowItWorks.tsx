"use client";

import { motion } from "motion/react";

const steps = [
  { title: "Заявка", text: "Пишешь мне через форму или контакты, описываешь идею." },
  { title: "Обсуждение", text: "Уточняем детали, стиль, сроки и стоимость." },
  { title: "Предоплата", text: "Фиксируем условия, вносится частичная предоплата." },
  { title: "Постройка", text: "Строю карту, показываю промежуточные результаты." },
  { title: "Сдача", text: "Финальный показ, правки, оставшаяся оплата, передача карты." },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white"
      >
        Как проходит заказ
      </motion.h2>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        От первого сообщения до готовой карты — прозрачный процесс в 5 шагов.
      </p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="relative"
          >
            <span className="text-4xl font-bold text-emerald-500/30">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 font-semibold text-zinc-950 dark:text-white">
              {step.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {step.text}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
