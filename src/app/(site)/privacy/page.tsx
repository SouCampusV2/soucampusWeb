import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { HELP_BODY, HELP_CARD, HELP_CARDS, HELP_CARD_TITLE, HELP_DOT, HELP_H2, HELP_ICON, HELP_LINK, HelpPageHeader } from "@/components/HelpTabs";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

// Политика конфиденциальности.
//
// ⚠️ ПОЧЕМУ ОНА ПОЯВИЛАСЬ ИМЕННО СЕЙЧАС. Её потребовал Google при
// публикации OAuth-приложения (25.08): без homepage и privacy policy URL
// приложение не выходит из режима Testing. Но нужна она не Google — сайт
// собирает почту, хранит профили, принимает платежи и считает
// посетителей, а владелец в ЕС. Пункт не стоял ни в одном списке и
// всплыл случайно.
//
// ПРИНЦИП, КОТОРОМУ СЛЕДУЕТ ТЕКСТ: здесь описано то, что код делает НА
// САМОМ ДЕЛЕ, а не то, что обычно пишут в таких документах. Каждое
// утверждение проверяемо по коду:
//   • сам IP не хранится, только хэш с солью → src/lib/visitor-cookie.ts, /api/view
//   • карту мы не видим                      → /api/stripe/webhook, src/lib/orders.ts
//   • файл удалённой карты остаётся купившим → решение владельца 2026-09-10
//     (до 24.09 здесь стояло «живут месяц» — решение 16.08, которое код
//      так и не исполнил, а 10.09 отменило по сути; страница обещала ложь)
//   • записи лимитов частоты — сутки          → ops.rate_events, src/lib/rate-limit.ts
//   • аккаунт удаляется по письму, не кнопкой → кнопки удаления нет
//
// ⚠️ Если код изменится, а страница нет — она станет ложью, и это хуже
// её отсутствия. Правишь сбор данных — правь и этот файл.

// Оператор данных — ФИЗЛИЦО, и это полноценный вариант по GDPR: юрлицо
// для этого не требуется. OÜ решено не заводить (владелец, 25.08:
// сложности с именем и лишние траты), поэтому здесь настоящее имя.
//
// ⚠️ СТРАНА ЗДЕСЬ — НЕ ГРАЖДАНСТВО, а место, где оператор находится:
// от него зависит, чей надзорный орган и чьё право применяются. Владелец
// живёт в Эстонии по ВНЖ, гражданство украинское — в документе стоит
// Эстония, и это не описка.
//
// Домашнего адреса здесь нет намеренно. Для физлица, держащего сайт,
// «имя + страна + рабочая почта» — достаточная опознаваемость; адрес
// проживания не требуется, а публиковать его вредно.
//
// Появится юрлицо — менять ОДНО это место, ради чего константа и
// отделена от текста: "SouCampus OÜ (reg. 1234567), registered in Estonia".
const CONTROLLER = {
  name: "Yevhenii Stavytskyi",
  detail: "an individual based in Estonia",
};

const LAST_UPDATED = "17 November 2026";


export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and stores personal data.`,
  alternates: { canonical: `${SITE_URL}/privacy` },
  // ⚠️ Индексируется, в отличие от /terms. Google должен уметь забрать её
  // при проверке OAuth-приложения, а человек — найти поиском.
  robots: { index: true, follow: true },
};

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
  /** Список под текстом — то, что читается глазами, а не абзацем. */
  bullets?: { term: string; text: string }[];
};

// Table-shaped, как PRICING_FAQ на /terms и всё остальное в проекте:
// данные отдельно, разметка одна на всех.
const SECTIONS: Section[] = [
  {
    id: "who-we-are",
    title: "Who is responsible for your data",
    paragraphs: [
      `${SITE_NAME} (${SITE_URL}) is run by ${CONTROLLER.name}, ${CONTROLLER.detail}. He decides why and how the personal data described below is used — in the language of the GDPR, he is the data controller.`,
      `For anything on this page — a question, a request, or a complaint — write to ${SUPPORT_EMAIL}. A person reads that inbox, not a robot.`,
    ],
  },
  {
    id: "what-we-collect",
    title: "What we collect, and why",
    paragraphs: [
      "Only what the site needs to work. There is no profiling, no advertising network, and nothing is sold to anyone.",
    ],
    bullets: [
      {
        term: "Account",
        text: "Your email address and a password, held by our authentication provider. We never see the password itself — only a hash kept by that provider. If you sign in with Google instead, see the section below.",
      },
      {
        term: "Profile",
        text: "The username you choose, and anything you add yourself: avatar, short bio, name colour. All of it is public by design — a profile page exists to be looked at.",
      },
      {
        term: "Purchases",
        text: "Which maps you bought, when, and for how much. We need this to give you the download and to keep proper accounts.",
      },
      {
        // С 2026-09-26: журнал скачиваний (download_events). Хэш, а не
        // адрес, — та же функция, что у счётчика (lib/ip-hash.ts).
        term: "Downloads",
        text: "Each time you download a map you bought: which map, when, a hash of your IP address (never the address itself) and your browser’s name. If a payment is ever disputed with your bank, this is how we show the file was delivered.",
      },
      {
        term: "Things you post",
        text: "Comments and reactions on maps, and any application you send us. Comments are public and carry your username.",
      },
      {
        // С 17.11 (владелец: «упомяни файлы креаторов»). Сверено с кодом:
        // заявка — portfolio_url, discord, about (creator-applications.ts);
        // галочка 18+ не хранится. Файлы: разбор zip (map-scan.ts), сканер
        // на своём сервере, если он подключён (scanner-client.ts), картинки
        // пересобираются (image-clean.ts), непроверенное — в закрытом
        // бакете (upload-limits.ts, IMAGE_PENDING_BUCKET).
        term: "If you sell maps here",
        text: "Your creator application — a portfolio link, your Discord name and a few words about yourself — and the maps you upload: the file, its pictures, description and price. Everything is checked before it goes public. A map file is unpacked and inspected and may be scanned for malware on our own server; each picture is rebuilt from its pixels, which also strips hidden data such as the location a phone camera writes into a photo. Until a map is approved, its files stay private.",
      },
      {
        term: "Visits",
        text: "A count of page views, described in its own section below because of how carefully it avoids identifying you.",
      },
      {
        term: "Limits against abuse",
        text: "When you do something that can be repeated to cause harm — post a comment, react, start a checkout, upload a file — we note which account did it and when, so one account cannot flood the site. These records are deleted after a day.",
      },
    ],
  },
  {
    id: "google-sign-in",
    title: "If you sign in with Google",
    paragraphs: [
      "Signing in with Google is optional — an email and password work just as well. If you use it, Google tells us your email address and whether it is verified. That is all we ask for and all we receive: we get no access to your Google account, your contacts, your files, or anything else.",
      "Google does not give us a username. So the first time you sign in this way, we ask you to choose one. Until you do, the site suggests a name derived from your email address — you are not stuck with it, and choosing your own name at that point costs you nothing.",
      "If the email address from Google already belongs to an account here, the two are joined into one account rather than creating a second. Your purchases, profile and history stay where they are.",
    ],
  },
  {
    id: "counting-visits",
    title: "How we count visits",
    paragraphs: [
      "We count how many people visit, because it is useful to know whether anyone is reading. We do it in a way that cannot be turned back into a person, and that is worth spelling out because most sites cannot say the same.",
    ],
    bullets: [
      {
        term: "Your IP address is not stored",
        text: "It is turned into an irreversible hash with a secret salt, used only to stop one person inflating the numbers. The address itself is never written down.",
      },
      {
        term: "One small cookie",
        text: "A signed visitor number, set by us and read only by us. It lives 13 months and tells us that two page views came from the same browser — nothing else about you.",
      },
      {
        term: "No cross-site tracking",
        text: "Nothing follows you off this site. No advertising pixels, no third-party trackers, no data broker.",
      },
      {
        term: "No cookie banner, and why",
        text: "Because there is nothing here to consent to: one first-party cookie used solely to measure our own audience, with no data passed onward. That is the narrow case regulators accept without a banner. If that ever changes, a banner appears with it.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    paragraphs: [
      "Payments are handled by Stripe. Your card number never reaches this site — you type it on Stripe's own checkout page, and Stripe tells us only whether the payment succeeded and which items it covered.",
      "That means we cannot lose your card details, because we do not hold them. What Stripe does with them is governed by Stripe's own privacy policy.",
    ],
  },
  // Discord-бот BoCampus (26.10). Текст — из пакета бота
  // (content/discord-terms-and-privacy.md), сверен с его кодом на 27.10.
  // Сервер бота — VPS Hostinger во Франкфурте (ответ владельца 26.10,
  // сверено с docs/SCANNER.md). ⚠️ Срока хранения записей заказов нет:
  // владелец его не назвал («[period: …]» в черновике) — стоит общая
  // формулировка без числа. Назовёт — дописать в «Where it is kept».
  // Почта поддержки — из site.ts.
  {
    id: "discord",
    title: "Our Discord bot",
    paragraphs: [
      "When you use tickets on our Discord server, our bot (BoCampus) processes the data below. We use it to run your order — show it to builders, keep the conversation, confirm payment and delivery, and resolve disputes.",
    ],
    bullets: [
      { term: "Who you are on Discord", text: "Your Discord user ID and display name." },
      {
        term: "What you send in tickets",
        text: "Your order form answers, quotes you receive, messages and files in your ticket channel, and your review.",
      },
      {
        term: "Order history",
        text: "The stages of your order (submitted, accepted, paid, delivered, closed) and their dates.",
      },
      {
        term: "Where it is kept",
        text: "The bot runs on our own server, rented from Hostinger in Frankfurt, Germany. Its database keeps order records for as long as we need them for the order and our accounting; database backups are kept for 14 days.",
      },
      {
        term: "Ticket channels",
        text: "Deleted 48 hours after a ticket closes, unless a manager keeps them. Before deletion, a transcript of the conversation is sent to you and to a staff-only channel on our Discord server.",
      },
      {
        term: "Discord itself",
        text: "Stores messages under its own privacy policy, at discord.com/privacy.",
      },
      {
        term: "On our website",
        text: "Your build and review appear only if you said yes in your ticket, and builds are shown without your name. Reviews are signed with your Discord display name.",
      },
      {
        term: "Your rights",
        text: `To get a copy of your data or ask us to delete it, open a Support ticket or write to ${SUPPORT_EMAIL}. We will remove what we are not required to keep.`,
      },
    ],
  },
  {
    id: "who-else",
    title: "Who else touches your data",
    paragraphs: [
      "The services below run parts of this site on our behalf. They process data under contract and are not free to use it for their own purposes.",
    ],
    bullets: [
      { term: "Supabase", text: "Database, file storage and sign-in." },
      {
        term: "Vercel",
        text: "Hosting, and privacy-friendly analytics that set no cookies.",
      },
      { term: "Stripe", text: "Payments." },
      {
        term: "Hostinger",
        text: "Outgoing email, such as confirmation and password-reset messages and the receipt we send after a paid purchase, and our own server, which runs the Discord bot and the checks on uploaded files.",
      },
      { term: "Google", text: "Only if you choose to sign in with it." },
    ],
  },
  {
    id: "where",
    title: "Where your data lives",
    paragraphs: [
      "Data is stored and processed in the European Union. Some of the providers above are based in the United States and may process data there; where that happens it is covered by the standard contractual clauses approved by the European Commission.",
    ],
  },
  {
    id: "how-long",
    title: "How long we keep things",
    paragraphs: ["Not longer than there is a reason to."],
    bullets: [
      {
        term: "Your account",
        text: "For as long as it exists. Write to us and we delete it, and the profile goes with it.",
      },
      {
        term: "Orders",
        text: "Kept after an account is deleted, because accounting law requires records of sales to be retained. They are kept for that purpose alone.",
      },
      {
        term: "Download records",
        text: "Kept together with the order they belong to, for the same reason: they are the proof that a sale was delivered.",
      },
      {
        term: "Removed maps",
        text: "A removed map disappears from the site, but its file is kept, so anyone who already bought it can still download what they paid for.",
      },
      {
        term: "Visit counts",
        text: "The visitor cookie expires after 13 months. The hashed records behind the counter contain nothing that identifies you.",
      },
    ],
  },
  {
    id: "your-rights",
    title: "What you can ask us to do",
    paragraphs: [
      "Under the GDPR you can ask to see the data we hold about you, correct it, delete it, receive a copy in a portable form, or object to a particular use. Write to the address below and we will answer within one month.",
      "If you think we have handled your data badly, you can complain to the data protection authority in your country. You may do that whether or not you talk to us first — though we would rather fix it than have you go there.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "This site is not aimed at children, and accounts are not intended for anyone under 16. If you believe a child has created an account here, tell us and we will remove it.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "When the site starts doing something new with data, this page changes first, and the date at the top changes with it. We will not quietly widen what we collect and update the wording later.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    // Клип на полноширинном <main>, ограничение ширины — на секциях внутри
    // (см. PageGlow: max-w-* на одном элементе с overflow-x-clip отрезает
    // то самое свечение, которое должен вмещать).
    // ⚠️ Ширина — max-w-6xl, одна на /faq, /wiki, /terms и /privacy
    // (17.11, владелец; до этого — колонка 3xl по центру, см. terms/page.tsx).
    // Шапка, тело и заголовки разделов — общие для четырёх справочных
    // страниц (HelpTabs.tsx), отступы заданы там (17.11: у каждой страницы
    // был свой зазор между абзацем, датой и первым разделом).
    <main className="relative w-full overflow-x-clip">
      <HelpPageHeader active="privacy" title="Privacy Policy" updated={LAST_UPDATED}>
        What this site collects, why, and what you can do about it. Written
        to describe what the code actually does — not to be long.
      </HelpPageHeader>

      <div className={HELP_BODY}>
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className={HELP_H2}>{section.title}</h2>

            <div className="mt-4 space-y-3">
              {section.paragraphs.map((text) => (
                <p key={text} className="leading-7 text-zinc-600 dark:text-zinc-400">
                  {text}
                </p>
              ))}
            </div>

            {section.bullets && (
              <ul className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                {section.bullets.map((item) => (
                  <li key={item.term} className="flex gap-3">
                    <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${HELP_DOT}`} />
                    <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                        {item.term}.
                      </span>{" "}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

      {/* Две карточки в ряд (17.11): своя почта по данным — и куда за
          условиями покупки. */}
      <section className={HELP_CARDS}>
        <div className={HELP_CARD}>
          <ShieldCheck size={32} className={HELP_ICON} weight="duotone" />
          <h2 className={HELP_CARD_TITLE}>Get in touch</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Questions about your data, or a request to see or delete it — write
            to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={HELP_LINK}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div className={HELP_CARD}>
          <FileText size={32} className={HELP_ICON} weight="duotone" />
          <h2 className={HELP_CARD_TITLE}>Terms of Service</h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Pricing, the licence for shop maps, refunds and who you are buying
            from live on the{" "}
            <Link href="/terms" className={HELP_LINK}>
              Terms of Service
            </Link>{" "}
            page.
          </p>
        </div>
      </section>
      </div>
    </main>
  );
}
