// Содержимое трёх страниц студии — Portfolio, Contact, About — для
// лаборатории. ОДНО на все варианты, по той же причине, что content.ts:
// сравниваем вёрстку, а не слова.
//
// Тексты — с живых страниц (src/app/(site)/about, /contact, /portfolio)
// дословно. Единственная правка та же, что в content.ts: длинное тире
// заменено запятой, точкой или двоеточием.
//
// ⚠️ Копия, живёт только на ветке design-lab. Победивший вариант
// переносит эти массивы в src/lib, а не копирует файл в master.

import { estimatePrice, estimateDeadlineDays, formatDeadline } from "@/lib/pricing";

export type LabPage = "home" | "portfolio" | "contact" | "about";

export const LAB_PAGES: { id: LabPage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "portfolio", label: "Portfolio" },
  { id: "contact", label: "Contact" },
  { id: "about", label: "About" },
];

export function isLabPage(value: string | undefined): value is LabPage {
  return LAB_PAGES.some((page) => page.id === value);
}

/**
 * Адрес страницы внутри лаборатории. Ссылки навигации в вариантах ведут
 * сюда, а не на живые /portfolio и /about: иначе клик из варианта
 * выбрасывал бы из лаборатории на сегодняшний сайт.
 */
export function labHref(slug: string, page: LabPage) {
  return page === "home" ? `/lab?v=${slug}` : `/lab?v=${slug}&p=${page}`;
}

/**
 * Заменяет адреса сайта на адреса лаборатории. Варианты лендинга писались
 * с живыми ссылками (/portfolio, /contact); эта функция позволяет их
 * шапкам не знать, что они в лаборатории.
 */
export function labLink(slug: string, href: string) {
  if (href === "/") return labHref(slug, "home");
  if (href === "/portfolio") return labHref(slug, "portfolio");
  if (href === "/contact") return labHref(slug, "contact");
  if (href === "/about") return labHref(slug, "about");
  return href;
}

// ── Portfolio ───────────────────────────────────────────────────────────

export const PORTFOLIO = {
  eyebrow: "Portfolio",
  title: "Selected builds",
  more: "More projects",
  lede: "The full portfolio. Click a build to see details, timeline and gallery.",
} as const;

// ── About ───────────────────────────────────────────────────────────────

export const ABOUT = {
  eyebrow: "A Long Journey",
  title: "Building Worlds Since Childhood",
  leadStrong: "For 8 years I've been building in Minecraft professionally,",
  lead: "from childhood sandcastles to large-scale architectural projects for clients. My goal is to turn clients' ideas into vivid, detailed worlds and keep growing as a builder.",
  skillsEyebrow: "Skills & toolkit",
  skillsTitle: "What I build with",
  skillsLede:
    "A builder needs more than the right plugin: a wide toolkit and an eye for composition and space, built up over 8 years across servers and studios:",
  closing: [
    "And of course, a big part of my work is about people. Every client comes not with an exact blueprint, but with an image, a feeling, a fragment of an idea, and part of my job is to hear that, rather than just execute a technical brief. I try to think alongside the client, continuing their idea so the result exceeds what they originally imagined. It's at the intersection of someone else's vision and my own that the most memorable projects are born: not because I built what was asked, but because I built what was actually needed.",
    "But the core of it hasn't changed since I was six: I still love to build. Every new commission is a new map, a new style, a new puzzle I want to solve beautifully.",
  ],
  facts: [
    { value: "15", label: "years in Minecraft" },
    { value: "8", label: "years building professionally" },
    { value: "~10", label: "regular clients" },
  ],
} as const;

export const TIMELINE = [
  {
    age: "Age 6",
    title: "First steps",
    text: "Minecraft entered my life very early. I built alongside my father: castles, beaches, whole corners of a survival world. Back then it was just a hobby, but that's where I got my first sense of space and composition.",
  },
  {
    age: "Age 10",
    title: "Cristalix Server",
    text: "I joined Cristalix, a large minigames server with a peak online of 20,000+ players. There I built almost entirely by hand on creative mode: access to WorldEdit was limited to basic commands (//set, //copy, //rotate, //walls), with no brushes or other tools for complex terrain. Even so, I completed my first serious project, a 100×100 block town, and earned the rank of Member.",
  },
  {
    age: "Age 11–12",
    title: "Growing within the server",
    text: "A year later I earned the rank of Novice, and six months after that, Master. With the Master rank came access to brushes, a tool without which working with terrain and large forms is far harder. At 12 I officially became a builder for Cristalix: I built dozens of maps in different styles and started earning my first money from building.",
  },
  {
    age: "Before 15",
    title: "Developing myself",
    text: "I left Cristalix and spent a few years building for myself on different servers, not for money, just because I loved the process. I tried new styles, experimented with commands and plugins, and kept sharpening my skills. That time gave me freedom: I built whatever I wanted, purely for myself.",
  },
  {
    age: "Age 15",
    title: "First commissions",
    text: "With my old friend, we started looking for work on international platforms and in Discord studios. Our first client was a streamer, and we built a small town for him. That experience pulled us seriously into commercial building. Since then, we started looking for more clients and commissions, and I began to build a reputation as a professional builder.",
  },
  {
    age: "Age 17–18",
    title: "Working in studios",
    text: "I built with several well-known teams: HoneyFrost, BreadBuilds, Odyssey. The experience at HoneyFrost was especially valuable: a studio whose builds are featured in the official Minecraft Marketplace. That's when building stopped being just a set of commands and became a language I think in. I started noticing how a shade of stone shifts the mood of a build, and how empty space between structures can speak louder than the architecture itself. Working alongside strong builders taught me composition as balance: knowing where to leave air, and where to add detail, so the eye always knows where to go.",
  },
  {
    age: "Age 21",
    title: "The journey continues",
    text: "Today, 15 years into Minecraft, 8 years of professional building, I've come a long way, from building with my father as a kid to working as a really great builder. I currently work with about ten regular clients, building across a wide range of styles, from rugged medieval fortresses to light, fantasy-inspired cities. My toolkit includes WorldEdit, Axiom, Arceon, EzEdit, VoxelSniper, GoBrush, GoPaint and other plugins, which I use easily and pick based on the task at hand.",
  },
] as const;

/** Навыки двумя группами: инструменты и то, что решает, как выглядит постройка. */
export const SKILLS = {
  tools: ["WorldEdit", "VoxelSniper", "Axiom", "Arceon", "GoBrush", "GoPaint", "EzEdit"],
  craft: [
    "Communication with client",
    "Level design",
    "Composition",
    "Texturing",
    "Landscape",
    "Architecture",
    "Interior",
    "Exterior",
  ],
} as const;

export const STUDIOS = ["Cristalix", "HoneyFrost", "BreadBuilds", "Odyssey"] as const;

// ── Contact ─────────────────────────────────────────────────────────────

export const CONTACT = {
  eyebrow: "Get in touch",
  titleStart: "I'm here, always on",
  titleAccent: "Discord",
  lede: "Orders, questions and support, all in one place. We reply on weekdays and weekends alike.",
  primary: "Join Discord",
  chatTitle: "Chat to us directly",
  chatText:
    "Describe your map idea in a Discord ticket. I'll reply personally and we'll work out the details and timeline.",
  chatCta: "Open Discord",
  answersTitle: "Ready-to-go answers",
  answersText: "Common questions about ordering, timelines and payment, below. No need to message on Discord.",
  faqTitle: "Frequently asked questions",
  estimateTitle: "Instant estimate",
  estimateNote: "An estimate, not a quote. The final price is agreed on Discord.",
} as const;

export const FAQ = [
  {
    question: "How much does a map cost?",
    answer:
      "The base rate is 1.25€ per 1×1 unit. For example, a 100×100 map costs 125€ under this pricing. The exact final price depends on the size and scope of your project. Feel free to share your idea in a Discord ticket and I'll calculate the cost for you.",
  },
  {
    question: "How long does an order take?",
    answer:
      "A 150×150 map can be done in as little as 2-3 days at minimum, but the actual timeline mainly depends on the amount of work involved and my personal schedule at the time. Larger or more detailed projects will naturally take longer.",
  },
  {
    question: "How does payment work?",
    answer:
      "Payment is required upfront, either: 50% before starting, and the remaining 50% before I send the schematic or world file, or 100% upfront, in which case you'll get to watch the build process live on my server as it happens.",
  },
  {
    question: "Can I request changes after delivery?",
    answer:
      "A certain number of revisions is included in the price (agreed on in advance, for example 1-2 free revisions within a week after delivery). Additional revisions beyond the agreed scope are billed separately by arrangement.",
  },
  {
    question: "Which Minecraft versions do you build on?",
    answer:
      "I work across a wide range of versions, both older and current ones. If you have a specific version or modpack in mind, just mention it in the ticket and we'll figure out together whether it's feasible for your idea.",
  },
  {
    question: "Do you improve existing maps?",
    answer:
      "Yes, I do improve/enhance existing maps. How much can be done depends heavily on your specific requests and the overall scope of work needed. Reach out on Discord to discuss the details of your map and what you'd like improved.",
  },
  {
    question: "Can I order a map for a specific mode (PvP, RPG, parkour)?",
    answer:
      "Yes, of course. Describe your idea on Discord and I'll suggest options: suitable mechanics, style, and map structure for the mode you have in mind (PvP arenas, RPG locations with quest structures, parkour courses with checkpoints, and so on).",
  },
  {
    question: "What if I don't like the result?",
    answer:
      "I send you continuous updates throughout the build, so you'll always be able to see and comment on progress as it happens. If everything looked good along the way and you're only unhappy with the final result at the very end, that won't be grounds for a refund or rework. However, if we go through a couple of rounds of rebuilding early on and it's genuinely not working out, I'll refund part of what you paid: 45% back if you paid 50% upfront, or 95% back if you paid the full 100% upfront.",
  },
] as const;

/**
 * Оценка по размеру — одна формула на все варианты, из src/lib/pricing.ts,
 * той же, что у калькулятора на живом /contact. Вёрстку калькулятора каждый
 * вариант рисует сам; считать по-своему не должен никто.
 */
export function estimate(width: number, height: number) {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  return {
    price: estimatePrice(w, h),
    deadline: formatDeadline(estimateDeadlineDays(w, h)),
  };
}

export function formatEuro(value: number) {
  return `${Math.round(value).toLocaleString("en-GB")}€`;
}
