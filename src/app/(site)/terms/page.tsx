import type { Metadata } from "next";
import { ChatsCircle, FileText } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { BASE_RATE } from "@/lib/pricing";
import { HELP_BODY, HELP_CARD, HELP_CARDS, HELP_CARD_TITLE, HELP_DOT, HELP_H2, HELP_ICON, HELP_LINK, HelpPageHeader } from "@/components/HelpTabs";
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
    a: `The rate stays the same at every size. There is no surcharge per block for large maps. A 400×400 map is 400 × ${BASE_RATE} = ${400 * BASE_RATE}€; a 1000×1000 map is 1000 × ${BASE_RATE} = ${1000 * BASE_RATE}€.`,
  },
  {
    q: "My map isn't square, how does that get priced?",
    a: "Non-square maps are priced off an \"equivalent side\": the square root of width × height. A 100×100 map still comes out to exactly 100 (no change from the simple case), while a 150×100 map is treated as roughly a 122-unit square. It's a fair stand-in for \"how big does this feel\" that doesn't over- or under-charge depending on which side happens to be longer.",
  },
  {
    q: "How is the timeline estimated?",
    a: "Rough reference points: a 150×150 map is about a week, a 400×400 map is a minimum of 2 weeks, and a 600×600 map runs 3-4 weeks. Actual timelines depend on detail and my schedule at the time, not size alone. The instant estimate on the Contact page shows a range for exactly that reason.",
  },
];


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
/** Дата последней правки текста этой страницы — показывается под вкладками. */
const TERMS_UPDATED = "17 November 2026";

const SECTIONS = [
  "Scope of services",
  "Ordering & pricing",
  "Commission payment",
  "Delivery & revisions",
  "Liability",
];

export default function TermsPage() {
  return (
    // Клип — на полноширинном <main>, ширина и px — на контейнерах внутри
    // (требование PageGlow). Шапка и тело — общие для четырёх справочных
    // страниц (HelpTabs.tsx: HelpPageHeader, HELP_BODY, HELP_H2), так что
    // ширина, отступы и заголовки разделов совпадают с /faq и /wiki.
    // 17.11 убраны плашки над разделами (Pricing, Licensing, Refunds,
    // Seller — владелец: заголовок и так говорит то же) и разные зазоры.
    <main className="relative w-full overflow-x-clip">
      <HelpPageHeader active="terms" title="Terms of Service" updated={TERMS_UPDATED}>
        Pricing, licensing, refunds for marketplace maps and the seller
        details below are final. Terms for custom commissions are still
        being written. The outline is at the bottom.
      </HelpPageHeader>

      <div className={HELP_BODY}>
      {/* Real content, not a placeholder like the section below — linked
          directly from the "How the price is calculated" badge on the
          Contact page's instant estimator (BuildEstimator.tsx). */}
      <section id="pricing" className="scroll-mt-24">
        <h2 className={HELP_H2}>
          How pricing works
        </h2>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          The same formula behind the instant estimate on the{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            Contact
          </span>{" "}
          page, spelled out in full.
        </p>

        <div className="mt-6 divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
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
        <section id="licensing" className="scroll-mt-24">
          {/* «Licence» в самом заголовке вместо плашки над ним (17.11). */}
          <h2 className={HELP_H2}>
            Licence: {LICENCE.title.toLowerCase()}
          </h2>
          <div>
            <ArticleBody sections={LICENCE.body} nested />
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              The same text lives in the{" "}
              <Link
                href="/wiki/using-a-map-you-bought"
                className={HELP_LINK}
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
      <section id="refunds" className="scroll-mt-24">
        <h2 className={HELP_H2}>
          Refunds for marketplace maps
        </h2>
        <div className="mt-4 space-y-4 leading-7 text-zinc-600 dark:text-zinc-400">
          <p>
            Maps in the marketplace are digital downloads, available the
            moment your payment goes through. Before paying, you tick a box
            that reads:
          </p>
          <blockquote className="border-l-4 border-blue-400 pl-4 text-zinc-950 dark:text-zinc-50">
            {WAIVER_TEXT}
          </blockquote>
          <p>
            EU law normally gives you 14 days to cancel an online purchase.
            For digital content that starts right away, that right ends once
            you agree to immediate delivery, so a purchase can&apos;t be
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
              className={HELP_LINK}
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
            and there is no refund once the build is finished, only at the
            start of the build, if several attempts still do not work for
            you at all and you said so at the time; then 85% of what you paid
            comes back. The details are in the{" "}
            <Link
              href="/faq#ordering"
              className={HELP_LINK}
            >
              FAQ
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Продавец. Право ЕС: имя, географический адрес и почта в
          легкодоступном месте. Дескриптор выписки — из решений по
          аккаунту Stripe (docs/STRIPE.md): узнанное списание — не
          оспоренное списание. */}
      <section id="seller" className="scroll-mt-24">
        <h2 className={HELP_H2}>
          Who you&apos;re buying from
        </h2>
        <dl className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
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

      {/* Две карточки в ряд (17.11): что ещё пишется — и что уже есть. */}
      <section className={HELP_CARDS}>
        <div className={HELP_CARD}>
          <FileText size={32} className={HELP_ICON} weight="duotone" />
          <h2 className={HELP_CARD_TITLE}>Commission terms: coming soon</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Full terms for custom commissions are being written. Until then,
            order terms are agreed directly in Discord for every commission.
          </p>
          <ul className="mt-6 space-y-2 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {SECTIONS.map((section) => (
              <li key={section} className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${HELP_DOT}`} />
                {section}
              </li>
            ))}
          </ul>
        </div>

        {/* Как устроен сам заказ через тикет — уже написано (26.10):
            отдельная страница, на неё ссылается и панель бота. */}
        <div className={HELP_CARD}>
          <ChatsCircle size={32} className={HELP_ICON} weight="duotone" />
          <h2 className={HELP_CARD_TITLE}>Ordering through Discord</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            How our Discord tickets work (quotes, payment, delivery and
            closing a ticket) is written up on its own page.
          </p>
          <Link
            href="/terms/discord"
            className={`mt-6 inline-block ${HELP_LINK}`}
          >
            Ordering through Discord →
          </Link>
        </div>
      </section>
      </div>
    </main>
  );
}
