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
  type LabData,
} from "../../_shared/content";
import { Gallery, Motion, PlanPicker } from "./client";

// Вариант 17 — apple-design (Эмиль Ковальски, «подход Apple для веба»).
//
//   • системный шрифт (§15: «default to the platform's system font») —
//     на Apple это SF с оптическими размерами; трекинг зависит от
//     размера: крупное сжато, мелкое почти 0;
//   • полупрозрачный навбар, контент едет ПОД ним, вместо линии —
//     мягкая маска на стыке (§12 «scroll edge effects»);
//   • лента работ и нижняя панель — жесты с пружинами (client.tsx);
//   • всё интерактивное реагирует на касание, а не на отпускание (§1).
export function AppleDesign({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;

  return (
    <Motion>
      <div className="min-h-[100dvh] overflow-x-clip bg-[#f5f5f7] font-[system-ui,-apple-system,'SF_Pro_Text','Segoe_UI',sans-serif] text-[#1d1d1f] antialiased [-webkit-tap-highlight-color:transparent]">
        <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#f5f5f7]/72 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex h-12 max-w-[1080px] items-center justify-between px-5 text-[13px]">
            <Link href="/" className="font-semibold">SouCampus</Link>
            <nav aria-label="Main" className="flex items-center gap-6 text-black/70">
              <Link href="/portfolio" className="hidden sm:block">Portfolio</Link>
              <Link href="/marketplace" className="hidden sm:block">Marketplace</Link>
              <Link href={HERO.primary.href} className="rounded-full bg-[#0071e3] px-3 py-1 font-medium text-white active:scale-95">{HERO.primary.label}</Link>
            </nav>
          </div>
        </header>

        <section className="mx-auto max-w-[1080px] px-5 pb-16 pt-20 text-center md:pt-28">
          <h1 className="mx-auto max-w-[14ch] text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[1.02] tracking-[-0.035em] [text-wrap:balance]">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-[34ch] text-[clamp(1.2rem,2vw,1.5rem)] leading-snug tracking-[-0.01em] text-black/60">{HERO.lede}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-[17px]">
            <Link href={HERO.primary.href} className="rounded-full bg-[#0071e3] px-6 py-3 font-medium text-white transition-transform duration-100 active:scale-[0.97]">{HERO.primary.label}</Link>
            <Link href={HERO.secondary.href} className="rounded-full px-6 py-3 font-medium text-[#0071e3] ring-1 ring-[#0071e3] transition-transform duration-100 active:scale-[0.97]">{HERO.secondary.label}</Link>
          </div>
        </section>

        <section aria-labelledby="f-work" className="pb-24">
          <h2 id="f-work" className="mx-auto mb-8 max-w-[1080px] px-5 text-[32px] font-bold tracking-[-0.025em]">
            Recent builds. <span className="text-black/45">Swipe, flick, tap.</span>
          </h2>
          <Gallery
            builds={projects.slice(0, 10).map((p) => ({
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

        <section aria-label="In numbers" className="bg-white py-24">
          <div className="mx-auto grid max-w-[1080px] gap-10 px-5 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.id}>
                <p className="text-[64px] font-bold leading-none tracking-[-0.045em] tabular-nums">{stat.value}{stat.suffix}</p>
                <p className="mt-3 text-[17px] text-black/55">{stat.label}</p>
              </div>
            ))}
          </div>
          <ul className="mx-auto mt-16 flex max-w-[1080px] flex-wrap gap-2 px-5">
            {COUNTRIES.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-full bg-[#f5f5f7] px-3.5 py-2 text-[15px]">
                <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="f-steps" className="mx-auto max-w-[1080px] px-5 py-24">
          <h2 id="f-steps" className="text-[40px] font-bold tracking-[-0.03em]">How an order goes.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[24px] bg-white p-6">
                <p className="text-[13px] font-semibold text-[#0071e3]">Step {i + 1}</p>
                <h3 className="mt-2 text-[21px] font-bold tracking-[-0.015em]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-black/60">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="f-reviews" className="mx-auto max-w-[1080px] px-5 py-24">
          <h2 id="f-reviews" className="text-[40px] font-bold tracking-[-0.03em]">In their words.</h2>
          <div className="mt-10 columns-1 gap-4 md:columns-3">
            {reviews.map((r) => (
              <figure key={r.slug} className="mb-4 break-inside-avoid rounded-[24px] bg-white p-6">
                <blockquote className="text-[17px] leading-relaxed">{noDash(r.text)}</blockquote>
                <figcaption className="mt-4 text-[13px] text-black/50">{r.name}, {r.role}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section aria-labelledby="f-plans" className="mx-auto max-w-[1080px] px-5 py-24">
          <h2 id="f-plans" className="text-[40px] font-bold tracking-[-0.03em]">The build library.</h2>
          <p className="mb-8 mt-2 text-[17px] text-black/55">{PLANS_NOTE}</p>
          <PlanPicker plans={PLANS.map((p) => ({ ...p }))} />
        </section>

        <section className="bg-black px-5 py-28 text-center text-white">
          <h2 className="mx-auto max-w-[14ch] text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em]">Tell me what you want built.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-[17px]">
            <Link href={HERO.primary.href} className="rounded-full bg-[#0071e3] px-6 py-3 font-medium active:scale-[0.97]">{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="rounded-full px-6 py-3 font-medium text-[#2997ff] ring-1 ring-[#2997ff] active:scale-[0.97]">Discord</a>
          </div>
          <ul className="mx-auto mt-20 flex max-w-[1080px] flex-wrap justify-center gap-6 pb-16 text-[13px] text-white/50">
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-white">{l.label}</a></li>
            ))}
          </ul>
        </section>
      </div>
    </Motion>
  );
}
