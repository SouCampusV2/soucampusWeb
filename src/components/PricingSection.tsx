"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowCircle } from "@/components/ArrowCircle";

// PricingSection is global (rendered once in layout.tsx, right after
// {children}, on every page), so this is the only place that can react to
// "no divider/top padding after the last section" requests that are
// page-specific rather than site-wide — these three pages end their own
// content with a section that already reads as a natural full stop (Ages
// timeline, portfolio grid, FAQ), so PricingSection's own border-t + top
// padding on top of that looked like a redundant second seam. Every other
// route (home, a project detail page, /shop, /terms) keeps the divider.
const NO_TOP_DIVIDER_ROUTES = ["/about", "/portfolio", "/contact"];

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
    span: "md:col-span-2",
  },
  {
    name: "Builder",
    price: "5.99€/mo",
    description:
      "A lot of builds in the library so far, plus new ones each month. Builds are saved to your profile on the site.",
    accent: "orange" as Accent,
    span: "md:col-span-2",
  },
  {
    name: "Pro",
    price: "9.99€/mo",
    description:
      "Everything in Builder plus a commercial license for the builds and early access to new drops.",
    accent: "lime" as Accent,
    span: "md:col-span-2",
  },
  {
    name: "Support",
    price: "min 25€/mo",
    description:
      "For teams and servers — multiple members, shared library access and priority on custom orders.",
    accent: "blue" as Accent,
    span: "md:col-span-3",
  },
  {
    name: "Lifetime",
    price: "300€ once",
    description:
      "One-time payment — lifetime access to the entire build library, including everything released in the future.",
    accent: "orange" as Accent,
    span: "md:col-span-3",
  },
];

export function PricingSection() {
  const pathname = usePathname();
  const noTopDivider = NO_TOP_DIVIDER_ROUTES.includes(pathname);

  return (
    <section
      // Top padding (pt-16 sm:pt-28, 112px on desktop) always applies —
      // it's this section's own "white side" spacing, same amount as the
      // gap above PricingSection on the homepage (after HowItWorks' green
      // section). Only the divider line itself is conditional: these three
      // pages already end their own content on a natural full stop, so a
      // border-t on top of matching padding read as a redundant seam.
      className={`pb-16 pt-16 dark:border-zinc-800 sm:pb-28 sm:pt-28 ${
        noTopDivider ? "" : "border-t border-zinc-200"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Choose your plan
        </h2>
        <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
          A subscription unlocks the build library — everything you get is
          saved to your profile on the site.

          <br></br>  <i>Coming soon...</i>
        </p>

        <div className="mt-10 grid gap-3 sm:gap-4 md:grid-cols-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={plan.span}
            >
              <div className="group flex h-full cursor-pointer flex-col justify-between rounded-3xl bg-zinc-100 p-6 transition-colors hover:bg-[#ececee] active:bg-[#ececee] dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:active:bg-zinc-800 sm:p-8">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {plan.price}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
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
