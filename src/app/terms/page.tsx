import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { FileText } from "@phosphor-icons/react/dist/ssr";

// Same display font as every other page hero — rhymes with Hero.tsx/contact/about.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Terms of Service — SouCampus builds",
};

const SECTIONS = [
  "Scope of services",
  "Ordering & pricing",
  "Payment & refunds",
  "Delivery & revisions",
  "Licensing & usage rights",
  "Liability",
];

export default function TermsPage() {
  return (
    <main className="w-full mx-auto max-w-6xl px-6">
      {/* Hero — same radial-glow pattern as every other page (orange, the
          site's primary accent, since this page isn't tied to one section). */}
      <section className="relative pb-8 pt-20 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[calc(100%+8rem)] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.35),transparent_70%)]"
        />
        <span className="text-sm font-semibold text-orange-500">Legal</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl tracking-tight text-zinc-950 sm:text-5xl`}
        >
          Terms of Service
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600">
          This page is a placeholder — the full terms will go live before the
          shop opens. Below is the outline of what it will cover.
        </p>
      </section>

      <section className="py-16 sm:py-28">
        <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 sm:p-12">
          <FileText size={32} className="text-orange-400" weight="duotone" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-950">
            Coming soon
          </h2>
          <p className="mt-2 text-zinc-600">
            Full terms covering orders, payment, revisions, licensing, and
            liability are being written and will be published here ahead of
            the shop launch. Until then, order terms are agreed directly in
            Discord for every commission.
          </p>

          <ul className="mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
            {SECTIONS.map((section) => (
              <li key={section} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                {section}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
