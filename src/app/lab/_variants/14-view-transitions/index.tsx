import Image from "next/image";
import Link from "next/link";
import { Epilogue } from "next/font/google";
import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  type LabData,
} from "../../_shared/content";
import { MorphGallery, ReviewSwap } from "./client";

// Вариант 14 — react-view-transitions (Vercel). Ветка design-lab.
//
// Скилл не про цвет и шрифт, а про то, как интерфейс переходит из
// состояния в состояние. Поэтому страница — режим «Experience» (так его
// называет impeccable): постройки ведут с первого экрана, интерфейс
// отступает. Вся выразительность — в переходах (см. client.tsx).
//
// Классы переходов (sheet-in, slide-from-right…) — глобальный CSS ниже:
// псевдоэлементы ::view-transition-* живут на уровне документа, и в
// CSS-модуле их имена были бы переписаны хэшем.
const epilogue = Epilogue({ subsets: ["latin"], variable: "--v-sans", preload: false });

const TRANSITIONS = `
::view-transition-group(.morph){animation-duration:.5s;animation-timing-function:cubic-bezier(.2,.8,.2,1)}
::view-transition-new(.sheet-in){animation:vt-sheet-in .38s cubic-bezier(.2,.8,.2,1) both}
::view-transition-old(.sheet-out){animation:vt-fade-out .25s ease both}
::view-transition-new(.slide-from-right){animation:vt-from-right .4s cubic-bezier(.2,.8,.2,1) both}
::view-transition-old(.slide-to-left){animation:vt-to-left .4s cubic-bezier(.2,.8,.2,1) both}
::view-transition-new(.slide-from-left){animation:vt-from-left .4s cubic-bezier(.2,.8,.2,1) both}
::view-transition-old(.slide-to-right){animation:vt-to-right .4s cubic-bezier(.2,.8,.2,1) both}
::view-transition-new(.fade-up){animation:vt-fade-up .35s cubic-bezier(.2,.8,.2,1) both}
::view-transition-old(.fade-out){animation:vt-fade-out .2s ease both}
@keyframes vt-sheet-in{from{opacity:0;transform:translateY(24px)}}
@keyframes vt-fade-out{to{opacity:0}}
@keyframes vt-from-right{from{transform:translateX(18%);opacity:0}}
@keyframes vt-to-left{to{transform:translateX(-18%);opacity:0}}
@keyframes vt-from-left{from{transform:translateX(-18%);opacity:0}}
@keyframes vt-to-right{to{transform:translateX(18%);opacity:0}}
@keyframes vt-fade-up{from{opacity:0;transform:translateY(12px)}}
@media (prefers-reduced-motion: reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}
`;

export function ViewTransitions({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;

  return (
    <div className={`${epilogue.variable} min-h-[100dvh] overflow-x-clip bg-[#eef1f4] font-[family-name:var(--v-sans)] text-[#0e1116] selection:bg-[#0e1116] selection:text-white`}>
      <style>{TRANSITIONS}</style>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="font-semibold">SouCampus</Link>
        <Link href={HERO.primary.href} className="rounded-full bg-[#0e1116] px-4 py-2 text-sm font-semibold text-white">{HERO.primary.label}</Link>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-10 md:pt-16">
        <h1 className="max-w-4xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.045em]">{HERO.title}</h1>
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-lg text-lg text-[#0e1116]/65">{HERO.lede}</p>
          <p className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#0e1116]/60">
            {stats.map((stat) => (
              <span key={stat.id}>
                <span className="text-lg font-semibold tabular-nums text-[#0e1116]">{stat.value}{stat.suffix}</span> {stat.label}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* Галерея — главное на странице, и она же первый экран. */}
      <section aria-label="Builds" className="mx-auto max-w-7xl px-5 pb-24">
        <MorphGallery
          builds={projects.map((p) => ({
            slug: p.slug,
            title: p.title,
            tag: p.tag,
            image: p.image,
            summary: noDash(p.summary),
            size: p.size,
            deadline: p.deadline,
            price: p.price,
          }))}
        />
      </section>

      <section aria-labelledby="v-reviews" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5">
          <h2 id="v-reviews" className="mb-10 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.035em]">What clients say</h2>
          <ReviewSwap reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
          <ul className="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#0e1116]/60">
            {COUNTRIES.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="v-steps" className="mx-auto max-w-7xl px-5 py-24">
        <h2 id="v-steps" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.035em]">How an order goes</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-white p-6">
              <span className="text-sm text-[#0e1116]/45 tabular-nums">{i + 1}</span>
              <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-[#0e1116]/65">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="v-plans" className="mx-auto max-w-7xl px-5 py-24">
        <h2 id="v-plans" className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.035em]">The build library</h2>
        <p className="mt-3 text-[#0e1116]/65">{PLANS_NOTE}</p>
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`flex flex-col gap-3 rounded-2xl p-6 ${plan.name === "Lifetime" ? "bg-[#0e1116] text-white" : "bg-white"}`}>
              <p className="font-semibold">{plan.name}</p>
              <p className="text-2xl font-semibold tabular-nums">{plan.price}</p>
              <p className={`text-[15px] ${plan.name === "Lifetime" ? "text-white/70" : "text-[#0e1116]/65"}`}>{plan.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12">
        <div className="rounded-3xl bg-[#0e1116] px-8 py-20 text-white md:px-14">
          <h2 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.045em]">Tell me what you want built</h2>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={HERO.primary.href} className="rounded-full bg-white px-6 py-3 font-semibold text-[#0e1116]">{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full px-6 py-3 font-semibold ring-1 ring-white/30 hover:bg-white/10">Discord</a>
          </div>
        </div>
        <ul className="mt-8 flex flex-wrap gap-6 px-2 text-sm text-[#0e1116]/55">
          {SOCIALS.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#0e1116]">{l.label}</a></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
