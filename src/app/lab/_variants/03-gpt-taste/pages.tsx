import Image from "next/image";
import Link from "next/link";
import { DISCORD_INVITE, HERO, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE, estimate, formatEuro, labHref } from "../../_shared/pages";
import { BASE_RATE } from "@/lib/pricing";
import type { Project } from "@/lib/projects";
import { PinnedGallery, ScrubText } from "./client";
import { CinemaEstimator } from "./estimator";
import { Pill, SLUG, Shell } from "./shell";
import s from "./styles.module.css";

// Страницы студии в варианте Cinema (gpt-taste). Те же законы, что у
// лендинга: AIDA на каждой странице (кадр → интерес → желание → действие),
// bento без пустых клеток, никаких «SECTION 01» и значков-пилюль, огромный
// призыв последним экраном. Лимонный акцент — только на одной вещи за экран.

// ── Portfolio ───────────────────────────────────────────────────────────

// Bento 4 колонки. Узор повторяется группами по четыре карточки:
// 2×2 + 1×1 + 1×1 + 2×1 = 8 клеток = ровно два ряда. Хвост из 1–3 карточек
// получает свой узор, который тоже закрывает ряд целиком: у скилла пустая
// клетка — провал, а не «ну почти».
function spanFor(index: number, total: number) {
  const tail = total % 4;
  const tailStart = total - tail;
  if (index >= tailStart && tail > 0) {
    if (tail === 1) return "md:col-span-4";
    if (tail === 2) return "md:col-span-2";
    return index === tailStart ? "md:col-span-2" : "md:col-span-1";
  }
  return ["md:col-span-2 md:row-span-2", "md:col-span-1", "md:col-span-1", "md:col-span-2"][index % 4];
}

export function CinemaPortfolio({ data }: { data: LabData }) {
  const featured = data.projects.filter((p) => p.isFeatured);
  const rest = data.projects.filter((p) => !p.isFeatured);
  const [a, b, c] = featured.length >= 3 ? featured : data.projects;

  return (
    <Shell page="portfolio">
      <section className="relative flex min-h-[85dvh] flex-col items-center justify-center px-5 pb-16 pt-32 text-center">
        {a && <Image src={a.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60 contrast-125 saturate-[.85]" />}
        <div className={`${s.wash} -z-10`} aria-hidden="true" />
        <h1 className="mx-auto max-w-6xl text-[clamp(3rem,6vw,6.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
          Selected
          {b && <Pill src={b.image} />}
          builds
          {c && <Pill src={c.image} />}
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-white/70">
          {data.projects.length} worlds, from spawns and castles to cities and RPG maps. {PORTFOLIO.lede}
        </p>
      </section>

      <PinnedGallery
        title="Featured"
        link={{ href: labHref(SLUG, "contact"), label: HERO.primary.label }}
        items={featured.map((p) => ({ slug: p.slug, title: p.title, image: p.image, tag: p.tag, summary: noDash(p.summary) }))}
      />

      <section aria-labelledby="g-more" className="mx-auto max-w-7xl px-5 py-32 md:py-40">
        <h2 id="g-more" className="max-w-4xl text-[clamp(2.25rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          {PORTFOLIO.more}
        </h2>
        <div className="mt-16 grid grid-flow-dense auto-rows-[240px] grid-cols-1 gap-3 md:grid-cols-4">
          {rest.map((project, i) => (
            <BentoCard key={project.slug} project={project} className={spanFor(i, rest.length)} />
          ))}
        </div>
      </section>

      <FinalCall title="Your world could be the next one here" />
    </Shell>
  );
}

function BentoCard({ project, className }: { project: Project; className: string }) {
  return (
    <Link href={`/portfolio/${project.slug}`} className={`group relative overflow-hidden rounded-3xl ${className}`}>
      <Image
        src={project.image}
        alt={project.title}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end justify-between gap-2">
        <p className="text-xl font-semibold text-white">{project.title}</p>
        <p className="text-sm text-white/60">{project.size} · {project.deadline}</p>
      </div>
    </Link>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function CinemaContact({ data }: { data: LabData }) {
  const [a, b] = data.projects.filter((p) => p.isFeatured);

  return (
    <Shell page="contact">
      <section className="relative flex min-h-[80dvh] flex-col items-center justify-center px-5 pb-16 pt-32 text-center">
        {a && <Image src={a.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-50 contrast-125 saturate-[.85]" />}
        <div className={`${s.wash} -z-10`} aria-hidden="true" />
        <h1 className="mx-auto max-w-5xl text-[clamp(3rem,6vw,6.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
          {CONTACT.titleStart}
          {b && <Pill src={b.image} />}
          {CONTACT.titleAccent}
        </h1>
        <p className="mt-8 max-w-xl text-lg text-white/70">{CONTACT.lede}</p>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noreferrer"
          className="mt-10 rounded-full bg-white px-8 py-4 font-medium text-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.98]"
        >
          {CONTACT.primary}
        </a>
      </section>

      {/* Bento 4×3 = 12 клеток: калькулятор 2×3, «чат» 2×1, «ответы» 2×1,
          цифра 2×1. 6 + 2 + 2 + 2 = 12, пустых нет. */}
      <section aria-label="Ways to start" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <div className="grid grid-flow-dense grid-cols-1 gap-3 md:auto-rows-[200px] md:grid-cols-4">
          <div className="md:col-span-2 md:row-span-3">
            <CinemaEstimator />
          </div>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white transition-colors hover:bg-white/[0.07] md:col-span-2">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">{CONTACT.chatTitle}</h2>
            <div className="flex items-end justify-between gap-6">
              <p className="max-w-sm text-white/60">{CONTACT.chatText}</p>
              <span aria-hidden="true" className="text-3xl transition-transform duration-500 group-hover:translate-x-2">→</span>
            </div>
          </a>
          <a href="#faq" className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white transition-colors hover:bg-white/[0.07] md:col-span-2">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">{CONTACT.answersTitle}</h2>
            <div className="flex items-end justify-between gap-6">
              <p className="max-w-sm text-white/60">{CONTACT.answersText}</p>
              <span aria-hidden="true" className="text-3xl transition-transform duration-500 group-hover:translate-y-2">↓</span>
            </div>
          </a>
          <div className="flex flex-col justify-end rounded-3xl bg-white p-7 text-black md:col-span-2">
            <p className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.04em]">{BASE_RATE}€</p>
            <p className="mt-2 text-lg text-black/60">base rate per 1×1 unit, so 100×100 is {formatEuro(estimate(100, 100).price)}</p>
          </div>
        </div>
      </section>

      {/* FAQ крупными строками, как шаги на лендинге. <details> — без JS:
          аккордеону не нужна ни одна строка клиентского кода. */}
      <section id="faq" aria-labelledby="g-faq" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-24 md:py-32">
        <h2 id="g-faq" className="text-[clamp(2.25rem,4vw,3.75rem)] font-semibold tracking-[-0.03em] text-white">{CONTACT.faqTitle}</h2>
        <div className="mt-14 border-t border-white/10">
          {FAQ.map((item, i) => (
            <details key={item.question} className={`group border-b border-white/10 ${s.details}`}>
              <summary className="grid cursor-pointer list-none gap-2 py-8 transition-colors duration-500 hover:bg-white/[0.03] md:grid-cols-[120px_1fr_auto] md:items-center md:px-4">
                <span className="tabular-nums text-white/35">{i + 1}</span>
                <span className="text-[clamp(1.4rem,2.6vw,2.25rem)] font-semibold leading-tight tracking-[-0.02em] text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-3">
                  {item.question}
                </span>
                <span aria-hidden="true" className="hidden text-3xl text-white/50 transition-transform duration-500 group-open:rotate-45 md:block">+</span>
              </summary>
              <p className="max-w-3xl pb-10 text-lg leading-relaxed text-white/65 md:pl-[136px]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <FinalCall title="Tell me what you want built" />
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function CinemaAbout({ data }: { data: LabData }) {
  const pool = data.projects.filter((p) => p.isFeatured);
  const [a, b, c] = pool.length >= 3 ? pool : data.projects;

  return (
    <Shell page="about">
      <section className="relative flex min-h-[90dvh] flex-col items-center justify-center px-5 pb-16 pt-32 text-center">
        {a && <Image src={a.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-55 contrast-125 saturate-[.85]" />}
        <div className={`${s.wash} -z-10`} aria-hidden="true" />
        <h1 className="mx-auto max-w-6xl text-[clamp(3rem,6vw,6.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
          Building worlds
          {b && <Pill src={b.image} />}
          since childhood
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-white/70">
          <strong className="font-medium text-white">{ABOUT.leadStrong}</strong> {ABOUT.lead}
        </p>
      </section>

      {/* Bento цифр: 3 факта по 1×1 + студии 1×1 в первом ряду, никаких
          пустот — 4 клетки в ряд из 4. */}
      <section aria-label="In numbers" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:auto-rows-[240px] md:grid-cols-4">
          {ABOUT.facts.map((fact, i) => (
            <div
              key={fact.label}
              className={`flex flex-col justify-end rounded-3xl p-7 ${i === 0 ? "bg-[#e8ff5a] text-black" : "border border-white/10 bg-white/[0.04] text-white"}`}
            >
              <p className="text-[clamp(3rem,6vw,5rem)] font-semibold leading-none tracking-[-0.04em]">{fact.value}</p>
              <p className={`mt-2 text-lg ${i === 0 ? "text-black/65" : "text-white/60"}`}>{fact.label}</p>
            </div>
          ))}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white">
            <p className="text-white/60">Built with</p>
            <ul className="text-2xl font-semibold leading-snug tracking-[-0.02em]">
              {STUDIOS.map((studio) => (
                <li key={studio}>{studio}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* История: возраст закреплён слева, пока справа проезжает рассказ
          (gpt-taste §5 Scroll Pinning, split). */}
      <section aria-labelledby="g-story" className="mx-auto max-w-7xl px-5 py-24 md:py-32">
        <h2 id="g-story" className="max-w-4xl text-[clamp(2.25rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          {ABOUT.eyebrow}
        </h2>
        <ol className="mt-16">
          {TIMELINE.map((item) => (
            <li key={item.age} className="grid gap-6 border-t border-white/10 py-14 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
              <div className="md:sticky md:top-32 md:h-fit">
                <p className="text-[clamp(2.75rem,5.5vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-white">{item.age}</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-white/65">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Инструменты — бегущей строкой, как страны на лендинге; ремесло —
          крупным текстом, который проявляется от скролла. */}
      <section aria-labelledby="g-skills" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5">
          <h2 id="g-skills" className="text-[clamp(2.25rem,4vw,3.75rem)] font-semibold tracking-[-0.03em] text-white">{ABOUT.skillsTitle}</h2>
          <p className="mt-4 max-w-xl text-white/60">{ABOUT.skillsLede}</p>
        </div>
        <div className={`${s.marquee} mt-14`}>
          <div className={s.marqueeTrack}>
            {[0, 1].map((copy) => (
              <span key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-12 pr-12">
                {SKILLS.tools.map((tool, i) => (
                  <span key={tool} className="flex items-center gap-12 whitespace-nowrap text-[clamp(2.5rem,6vw,5rem)] font-semibold tracking-[-0.04em] text-white">
                    {tool}
                    {i % 3 === 0 && c && <Pill src={c.image} />}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-24 max-w-5xl px-5">
          <ScrubText text={`${SKILLS.craft.join(", ")}. ${ABOUT.closing[1]}`} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <p className="text-xl leading-relaxed text-white/65">{ABOUT.closing[0]}</p>
      </section>

      <FinalCall title="Let's build yours next" />
    </Shell>
  );
}

// ── Общий финал ─────────────────────────────────────────────────────────

function FinalCall({ title }: { title: string }) {
  return (
    <section className="relative overflow-hidden px-5 py-40 text-center md:py-56">
      <div className={s.glow} aria-hidden="true" />
      <h2 className="mx-auto max-w-5xl text-[clamp(3rem,8vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">{title}</h2>
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full bg-[#e8ff5a] px-10 py-5 text-lg font-medium text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
          {CONTACT.primary}
        </a>
        <Link href={labHref(SLUG, "portfolio")} className="rounded-full border border-white/25 px-10 py-5 text-lg font-medium text-white hover:bg-white/10">
          {HERO.secondary.label}
        </Link>
      </div>
    </section>
  );
}
