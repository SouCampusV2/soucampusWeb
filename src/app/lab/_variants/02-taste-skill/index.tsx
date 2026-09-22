import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
import { HeroCycle, StackCard } from "./client";
import s from "./styles.module.css";

// Вариант 2 — taste-skill (Leonxlnx). Ветка design-lab.
//
// Design Read (§0.B): «Reading this as: commission landing for server
// owners and players, with a kinetic editorial-type language, leaning
// toward native CSS + scroll-linked motion + Geist».
// Dials (§1): DESIGN_VARIANCE 8, MOTION_INTENSITY 7, VISUAL_DENSITY 3 —
// пресет «Portfolio (Designer / studio)».
//
// Что из скилла видно на странице:
//   • hero разделённый, не по центру (§4.3 anti-center при variance > 4);
//     подзаголовок ≤ 20 слов, CTA видны без скролла (§4.7);
//   • работы — Sticky-Stack (§5.A): прошлая карточка уменьшается и тускнеет,
//     пока следующая наезжает. Вместо GSAP — motion, он уже в проекте;
//   • одно действие — одна надпись: «Order a map» везде (§4.5);
//   • ни одной «бровки» над заголовками, ни одного длинного тире (§9);
//   • один акцент на всю страницу, радиусы по одному правилу: кнопки —
//     пилюли, всё остальное 16px (§4.2, §4.4);
//   • каждая секция — своё семейство раскладки (§4.7 repetition ban).
//   • тёмная тема обязательна (§6.C) — по системной настройке.
const sans = Geist({ subsets: ["latin"], variable: "--t-sans", preload: false });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--t-mono", preload: false });

export function TasteSkill({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 5);
  const heroImages = work.slice(0, 3).map((p) => ({ src: p.image, alt: p.title }));

  return (
    <div className={`${sans.variable} ${mono.variable} ${s.root}`}>
      <header className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 md:px-10">
        <Link href="/" className="text-[17px] font-semibold tracking-tight">
          SouCampus
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 text-[15px] text-[var(--muted)] md:flex">
          <Link href="/portfolio" className="hover:text-[var(--ink)]">Portfolio</Link>
          <Link href="/marketplace" className="hover:text-[var(--ink)]">Marketplace</Link>
          <Link href="/about" className="hover:text-[var(--ink)]">About</Link>
        </nav>
        <Link href={HERO.primary.href} className={`${s.pill} ${s.pillAccent} h-10 px-5 text-[14px]`}>
          {HERO.primary.label}
        </Link>
      </header>

      {/* Hero: слева слова, справа высокая картинка, которая медленно
          сменяет три постройки. */}
      <section className="mx-auto grid min-h-[calc(100dvh-68px)] max-w-[1280px] items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:pt-12">
        <div className="flex flex-col gap-8">
          <h1 className="max-w-[14ch] text-[clamp(2.75rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.045em] [text-wrap:balance]">
            SouCampus crafts your ideas <span className="font-light">and dreams</span>
          </h1>
          <p className="max-w-[40ch] text-lg leading-relaxed text-[var(--muted)]">{HERO.lede}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className={`${s.pill} ${s.pillAccent} h-12 px-7`}>
              {HERO.primary.label}
            </Link>
            <Link href={HERO.secondary.href} className={`${s.pill} ${s.pillGhost} h-12 px-7`}>
              {HERO.secondary.label}
            </Link>
          </div>
        </div>
        <HeroCycle images={heroImages} />
      </section>

      {/* Цифры — в открытой раскладке, без карточек (§4.4 density), и
          под ними бегущая строка стран: «trusted by» живёт ПОД hero. */}
      <section aria-label="In numbers" className="border-y border-[var(--line)]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-14 md:grid-cols-3 md:px-10">
          {stats.map((stat) => (
            <div key={stat.id} className="flex items-baseline gap-4 md:block">
              <p className="font-[family-name:var(--t-mono)] text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.04em] tabular-nums">
                {stat.value}
                {stat.suffix}
              </p>
              <p className="text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className={s.marquee} aria-label="Clients from ten countries">
          <div className={s.marqueeTrack}>
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-12 pr-12">
                {COUNTRIES.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 whitespace-nowrap text-[var(--muted)]">
                    <Image src={c.src} alt="" width={22} height={22} className="rounded-full" />
                    {c.label}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* Работы — стопкой. */}
      <section aria-labelledby="t-work" className="pt-28">
        <div className="mx-auto mb-12 flex max-w-[1280px] flex-wrap items-end justify-between gap-4 px-5 md:px-10">
          <h2 id="t-work" className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.04em]">
            Recent builds
          </h2>
          <Link href={HERO.secondary.href} className="text-[15px] underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">
            {HERO.secondary.label}
          </Link>
        </div>
        <div className="relative">
          {work.map((p, i) => (
            <StackCard key={p.slug} last={i === work.length - 1}>
              <article className="mx-auto grid h-full w-full max-w-[1280px] gap-6 rounded-2xl bg-[var(--card)] p-4 shadow-[0_30px_80px_-40px_var(--shadow)] md:grid-cols-[1.4fr_1fr] md:p-6">
                <Link href={`/portfolio/${p.slug}`} className="relative min-h-[36vh] overflow-hidden rounded-[12px]">
                  <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
                </Link>
                <div className="flex flex-col justify-between gap-6 p-2 md:p-4">
                  <div>
                    <p className="font-[family-name:var(--t-mono)] text-[13px] text-[var(--muted)]">{p.tag}</p>
                    <h3 className="mt-3 text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
                      <Link href={`/portfolio/${p.slug}`}>{p.title}</Link>
                    </h3>
                    <p className="mt-4 max-w-[46ch] leading-relaxed text-[var(--muted)]">{noDash(p.summary)}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-5 text-[14px]">
                    <div><dt className="text-[var(--muted)]">Size</dt><dd className="mt-1 font-medium tabular-nums">{p.size}</dd></div>
                    <div><dt className="text-[var(--muted)]">Built in</dt><dd className="mt-1 font-medium">{p.deadline}</dd></div>
                    <div><dt className="text-[var(--muted)]">Price</dt><dd className="mt-1 font-medium">{p.price}</dd></div>
                  </dl>
                </div>
              </article>
            </StackCard>
          ))}
        </div>
      </section>

      {/* Отзывы — лента с прилипанием, своё семейство раскладки. */}
      <section aria-labelledby="t-reviews" className="py-28">
        <h2 id="t-reviews" className="mx-auto mb-10 max-w-[1280px] px-5 text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.04em] md:px-10">
          What clients say
        </h2>
        <ul className={s.strip}>
          {reviews.map((r) => (
            <li key={r.slug} className="flex w-[min(84vw,420px)] shrink-0 snap-start flex-col justify-between gap-8 rounded-2xl border border-[var(--line)] p-7">
              <p className="text-[19px] leading-[1.5]">{noDash(r.text)}</p>
              <p className="text-[14px]">
                <span className="font-medium">{r.flag} {r.name}</span>
                <span className="block text-[var(--muted)]">{r.role}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Шаги — горизонтальная линия с пятью точками (на телефоне вертикальная). */}
      <section aria-labelledby="t-steps" className="mx-auto max-w-[1280px] px-5 py-28 md:px-10">
        <h2 id="t-steps" className="mb-14 text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.04em]">
          How an order goes
        </h2>
        <ol className="grid gap-10 md:grid-cols-5 md:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative border-l border-[var(--line)] pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
              <span className="absolute -left-[5px] top-1 h-[9px] w-[9px] rounded-full bg-[var(--accent)] md:-top-[5px] md:left-0" />
              <p className="font-[family-name:var(--t-mono)] text-[13px] text-[var(--muted)]">{i + 1}</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-[var(--muted)]">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Тарифы — таблица сравнения, а не три одинаковые карточки. */}
      <section aria-labelledby="t-plans" className="mx-auto max-w-[1280px] px-5 py-28 md:px-10">
        <h2 id="t-plans" className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-none tracking-[-0.04em]">
          The build library
        </h2>
        <p className="mt-4 max-w-[60ch] text-[var(--muted)]">{PLANS_NOTE}</p>
        <div className="mt-12 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {PLANS.map((plan) => (
            <div key={plan.name} className="grid gap-2 py-6 md:grid-cols-[200px_200px_1fr] md:items-baseline md:gap-8">
              <p className="text-2xl font-semibold tracking-tight">{plan.name}</p>
              <p className="font-[family-name:var(--t-mono)] tabular-nums">{plan.price}</p>
              <p className="max-w-[60ch] text-[var(--muted)]">{plan.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Действие — сплошная полоса акцента, единственная такая на странице. */}
      <section className="px-3 pb-3 md:px-5 md:pb-5">
        <div className="rounded-2xl bg-[var(--accent)] px-6 py-24 text-[var(--on-accent)] md:px-14 md:py-32">
          <h2 className="max-w-[16ch] text-[clamp(2.75rem,7vw,6rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Tell me what you want built
          </h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className={`${s.pill} ${s.pillInverse} h-12 px-7`}>
              {HERO.primary.label}
            </Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.pill} ${s.pillOutlineInverse} h-12 px-7`}>
              Discord
            </a>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-6 px-3 py-8 text-[14px] text-[var(--muted)]">
          <span>SouCampus builds</span>
          <ul className="flex flex-wrap gap-5">
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--ink)]">{l.label}</a></li>
            ))}
          </ul>
        </footer>
      </section>
    </div>
  );
}
