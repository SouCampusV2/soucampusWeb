// Содержимое лендинга для лаборатории — ОДНО на все пятнадцать вариантов.
//
// Варианты различаются вёрсткой, шрифтами, цветом и движением, но не
// словами: иначе сравнивали бы копирайтинг, а не дизайн. Тексты — с живой
// главной, дословно. Единственная правка — длинное тире заменено запятой
// или точкой (taste-skill запрещает его совсем; смысл фраз не тронут).
//
// ⚠️ Это копия того, что на сайте лежит внутри вёрстки (HowItWorks,
// PricingSection, CountriesMarquee). Живёт только на ветке design-lab.
// Если какой-то вариант победит, эти массивы переезжают в src/lib
// (table-shaped, как projects.ts), а не копируются в master.

import type { Project } from "@/lib/projects";
import type { Review } from "@/lib/reviews";
import type { Stat } from "@/lib/stats";
import { DISCORD_INVITE } from "@/lib/site";

/** Живые данные из базы — теми же функциями, что у настоящей главной. */
export type LabData = {
  projects: Project[];
  reviews: Review[];
  stats: Stat[];
};

export const HERO = {
  title: "SouCampus crafts your ideas and dreams",
  lede: "I create custom maps, structures and entire worlds in Minecraft, from scratch to a breathtaking masterpiece.",
  primary: { label: "Order a map", href: "/contact" },
  secondary: { label: "See what I've built", href: "/portfolio" },
} as const;

export const STEPS = [
  { title: "Request", text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", text: "We work out the details, style, timeline and price." },
  { title: "Deposit", text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", text: "I build the map and show you progress along the way." },
  { title: "Delivery", text: "Final walkthrough, revisions, remaining payment, map handover." },
] as const;

export const PLANS = [
  { name: "Free", price: "0€", text: "Access to part of the build library. See what's on offer before subscribing." },
  { name: "Builder", price: "5.99€/mo", text: "A lot of builds in the library so far, plus new ones each month. Builds are saved to your profile on the site." },
  { name: "Pro", price: "9.99€/mo", text: "Everything in Builder plus a commercial license for the builds and early access to new drops." },
  { name: "Support", price: "from 25€/mo", text: "For teams and servers: multiple members, shared library access and priority on custom orders." },
  { name: "Lifetime", price: "300€ once", text: "One payment, lifetime access to the entire build library, including everything released in the future." },
] as const;

export const PLANS_NOTE = "Subscribe to the build library, or order something of your own.";

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

export const SOCIALS = [
  { label: "Discord", href: DISCORD_INVITE },
  { label: "YouTube", href: "https://www.youtube.com/@SouCampus" },
  { label: "Instagram", href: "https://www.instagram.com/soucampusbuilds/" },
  { label: "TikTok", href: "https://www.tiktok.com/@soucampus" },
  { label: "X", href: "https://x.com/SouCampusBuilds" },
  { label: "PlanetMinecraft", href: "https://www.planetminecraft.com/member/soucampus/" },
] as const;

export const LEGAL = [
  { label: "Wiki", href: "/wiki" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export { DISCORD_INVITE };

/** Работы для витрин: сначала избранные, и не меньше четырёх. */
export function pickWork(projects: Project[], count = 6) {
  const featured = projects.filter((p) => p.isFeatured);
  return (featured.length >= 4 ? featured : projects).slice(0, count);
}

/** Длинное тире в текстах из базы (описания, отзывы) → запятая. */
export function noDash(text: string) {
  return text.replace(/\s[—–]\s/g, ", ").replace(/[—–]/g, "-");
}
