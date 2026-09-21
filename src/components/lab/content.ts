// Содержимое лендинга, собранное в одном месте для лаборатории.
//
// ⚠️ ЭТО КОПИЯ, И ЭТО ОСОЗНАННО. Шаги, тарифы и страны сейчас лежат
// внутри HowItWorks.tsx, PricingSection.tsx и CountriesMarquee.tsx —
// то есть внутри конкретной вёрстки. Варианты лаборатории эту вёрстку
// как раз переписывают, значит им нужен сам ТЕКСТ, отдельно от неё.
//
// В обычной ситуации копия данных — ошибка (в этом проекте так
// разъезжались семь копий градиента). Здесь она допустима ровно потому,
// что живёт только на ветке design-lab и только ради сравнения. Если
// какой-то вариант победит, правильный ход — вынести эти массивы в
// src/lib (как projects.ts и reviews.ts, table-shaped), а не тащить
// копию в master.
//
// Содержимое НЕ ПРАВЛЕНО: тот же текст, что на живом сайте. Иначе
// сравнивали бы не макеты, а копирайтинг.

export const STEPS = [
  { title: "Request", text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", text: "We work out the details, style, timeline and price." },
  { title: "Deposit", text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", text: "I build the map and show you progress along the way." },
  { title: "Delivery", text: "Final walkthrough, revisions, remaining payment, map handover." },
] as const;

export type PlanAccent = "orange" | "lime" | "blue";

export const PLANS: {
  name: string;
  price: string;
  description: string;
  accent: PlanAccent;
  wide: boolean;
}[] = [
  {
    name: "Free",
    price: "0€",
    description:
      "Access to part of the build library — see what's on offer before subscribing.",
    accent: "blue",
    wide: false,
  },
  {
    name: "Builder",
    price: "5.99€/mo",
    description:
      "A lot of builds in the library so far, plus new ones each month. Builds are saved to your profile on the site.",
    accent: "orange",
    wide: false,
  },
  {
    name: "Pro",
    price: "9.99€/mo",
    description:
      "Everything in Builder plus a commercial license for the builds and early access to new drops.",
    accent: "lime",
    wide: false,
  },
  {
    name: "Support",
    price: "min 25€/mo",
    description:
      "For teams and servers — multiple members, shared library access and priority on custom orders.",
    accent: "blue",
    wide: true,
  },
  {
    name: "Lifetime",
    price: "300€ once",
    description:
      "One-time payment — lifetime access to the entire build library, including everything released in the future.",
    accent: "orange",
    wide: true,
  },
];

export const COUNTRIES = [
  { id: "eur", label: "Eurozone", src: "/countries/eur.svg" },
  { id: "usd", label: "United States", src: "/countries/usd.svg" },
  { id: "nl", label: "Netherlands", src: "/countries/nl.svg" },
  { id: "gbp", label: "United Kingdom", src: "/countries/gbp.svg" },
  { id: "de", label: "Germany", src: "/countries/de.svg" },
  { id: "fr", label: "France", src: "/countries/fr.svg" },
  { id: "it", label: "Italy", src: "/countries/it.svg" },
  { id: "ca", label: "Canada", src: "/countries/ca.svg" },
  { id: "uah", label: "Ukraine", src: "/countries/uah.svg" },
  { id: "ee", label: "Estonia", src: "/countries/ee.svg" },
] as const;

/** Заголовки секций — тоже часть содержимого, а не вёрстки. */
export const HEADINGS = {
  work: "A few recent projects",
  workSub: "See the full catalog in Portfolio.",
  countries: "Clients from ten countries",
  reviews: "Hear from clients working with me",
  steps: "How it works",
  pricing: "Plans",
  pricingSub: "Subscribe to the build library, or order something of your own.",
} as const;
