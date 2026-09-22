import Image from "next/image";
import Link from "next/link";
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
import { labLink } from "../../_shared/pages";
import { LEGEND, ROOT, SLUG, newSeed, sora } from "./shell";
import { World } from "./world";

// Вариант 11 — algorithmic-art (Anthropic). Ветка design-lab.
//
// Скилл: «90% алгоритмической генерации, 10% параметров». Первый экран
// целиком отдан генеративной карте мира (world.tsx, там же манифест
// «Emergent Terrain»). Остальная страница нарочно тихая и берёт цвета
// из палитры биомов: вода, песок, лес, камень, снег. Страница выглядит
// как лист атласа: легенда, места, маршрут.
//
// p5.js, которым скилл пользуется по умолчанию, не подключён: для
// поля шума и двух слоёв хватает canvas 2D и сорока строк, а p5 весит
// ~1 МБ. Алгоритм от этого не меняется.

export function AlgorithmicArt({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 4);

  return (
    <div className={`${sora.variable} ${ROOT}`}>
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden md:items-center">
        <World initialSeed={newSeed()} />
        <div className="relative z-10 m-4 max-w-xl rounded-2xl bg-[#0d1210]/82 p-7 backdrop-blur-md md:m-12 md:p-10">
          <p className="text-sm text-[#e7d9a0]">SouCampus builds</p>
          <h1 className="mt-3 text-[clamp(2.25rem,4.6vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{HERO.title}</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#e7eee8]/75">{HERO.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={labLink(SLUG, HERO.primary.href)} className="rounded-full bg-[#e7d9a0] px-6 py-3 font-semibold text-[#0d1210] transition-transform active:scale-[0.98]">{HERO.primary.label}</Link>
            <Link href={labLink(SLUG, HERO.secondary.href)} className="rounded-full px-6 py-3 font-semibold ring-1 ring-[#e7eee8]/30 hover:bg-white/10">{HERO.secondary.label}</Link>
          </div>
        </div>
      </section>

      {/* Легенда карты: цифры рядом с полосой биомов. */}
      <section aria-label="In numbers" className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          {LEGEND.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
        </div>
        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.id}>
              <dt className="text-[#e7eee8]/60">{stat.label}</dt>
              <dd className="mt-2 text-6xl font-semibold tracking-[-0.04em] tabular-nums">{stat.value}{stat.suffix}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-14 flex flex-wrap gap-x-7 gap-y-3 text-[#e7eee8]/75">
          {COUNTRIES.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
              {c.label}
            </li>
          ))}
        </ul>
      </section>

      {/* Места на карте — работы. */}
      <section aria-labelledby="a-work" className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="a-work" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">Places I have built</h2>
          <Link href={labLink(SLUG, HERO.secondary.href)} className="text-[#e7d9a0] underline underline-offset-4">{HERO.secondary.label}</Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {work.map((p, i) => (
            <Link key={p.slug} href={`/portfolio/${p.slug}`} className="group">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl ring-4" style={{ ["--tw-ring-color" as string]: LEGEND[(i * 2 + 2) % LEGEND.length] }}>
                <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="text-sm tabular-nums text-[#e7eee8]/55">{p.size}</p>
              </div>
              <p className="mt-1 text-[#e7eee8]/65">{noDash(p.summary)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Маршрут — шаги по пунктирной тропе. */}
      <section aria-labelledby="a-steps" className="mx-auto max-w-6xl px-5 py-24">
        <h2 id="a-steps" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">The route from idea to map</h2>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-5">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[11px] hidden border-t-2 border-dashed border-[#e7d9a0]/40 md:block" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="relative block h-6 w-6 rounded-full border-4 border-[#0d1210]" style={{ background: LEGEND[(i + 2) % LEGEND.length] }} />
              <h3 className="mt-5 text-lg font-semibold">{i + 1}. {step.title}</h3>
              <p className="mt-2 text-[#e7eee8]/65">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="a-reviews" className="mx-auto max-w-6xl px-5 py-24">
        <h2 id="a-reviews" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">Notes from clients</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {reviews.map((r) => (
            <figure key={r.slug} className="border-t border-[#e7eee8]/15 pt-6">
              <blockquote className="text-lg leading-relaxed">{noDash(r.text)}</blockquote>
              <figcaption className="mt-4 text-sm text-[#e7eee8]/60">{r.flag} {r.name}, {r.role}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="a-plans" className="mx-auto max-w-6xl px-5 py-24">
        <h2 id="a-plans" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]">The build library</h2>
        <p className="mt-3 text-[#e7eee8]/65">{PLANS_NOTE}</p>
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className={`flex flex-col gap-3 rounded-xl p-6 ${plan.name === "Lifetime" ? "bg-[#e7d9a0] text-[#0d1210]" : "bg-white/[0.05]"}`}>
              <span aria-hidden="true" className="h-2 w-8 rounded-full" style={{ background: LEGEND[i + 1] }} />
              <p className="font-semibold">{plan.name}</p>
              <p className="text-2xl font-semibold tabular-nums">{plan.price}</p>
              <p className={`text-[15px] ${plan.name === "Lifetime" ? "text-[#0d1210]/75" : "text-[#e7eee8]/65"}`}>{plan.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-24">
        <h2 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.04em]">Tell me what world you want built</h2>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={labLink(SLUG, HERO.primary.href)} className="rounded-full bg-[#e7d9a0] px-7 py-3.5 font-semibold text-[#0d1210]">{HERO.primary.label}</Link>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full px-7 py-3.5 font-semibold ring-1 ring-[#e7eee8]/30 hover:bg-white/10">Discord</a>
        </div>
        <ul className="mt-20 flex flex-wrap gap-6 border-t border-[#e7eee8]/15 pt-8 text-sm text-[#e7eee8]/55">
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#e7eee8]">{l.label}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
