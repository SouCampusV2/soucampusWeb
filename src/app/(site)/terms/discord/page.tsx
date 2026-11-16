import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { PageGlow } from "@/components/PageGlow";
import { INLINE_LINK } from "@/components/Button";
import { BASE_RATE } from "@/lib/pricing";
import { DISCORD_INVITE } from "@/lib/site";

// Условия заказа через Discord-бота BoCampus (2026-10-26).
//
// Текст — из пакета бота (content/discord-terms-and-privacy.md), написан
// по фактическому поведению бота на 27.10: поля формы, Submit order,
// квоты, ручное подтверждение оплаты, закрытие и удаление через 48 ч,
// транскрипт, согласие на сайт. Бот ссылается сюда из панели тикетов
// (/setup links terms:…/terms/discord).
//
// Два места черновика («[Payment methods]», «[Revisions]») решал
// владелец — ответил 26.10, они в § 4. Это обещания про деньги: менять
// их только с его слов.
//
// Ставка в § 2 — из pricing.ts, а не числом в тексте: справка,
// разошедшаяся с калькулятором и ботом, хуже отсутствующей (тот же довод,
// что у вики, 02.09). Пример «150×150 ≈ €225» считается из неё же.

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ordering through Discord",
  description:
    "How custom build orders work in the SouCampus Discord server: tickets, quotes, payment, delivery and closing.",
  alternates: { canonical: "/terms/discord" },
};

type Section = { id: string; title: string; points: React.ReactNode[] };

const EXAMPLE_SIDE = 150;

const SECTIONS: Section[] = [
  {
    id: "opening",
    title: "Opening a ticket",
    points: [
      <>
        Use the ticket panel in our Discord server and choose{" "}
        <strong>Order a build</strong>. A private channel opens that only you
        and the SouCampus team can see.
      </>,
      "You can have more than one ticket, but you can open at most one new ticket per minute.",
    ],
  },
  {
    id: "form",
    title: "Your order form",
    points: [
      "Answer the order form: what you need, deadline, map size, theme, Minecraft version and budget. References and extra details are optional.",
      <>
        You get a <strong>price guide</strong> based on the map size — about
        €{BASE_RATE} per block of map side (for example, {EXAMPLE_SIDE}×
        {EXAMPLE_SIDE} ≈ €{EXAMPLE_SIDE * BASE_RATE}). It is a guide, not a
        price: the final price is the quote you accept.
      </>,
      <>
        Nothing is shown to builders until you press{" "}
        <strong>Submit order</strong>. Until then you can change anything.
      </>,
    ],
  },
  {
    id: "quotes",
    title: "Quotes",
    points: [
      <>
        After you submit, builders of the SouCampus team see your order{" "}
        <strong>and your Discord name</strong>, and can send you quotes
        (price, deadline, message) or ask questions.
      </>,
      "You can accept one quote, decline any quote with a reason, or start a private discussion with a builder.",
      "You can edit your order until you accept a quote. After that, changes are agreed with your builder or a manager — the builder priced what they saw.",
    ],
  },
  {
    id: "payment",
    title: "Payment and work",
    // Способы оплаты и правки — ответ владельца 26.10: PayPal или Wise по
    // инвойсу, который выставляет он сам; правки по ходу — сколько нужно в
    // разумных пределах, после сдачи — 1–2 круга.
    points: [
      <>
        You pay by <strong>PayPal</strong> or <strong>Wise</strong>, against
        an invoice we send you.
      </>,
      <>
        Payment is confirmed <strong>manually</strong> by a SouCampus
        manager. Work starts after the payment is confirmed.
      </>,
      "Deadlines are agreed per order. A manager may extend a deadline; you will be told in your ticket.",
      <>
        While we build, you can ask for changes as often as you need, within
        reason. After delivery, <strong>1–2 rounds of changes</strong> are
        included.
      </>,
    ],
  },
  {
    id: "delivery",
    title: "Delivery and review",
    points: [
      "When the work is delivered, the order is marked complete and you are asked for a review (1–5 stars and a comment). One review per order.",
      <>
        We may ask whether we can show your build in our portfolio and your
        review on our website. <strong>Nothing is published without your yes</strong>,
        and we never show your name next to a portfolio build.
      </>,
    ],
  },
  {
    id: "cancelling",
    title: "Cancelling and closing",
    points: [
      <>
        You can cancel an order yourself <strong>before</strong> you accept a
        quote — free of charge.
      </>,
      <>
        After you accept a quote, cancelling goes through a manager. Refunds
        follow the{" "}
        <Link href="/terms#refunds" className={INLINE_LINK}>
          refund policy
        </Link>
        .
      </>,
      "Orders left in the form stage for 3 days are closed automatically (you get a reminder after 2 days). You can always open a new ticket.",
    ],
  },
  {
    id: "closing",
    title: "When a ticket closes",
    points: [
      <>
        The channel becomes read-only and is{" "}
        <strong>deleted 48 hours later</strong>, unless a manager keeps it
        archived.
      </>,
      <>
        A <strong>transcript</strong> (a text file of the whole ticket
        conversation) is sent to you by Discord DM and kept by the SouCampus
        team. See{" "}
        <Link href="/privacy#discord" className={INLINE_LINK}>
          Privacy → Discord
        </Link>
        .
      </>,
    ],
  },
  {
    id: "team",
    title: "Team applications",
    points: [
      <>
        Builders can apply through <strong>Join the team</strong>. A manager
        accepts or rejects the application and tells you why if it is
        rejected.
      </>,
    ],
  },
  {
    id: "conduct",
    title: "Conduct",
    points: ["Be respectful in tickets. We may close tickets that are abusive or spam."],
  },
];

export default function DiscordTermsPage() {
  return (
    // Та же ширина max-w-6xl, что у /terms и /privacy (с 17.11; до — 3xl): три
    // юридические страницы выглядят одной семьёй.
    <main className="relative w-full overflow-x-clip px-6">
      <section className="relative mx-auto max-w-6xl pb-8 pt-20 sm:pb-16">
        <PageGlow color="rgba(251,146,60,0.35)" />
        <span className="text-sm font-semibold text-orange-500">Legal</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Ordering through Discord
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          How custom build orders work on the SouCampus Discord server. These
          terms add to our general{" "}
          <Link href="/terms" className={INLINE_LINK} data-page-transition="true">
            Terms of Service
          </Link>
          ; where they differ, the general Terms win for anything about
          payment, licensing and refunds.
        </p>
      </section>

      <section className="mx-auto max-w-6xl pb-10">
        <ol className="space-y-2">
          {SECTIONS.map((section, index) => (
            <li key={section.id} id={section.id} className="scroll-mt-24 py-6">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                <span className="mr-2 text-orange-500">{index + 1}.</span>
                {section.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {section.points.map((point, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    <span className="leading-7 text-zinc-600 dark:text-zinc-400 [&_strong]:font-semibold [&_strong]:text-zinc-950 dark:[&_strong]:text-zinc-50">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl pb-16 sm:pb-28">
        <div className="rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
          <DiscordLogo size={32} className="text-orange-400" weight="duotone" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Ready to order?
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Open a ticket in{" "}
            <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
              our Discord server
            </a>
            . What the bot keeps about you is on the{" "}
            <Link href="/privacy#discord" className={INLINE_LINK}>
              Privacy Policy
            </Link>{" "}
            page.
          </p>
        </div>
      </section>
    </main>
  );
}
