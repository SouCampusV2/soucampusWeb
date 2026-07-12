"use client";

import { motion } from "motion/react";
import { ArrowCircle } from "@/components/ArrowCircle";

type Accent = "blue" | "orange" | "lime";

// Тот же оттенок фона (-400) и та же hover-логика (на шаг темнее — -500),
// что у primary-кнопки, но иконка стрелки белая (не тёмная, как текст
// кнопки) — так лучше видно на цветном кружке. group-hover, не hover —
// карточка целиком кликабельна, стрелка должна реагировать на наведение
// в любую точку карточки, не только на сам кружок.
const ACCENT_ARROW: Record<Accent, string> = {
  blue: "bg-blue-400 group-hover:bg-blue-500 text-white",
  orange: "bg-orange-400 group-hover:bg-orange-500 text-white",
  lime: "bg-lime-400 group-hover:bg-lime-500 text-white",
};

const PLANS = [
  {
    name: "Free",
    price: "0€",
    description:
      "Access to part of the build library — see what's on offer before subscribing.",
    accent: "blue" as Accent,
    span: "lg:col-span-2",
  },
  {
    name: "Builder",
    price: "5.99€/mo",
    description:
      "A lot of builds in the library so far, plus new ones each month. Builds are saved to your profile on the site.",
    accent: "orange" as Accent,
    span: "lg:col-span-2",
  },
  {
    name: "Pro",
    price: "9.99€/mo",
    description:
      "Everything in Builder plus a commercial license for the builds and early access to new drops.",
    accent: "lime" as Accent,
    span: "lg:col-span-2",
  },
  {
    name: "Support",
    price: "min 25€/mo",
    description:
      "For teams and servers — multiple members, shared library access and priority on custom orders.",
    accent: "blue" as Accent,
    span: "lg:col-span-3",
  },
  {
    name: "Lifetime",
    price: "300€ once",
    description:
      "One-time payment — lifetime access to the entire build library, including everything released in the future.",
    accent: "orange" as Accent,
    span: "lg:col-span-3",
  },
];

export function PricingSection() {
  return (
    <section className="border-t border-zinc-200 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
          Choose your plan
        </h2>
        <p className="mt-3 max-w-md text-zinc-600">
          A subscription unlocks the build library — everything you get is
          saved to your profile on the site.

          <br></br>  <i>Coming soon...</i>
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={plan.span}
            >
              <div className="group flex h-full cursor-pointer flex-col justify-between rounded-3xl bg-zinc-100 p-8 transition-colors hover:bg-[#ececee]">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    {plan.price}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-8 flex justify-end">
                  <ArrowCircle
                    direction="right"
                    className="h-10 w-10"
                    colorClassName={ACCENT_ARROW[plan.accent]}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
