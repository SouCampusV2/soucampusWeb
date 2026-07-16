"use client";

import { motion } from "motion/react";

const steps = [
  { title: "Request", text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", text: "We work out the details, style, timeline and price." },
  { title: "Deposit", text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", text: "I build the map and show you progress along the way." },
  { title: "Delivery", text: "Final walkthrough, revisions, remaining payment, map handover." },
];

export function HowItWorks() {
  return (
    <section className="bg-lime-300 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl"
        >
          How an order works
        </motion.h2>
        <p className="mt-2 max-w-xl text-zinc-700">
          From the first message to a finished map — a transparent process in
          5 steps.
        </p>

        <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              <span className="text-4xl font-bold text-blue-650">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-700">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
