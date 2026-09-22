import Image from "next/image";
import Link from "next/link";
import { Arimo } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { Deck } from "./client";
import s from "./styles.module.css";

// Вариант 9 — theme-factory (Anthropic). Ветка design-lab.
//
// Скилл делает одно: берёт готовую тему (палитра + пара шрифтов) и
// последовательно применяет её к артефакту. Тема выбрана из десяти по
// его же описанию «Best Used For»: Midnight Galaxy — «gaming
// presentations, creative agencies».
//
//   Deep Purple  #2b1e3e — основа
//   Cosmic Blue  #4a4e8f — средний тон
//   Lavender     #a490c2 — акцент
//   Silver       #e6e6fa — светлое и текст
//   Шрифт        FreeSans Bold / FreeSans → в вебе Arimo (метрически тот
//                же гротеск; FreeSans в Google Fonts нет).
//
// Скилл создан для презентаций, поэтому и лендинг — колода: каждый
// раздел — слайд во весь экран, прокрутка защёлкивается на слайдах,
// сбоку точки и счётчик. Тема не добавляет ни одного цвета сверх
// четырёх (кроме прозрачностей этих же).
const arimo = Arimo({ subsets: ["latin"], weight: ["400", "700"], variable: "--f-arimo", preload: false });

export function ThemeFactory({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);
  const quotes = reviews.slice(0, 4);

  const slides = [
    {
      id: "title",
      label: "Title",
      body: (
        <div className="flex flex-col items-start gap-8">
          <p className={s.kicker}>SouCampus builds</p>
          <h1 className="max-w-4xl text-[clamp(2.75rem,6.4vw,5.75rem)] font-bold leading-[1.02]">{HERO.title}</h1>
          <p className="max-w-xl text-xl text-[#e6e6fa]/80">{HERO.lede}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className={s.btnSolid}>{HERO.primary.label}</Link>
            <Link href={HERO.secondary.href} className={s.btnLine}>{HERO.secondary.label}</Link>
          </div>
        </div>
      ),
    },
    {
      id: "numbers",
      label: "In numbers",
      body: (
        <div>
          <h2 className={s.slideTitle}>In numbers</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.id} className="border-t-2 border-[#a490c2] pt-6">
                <p className="text-[clamp(3.5rem,7vw,6rem)] font-bold leading-none">{stat.value}{stat.suffix}</p>
                <p className="mt-3 text-lg text-[#e6e6fa]/75">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "work",
      label: "Recent builds",
      body: (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className={s.slideTitle}>Recent builds</h2>
            <Link href={HERO.secondary.href} className="text-[#a490c2] underline underline-offset-4">{HERO.secondary.label}</Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {work.map((p) => (
              <Link key={p.slug} href={`/portfolio/${p.slug}`} className={s.tile}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={p.image} alt={p.title} fill sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover" />
                </div>
                <p className="px-4 pb-4 pt-3 font-bold">{p.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "countries",
      label: "Clients",
      body: (
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:items-center">
          <h2 className={s.slideTitle}>Clients from ten countries</h2>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-5">
            {COUNTRIES.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-xl">
                <Image src={c.src} alt="" width={30} height={30} className="rounded-full ring-2 ring-[#4a4e8f]" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "reviews",
      label: "Reviews",
      body: (
        <div>
          <h2 className={s.slideTitle}>What clients say</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {quotes.map((r) => (
              <figure key={r.slug} className="border-l-2 border-[#a490c2] pl-6">
                <blockquote className="text-lg leading-relaxed">{noDash(r.text)}</blockquote>
                <figcaption className="mt-3 text-[#a490c2]">{r.name}, {r.role}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "process",
      label: "How it works",
      body: (
        <div>
          <h2 className={s.slideTitle}>How an order goes</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#4a4e8f] text-2xl font-bold">{i + 1}</span>
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="text-[#e6e6fa]/75">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "plans",
      label: "Plans",
      body: (
        <div>
          <h2 className={s.slideTitle}>The build library</h2>
          <p className="mt-3 text-lg text-[#e6e6fa]/75">{PLANS_NOTE}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`flex flex-col gap-3 p-6 ${plan.name === "Lifetime" ? "bg-[#a490c2] text-[#2b1e3e]" : "bg-[#4a4e8f]/40"}`}>
                <p className="font-bold">{plan.name}</p>
                <p className="text-3xl font-bold">{plan.price}</p>
                <p className="text-[15px] opacity-85">{plan.text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "end",
      label: "Order",
      body: (
        <div className="flex flex-col items-start gap-10">
          <h2 className="max-w-3xl text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[1]">Tell me what you want built</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className={s.btnSolid}>{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.btnLine}>Discord</a>
          </div>
          <ul className="flex flex-wrap gap-5 text-[#e6e6fa]/70">
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#e6e6fa]">{l.label}</a></li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className={`${arimo.variable} ${s.root}`}>
      <Deck slides={slides.map(({ id, label }) => ({ id, label }))}>
        {slides.map((slide, i) => (
          <section key={slide.id} id={`slide-${slide.id}`} aria-label={slide.label} className={s.slide} data-slide={i}>
            <div className={s.slideInner}>{slide.body}</div>
            <p className={s.footer} aria-hidden="true">
              <span>SouCampus builds</span>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </p>
          </section>
        ))}
      </Deck>
    </div>
  );
}
