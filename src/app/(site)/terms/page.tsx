import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { BASE_RATE, HIGH_RATE, HIGH_RATE_THRESHOLD } from "@/lib/pricing";
import { PageGlow } from "@/components/PageGlow";
import { WikiArticleBody } from "@/components/WikiArticleBody";
import { getWikiArticle } from "@/lib/wiki";

// Лицензия рисуется ИЗ ТОЙ ЖЕ статьи вики, а не переписана сюда своими
// словами (решение владельца 2026-09-05: «сделай одинаково и там и там, в
// вики правильный вариант»).
//
// ⚠️ Копия здесь была бы хуже отсутствия. Два текста про то, что человек
// вправе делать с купленной картой, расходятся не «когда-нибудь», а при
// первой же правке одного из них — и расхождение в правах, купленных за
// деньги, стоит дороже любого другого расхождения на сайте. Поэтому
// источник один, а страниц две.
const LICENCE = getWikiArticle("using-a-map-you-bought");

// Explains the same formula BuildEstimator.tsx (Contact page) actually
// computes with — the rate/threshold numbers are imported from
// src/lib/pricing.ts so this page can't silently drift out of sync with
// what the calculator actually charges; the surrounding prose stays plain
// text since this page is a server component and only needs to describe
// the numbers, not run the calculator's logic.
const PRICING_FAQ = [
  {
    q: "How is the price calculated?",
    a: `The base rate is ${BASE_RATE}€ per 1×1 unit of a map's side. A 100×100 map is 100 × ${BASE_RATE} = ${100 * BASE_RATE}€, a 200×200 map is 200 × ${BASE_RATE} = ${200 * BASE_RATE}€, and so on.`,
  },
  {
    q: "What about really large builds?",
    a: `Past a ${HIGH_RATE_THRESHOLD}×${HIGH_RATE_THRESHOLD} footprint the rate steps up to ${HIGH_RATE}€ per unit — large builds take proportionally more detail work, not just more area. A ${HIGH_RATE_THRESHOLD}×${HIGH_RATE_THRESHOLD} map is ${HIGH_RATE_THRESHOLD} × ${HIGH_RATE} = ${HIGH_RATE_THRESHOLD * HIGH_RATE}€; a 1000×1000 map is 1000 × ${HIGH_RATE} = ${1000 * HIGH_RATE}€.`,
  },
  {
    q: "My map isn't square — how does that get priced?",
    a: "Non-square maps are priced off an \"equivalent side\" — the square root of width × height. A 100×100 map still comes out to exactly 100 (no change from the simple case), while a 150×100 map is treated as roughly a 122-unit square. It's a fair stand-in for \"how big does this feel\" that doesn't over- or under-charge depending on which side happens to be longer.",
  },
  {
    q: "How is the timeline estimated?",
    a: "Rough reference points: a 150×150 map is about a week, a 400×400 map is a minimum of 2 weeks, and a 600×600 map runs 3-4 weeks. Actual timelines depend on detail and my schedule at the time, not size alone — the instant estimate on the Contact page shows a range for exactly that reason.",
  },
];

// Same display font as every other page hero — rhymes with Hero.tsx/contact/about.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Terms of Service",
  // В основном заглушка (живой только раздел #pricing) — прячем от индексации
  // до полноценного ToS (Этап 4), чтобы неготовая страница не шла в выдачу.
  robots: { index: false, follow: true },
};

// «Licensing & usage rights» из списка убран 05.09: он больше не
// «coming», он ниже на этой же странице. Обещать написать то, что уже
// написано, — способ выглядеть менее готовым, чем ты есть.
const SECTIONS = [
  "Scope of services",
  "Ordering & pricing",
  "Payment & refunds",
  "Delivery & revisions",
  "Liability",
];

export default function TermsPage() {
  return (
    // Клип — на полноширинном <main>, ограничение ширины уехало на секции
    // внутри: иначе max-w-6xl отрезал бы свечение по бокам (см. PageGlow).
    <main className="relative w-full overflow-x-clip px-6">
      {/* Hero — общее свечение сайта (orange, основной акцент: страница не
          привязана к одной секции). */}
      <section className="relative mx-auto max-w-6xl pb-8 pt-20 sm:pb-16">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <span className="text-sm font-semibold text-orange-500">Legal</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Terms of Service
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          This page is a placeholder — the full terms will go live before the
          marketplace opens. Below is the outline of what it will cover.
        </p>
      </section>

      {/* Real content, not a placeholder like the section below — linked
          directly from the "How the price is calculated" badge on the
          Contact page's instant estimator (BuildEstimator.tsx). */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-16">
        <span className="text-sm font-semibold text-orange-500">Pricing</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          How pricing works
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
          The same formula behind the instant estimate on the{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            Contact
          </span>{" "}
          page, spelled out in full.
        </p>

        <div className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="py-6">
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                {item.q}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Лицензия. Живой раздел, как #pricing выше, а не пункт списка
          «скоро»: на него ссылается статья вики, и он же — ответ на самый
          частый вопрос покупателя. */}
      {LICENCE && (
        <section id="licensing" className="mx-auto max-w-6xl scroll-mt-24 py-10 sm:py-16">
          <span className="text-sm font-semibold text-orange-500">Licensing</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            {LICENCE.title}
          </h2>
          <div className="max-w-2xl">
            <WikiArticleBody article={LICENCE} />
            <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
              The same text lives in the{" "}
              <Link
                href="/wiki/using-a-map-you-bought"
                className="font-medium text-orange-500 transition-colors hover:text-orange-600"
                data-page-transition="true"
              >
                wiki
              </Link>
              , where the rest of the map guides are.
            </p>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl py-16 sm:py-28">
        <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <FileText size={32} className="text-orange-400" weight="duotone" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Coming soon
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Full terms covering orders, payment, revisions, and liability are
            being written and will be published here ahead of the marketplace
            launch. Until then, order terms are agreed directly in
            Discord for every commission.
          </p>

          <ul className="mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
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
