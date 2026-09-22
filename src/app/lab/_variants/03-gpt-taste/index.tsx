import Image from "next/image";
import Link from "next/link";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { PinnedGallery, ReviewCarousel, ScrubText } from "./client";
import { labLink } from "../../_shared/pages";
import { Pill, SLUG, Shell } from "./shell";
import s from "./styles.module.css";

// Вариант 3 — gpt-taste (Leonxlnx). Ветка design-lab.
//
// <design_plan>, как требует скилл (§8):
//   RNG (seed = длина запроса владельца, 101 % n):
//     hero        = Cinematic Center (101 % 3 = 2 → «highly preferred»)
//     typography  = Outfit (101 % 4 = 1)
//     components  = Inline Typography Images, Infinite Marquee,
//                   Feedback Carousel
//     motion      = Scroll Pinning (split) + Scrubbing Text Reveal
//   AIDA: Nav (плавающая стеклянная пилюля) → Attention (hero) →
//         Interest (bento) → Desire (закреплённая галерея + текст от
//         скролла) → Action (огромный CTA + подвал).
//   Hero math: заголовок в max-w-6xl, clamp(3rem,5.4vw,5.75rem) →
//         2–3 строки на любой ширине. Никаких значков и пилюль-тегов.
//   Bento: 4 колонки × 3 ряда = 12 клеток. Постройка 2×2, главная
//         цифра 2×1, две цифры по 1×1, страны 4×1: 4+2+1+1+4 = 12,
//         grid-flow-dense, пустых клеток нет.
//   Label sweep: ни одного «SECTION 01». Контраст кнопок проверен.
//
// ⚠️ Скилл требует GSAP. Здесь те же приёмы на motion — он уже в
// проекте, новая зависимость ради одного варианта не окупается.

export function GptTaste({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);
  const [a, b, c] = work;

  return (
    <Shell page="home">
      {/* ATTENTION — кино: картинка на весь экран под тёмной радиальной
          вуалью, слова по центру, в заголовок вставлены «пилюли» построек. */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 pb-20 pt-32 text-center">
        {a && (
          <Image src={a.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-70 contrast-125 saturate-[.85]" />
        )}
        <div className={`${s.wash} -z-10`} aria-hidden="true" />
        <h1 className="mx-auto max-w-6xl text-[clamp(3rem,5.4vw,5.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
          SouCampus crafts
          {b && <Pill src={b.image} />}
          your ideas and
          {c && <Pill src={c.image} />}
          dreams
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-white/70">{HERO.lede}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={labLink(SLUG, HERO.primary.href)} className="rounded-full bg-white px-8 py-4 font-medium text-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.98]">
            {HERO.primary.label}
          </Link>
          <Link href={labLink(SLUG, HERO.secondary.href)} className="rounded-full border border-white/25 px-8 py-4 font-medium text-white transition-colors hover:bg-white/10">
            {HERO.secondary.label}
          </Link>
        </div>
      </section>

      {/* INTEREST — bento без пустот. */}
      <section aria-labelledby="g-bento" className="mx-auto max-w-7xl px-5 py-32 md:py-48">
        <h2 id="g-bento" className="max-w-4xl text-[clamp(2.25rem,4vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          Worlds for servers, creators and studios in ten countries
        </h2>
        <div className="mt-16 grid grid-flow-dense auto-rows-[220px] grid-cols-1 gap-3 md:grid-cols-4">
          {a && (
            <Link href={`/portfolio/${a.slug}`} className="group relative overflow-hidden rounded-3xl md:col-span-2 md:row-span-2">
              <Image src={a.image} alt={a.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <p className="absolute bottom-6 left-6 text-2xl font-semibold text-white">{a.title}</p>
            </Link>
          )}
          {stats[0] && (
            <div className="flex flex-col justify-end rounded-3xl bg-[#e8ff5a] p-7 text-black md:col-span-2">
              <p className="text-[clamp(3rem,6vw,5rem)] font-semibold leading-none tracking-[-0.04em]">{stats[0].value}{stats[0].suffix}</p>
              <p className="mt-2 text-lg">{stats[0].label}</p>
            </div>
          )}
          {stats.slice(1, 3).map((stat) => (
            <div key={stat.id} className="flex flex-col justify-end rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white">
              <p className="text-5xl font-semibold tracking-[-0.04em]">{stat.value}{stat.suffix}</p>
              <p className="mt-2 text-white/60">{stat.label}</p>
            </div>
          ))}
          <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white md:col-span-4">
            <p className="text-white/60">Clients from</p>
            <div className={s.marquee}>
              <div className={s.marqueeTrack}>
                {[0, 1].map((copy) => (
                  <span key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-10 pr-10">
                    {COUNTRIES.map((ct) => (
                      <span key={ct.id} className="flex items-center gap-4 whitespace-nowrap text-[clamp(2rem,4vw,3.25rem)] font-semibold tracking-[-0.03em]">
                        <Image src={ct.src} alt="" width={44} height={44} className="rounded-full" />
                        {ct.label}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DESIRE — текст от скролла, потом закреплённая галерея. */}
      <section className="mx-auto max-w-5xl px-5 py-32 md:py-48">
        <ScrubText text={`${HERO.lede} Every build starts as a conversation and ends as a world your players can walk through, delivered step by step with progress shown along the way.`} />
      </section>

      <PinnedGallery
        title="Recent builds"
        link={{ href: labLink(SLUG, HERO.secondary.href), label: HERO.secondary.label }}
        items={work.map((p) => ({ slug: p.slug, title: p.title, image: p.image, tag: p.tag, summary: noDash(p.summary) }))}
      />

      {/* Шаги — крупные строки, которые растут при наведении. */}
      <section aria-labelledby="g-steps" className="mx-auto max-w-7xl px-5 py-32 md:py-48">
        <h2 id="g-steps" className="text-[clamp(2.25rem,4vw,3.75rem)] font-semibold tracking-[-0.03em] text-white">From idea to handover</h2>
        <ol className="mt-16 border-t border-white/10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="group grid gap-2 border-b border-white/10 py-8 transition-colors duration-500 hover:bg-white/[0.03] md:grid-cols-[120px_1fr_1.2fr] md:items-center md:px-4">
              <span className="text-white/35 tabular-nums">{i + 1}</span>
              <span className="text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-0.03em] text-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-3">{step.title}</span>
              <span className="text-lg text-white/60">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="g-reviews" className="mx-auto max-w-7xl px-5 py-32 md:py-48">
        <h2 id="g-reviews" className="sr-only">What clients say</h2>
        <ReviewCarousel reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, flag: r.flag, text: noDash(r.text) }))} />
      </section>

      {/* ACTION — тарифы и огромный призыв. */}
      <section aria-labelledby="g-plans" className="mx-auto max-w-7xl px-5 py-32 md:py-48">
        <h2 id="g-plans" className="text-[clamp(2.25rem,4vw,3.75rem)] font-semibold tracking-[-0.03em] text-white">Or take from the library</h2>
        <p className="mt-4 max-w-xl text-white/60">{PLANS_NOTE}</p>
        <div className="mt-14 grid grid-flow-dense gap-3 md:grid-cols-6">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`flex flex-col justify-between gap-10 rounded-3xl p-7 ${
                i < 3 ? "md:col-span-2" : "md:col-span-3"
              } ${plan.name === "Lifetime" ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white"}`}
            >
              <p className="text-xl font-semibold">{plan.name}</p>
              <div>
                <p className="text-4xl font-semibold tracking-[-0.03em]">{plan.price}</p>
                <p className={`mt-3 ${plan.name === "Lifetime" ? "text-black/65" : "text-white/60"}`}>{plan.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-40 text-center md:py-56">
        <div className={s.glow} aria-hidden="true" />
        <h2 className="mx-auto max-w-5xl text-[clamp(3rem,8vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-white">
          Tell me what you want built
        </h2>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link href={labLink(SLUG, HERO.primary.href)} className="rounded-full bg-[#e8ff5a] px-10 py-5 text-lg font-medium text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
            {HERO.primary.label}
          </Link>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full border border-white/25 px-10 py-5 text-lg font-medium text-white hover:bg-white/10">
            Join the Discord
          </a>
        </div>
      </section>

    </Shell>
  );
}
