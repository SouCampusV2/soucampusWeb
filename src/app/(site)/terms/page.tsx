import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { BASE_RATE, HIGH_RATE, HIGH_RATE_THRESHOLD } from "@/lib/pricing";
import { PageGlow } from "@/components/PageGlow";
import { ArticleBody } from "@/components/ArticleBody";
import { getWikiArticle } from "@/lib/wiki";
import { SUPPORT_EMAIL } from "@/lib/site";
import { SELLER, WAIVER_TEXT } from "@/lib/legal";

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

// Индексируется с 2026-09-26. До этого стоял noindex: живым был один
// раздел цен. Теперь здесь условия покупки, возвраты и продавец — то, что
// Stripe и право ЕС требуют держать публично, и прятать это от поиска
// значило бы прятать от покупателя.
export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Pricing, licensing, refunds for marketplace maps, and who you are buying from at SouCampus builds.",
  // ⚠️ Свой canonical обязателен: без него страница наследует "/" из
  // корневого layout и говорит поисковику «я копия главной». Под noindex
  // это было безвредно, после снятия — выкинуло бы /terms из выдачи.
  alternates: { canonical: "/terms" },
};

// «Licensing & usage rights» из списка убран 05.09: он больше не
// «coming», он ниже на этой же странице. Обещать написать то, что уже
// написано, — способ выглядеть менее готовым, чем ты есть.
// «Payment & refunds» сузился до заказов 26.09: возвраты за карты
// магазина теперь живой раздел #refunds, а условия заказных построек
// по-прежнему согласуются в Discord.
const SECTIONS = [
  "Scope of services",
  "Ordering & pricing",
  "Commission payment",
  "Delivery & revisions",
  "Liability",
];

export default function TermsPage() {
  return (
    // Клип — на полноширинном <main>, ограничение ширины уехало на секции
    // внутри: иначе max-w-6xl отрезал бы свечение по бокам (см. PageGlow).
    // ⚠️ Ширина у /terms и /privacy ОДНА (24.09, просьба владельца): вся
    // страница — колонка max-w-3xl по центру, от заголовка до карточки.
    // До этого у /terms заголовок и разделы стояли слева на 6xl, а карточка
    // по центру на 2xl, у /privacy — заголовок слева, текст по центру.
    // Меняешь ширину здесь — меняй и в соседнем файле.
    <main className="relative w-full overflow-x-clip px-6">
      {/* Hero — общее свечение сайта (orange, основной акцент: страница не
          привязана к одной секции). */}
      <section className="relative mx-auto max-w-3xl pb-8 pt-20 sm:pb-16">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <span className="text-sm font-semibold text-orange-500">Legal</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Terms of Service
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Pricing, licensing, refunds for marketplace maps and the seller
          details below are final. Terms for custom commissions are still
          being written — the outline is at the bottom.
        </p>
      </section>

      {/* Real content, not a placeholder like the section below — linked
          directly from the "How the price is calculated" badge on the
          Contact page's instant estimator (BuildEstimator.tsx). */}
      <section id="pricing" className="mx-auto max-w-3xl scroll-mt-24 py-10 sm:py-16">
        <span className="text-sm font-semibold text-orange-500">Pricing</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          How pricing works
        </h2>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
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
        <section id="licensing" className="mx-auto max-w-3xl scroll-mt-24 py-10 sm:py-16">
          <span className="text-sm font-semibold text-orange-500">Licensing</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            {LICENCE.title}
          </h2>
          <div>
            <ArticleBody sections={LICENCE.body} />
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

      {/* Возвраты за карты магазина — решение владельца 26.09 (вариант A:
          после оплаты возврата нет, кроме неисправного файла). Текст
          согласия берётся из lib/legal.ts — тот же, что у галочки при
          оплате: человек должен найти здесь ровно то, под чем
          подписался. Обещания про деньги — только со слов владельца. */}
      <section id="refunds" className="mx-auto max-w-3xl scroll-mt-24 py-10 sm:py-16">
        <span className="text-sm font-semibold text-orange-500">Refunds</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Refunds for marketplace maps
        </h2>
        <div className="mt-6 space-y-4 leading-7 text-zinc-600 dark:text-zinc-400">
          <p>
            Maps in the marketplace are digital downloads, available the
            moment your payment goes through. Before paying, you tick a box
            that reads:
          </p>
          <blockquote className="border-l-4 border-orange-400 pl-4 text-zinc-950 dark:text-zinc-50">
            {WAIVER_TEXT}
          </blockquote>
          <p>
            EU law normally gives you 14 days to cancel an online purchase.
            For digital content that starts right away, that right ends once
            you agree to immediate delivery — so a purchase can&apos;t be
            cancelled or refunded because you changed your mind.
          </p>
          <p>
            <span className="font-semibold text-zinc-950 dark:text-zinc-50">
              When you do get your money back.
            </span>{" "}
            If a file is broken, won&apos;t open, or isn&apos;t what the
            listing describes, write to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-orange-500 transition-colors hover:text-orange-600"
            >
              {SUPPORT_EMAIL}
            </a>
            . We&apos;ll first try to fix it or send you a working file. If we
            can&apos;t, you get a full refund to the card you paid with.
          </p>
          <p>
            None of this limits the rights consumer law gives you when
            digital content is faulty.
          </p>
          <p>
            Custom commissions work differently: they are paid separately,
            and their refund rules are on the{" "}
            <Link
              href="/contact#faq"
              className="font-medium text-orange-500 transition-colors hover:text-orange-600"
              data-page-transition="true"
            >
              Contact page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Продавец. Право ЕС: имя, географический адрес и почта в
          легкодоступном месте. Дескриптор выписки — из решений по
          аккаунту Stripe (docs/STRIPE.md): узнанное списание — не
          оспоренное списание. */}
      <section id="seller" className="mx-auto max-w-3xl scroll-mt-24 py-10 sm:py-16">
        <span className="text-sm font-semibold text-orange-500">Seller</span>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Who you&apos;re buying from
        </h2>
        <dl className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
          {[
            ["Seller", `${SELLER.name}, an individual based in Estonia`],
            ["Address", SELLER.address],
            ["Email", SUPPORT_EMAIL],
            ["Payments", "Processed by Stripe. The charge appears on your bank statement as SOUCAMPUS.ONLINE."],
          ].map(([term, value]) => (
            <div key={term} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <dt className="font-semibold text-zinc-950 dark:text-zinc-50">{term}</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-3xl py-16 sm:py-28">
        <div className="rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <FileText size={32} className="text-orange-400" weight="duotone" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Coming soon
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Full terms for custom commissions — orders, payment, revisions
            and liability — are being written. Until then, order terms are
            agreed directly in Discord for every commission.
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
