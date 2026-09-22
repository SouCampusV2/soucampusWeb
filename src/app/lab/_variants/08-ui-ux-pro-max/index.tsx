import Image from "next/image";
import Link from "next/link";
import { Chakra_Petch, Russo_One } from "next/font/google";
import { ArrowRight, Cube, MapTrifold, UsersThree } from "@phosphor-icons/react/dist/ssr";
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
import { Carousel } from "./client";
import s from "./styles.module.css";

// Вариант 8 — ui-ux-pro-max (nextlevelbuilder). Ветка design-lab.
//
// Здесь ничего не выбрано «на вкус»: всё взято из выдачи самого скилла.
// Команда (запускалась 21.09):
//   python scripts/search.py "minecraft map builder commission portfolio
//     gaming landing" --design-system -p "SouCampus builds"
// Ответ базы:
//   PATTERN  Hero + Testimonials + CTA
//            Hero → Problem → Solution → Testimonials carousel → CTA;
//            CTA — в hero (липкая) и после отзывов.
//            Карусель: prev/next, пауза, стоп при фокусе/наведении/
//            reduced-motion, объявлять позицию слайда.
//   STYLE    Vibrant & Block-based (gaming, youth, creative agencies)
//   COLORS   primary #2563EB, secondary #7C3AED, accent #EC4899 (текст
//            на нём чёрный), фон #FFFFFF, текст #0F172A, muted #F1F5FD /
//            #475569, линии #E4ECFC
//   TYPE     Russo One / Chakra Petch
//   EFFECTS  секции с зазорами 48px+, анимированные узоры, смелый hover
//            сменой цвета, scroll-snap, крупный шрифт, 200–300ms
//   AVOID    приглушённые цвета и «низкую энергию»
//   CHECK    никаких эмодзи вместо иконок (иконки — Phosphor, SVG),
//            cursor-pointer, фокус, reduced-motion, 375/768/1024/1440.
const russo = Russo_One({ subsets: ["latin"], weight: "400", variable: "--u-head", preload: false });
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--u-body", preload: false });

const BLOCK = ["bg-[#2563EB] text-white", "bg-[#7C3AED] text-white", "bg-[#EC4899] text-black"];

export function UiUxProMax({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 6);

  return (
    <div className={`${russo.variable} ${chakra.variable} ${s.root}`}>
      {/* Липкая CTA из паттерна: полоса со ссылкой на заказ всегда сверху. */}
      <header className="sticky top-0 z-30 border-b-4 border-[#0F172A] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Link href="/" className="font-[family-name:var(--u-head)] text-xl">SOUCAMPUS</Link>
          <nav aria-label="Main" className="hidden gap-6 font-semibold md:flex">
            <Link href="/portfolio" className="transition-colors duration-200 hover:text-[#7C3AED]">Portfolio</Link>
            <Link href="/marketplace" className="transition-colors duration-200 hover:text-[#7C3AED]">Marketplace</Link>
            <Link href="/about" className="transition-colors duration-200 hover:text-[#7C3AED]">About</Link>
          </nav>
          <Link href={HERO.primary.href} className={`${s.btn} bg-[#EC4899] text-black`}>{HERO.primary.label}</Link>
        </div>
      </header>

      {/* HERO: блочная композиция */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <h1 className="font-[family-name:var(--u-head)] text-[clamp(2.75rem,6vw,5rem)] leading-[1.02]">
            SouCampus crafts your ideas and dreams
          </h1>
          <p className="mt-6 max-w-lg text-xl text-[#475569]">{HERO.lede}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href={HERO.primary.href} className={`${s.btn} ${s.btnBig} bg-[#2563EB] text-white`}>
              {HERO.primary.label} <ArrowRight size={20} weight="bold" aria-hidden="true" />
            </Link>
            <Link href={HERO.secondary.href} className={`${s.btn} ${s.btnBig} bg-white text-[#0F172A]`}>
              {HERO.secondary.label}
            </Link>
          </div>
        </div>
        <div className="grid aspect-square grid-cols-3 grid-rows-3 gap-3 md:aspect-auto md:min-h-[520px]" aria-hidden="true">
          <div className={`${s.block} ${s.stripes} col-span-2 row-span-2 overflow-hidden bg-[#2563EB]`}>
            {work[0] && <Image src={work[0].image} alt="" fill priority sizes="(min-width: 768px) 30vw, 60vw" className="object-cover mix-blend-luminosity opacity-90" />}
          </div>
          <div className={`${s.block} ${s.dots} bg-[#EC4899]`} />
          <div className={`${s.block} overflow-hidden bg-[#7C3AED]`}>
            {work[1] && <Image src={work[1].image} alt="" fill sizes="15vw" className="object-cover" />}
          </div>
          <div className={`${s.block} ${s.dots} bg-[#7C3AED]`} />
          <div className={`${s.block} col-span-2 overflow-hidden bg-[#EC4899]`}>
            {work[2] && <Image src={work[2].image} alt="" fill sizes="30vw" className="object-cover" />}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-[#0F172A] py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-[1fr_1.2fr] md:items-center">
          <h2 className="font-[family-name:var(--u-head)] text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.05]">
            An idea is not a map yet
          </h2>
          <p className="text-xl leading-relaxed text-white/75">
            You know what your players should walk into: a spawn, a city, a whole world. Turning that into blocks takes
            style, planning and hundreds of hours of building. That part is my job.
          </p>
        </div>
      </section>

      {/* SOLUTION: цифры, работы, страны */}
      <section aria-labelledby="u-solution" className="mx-auto max-w-7xl px-5 py-24">
        <h2 id="u-solution" className="font-[family-name:var(--u-head)] text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.05]">
          Built from scratch, delivered whole
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = [Cube, UsersThree, MapTrifold][i % 3];
            return (
              <div key={stat.id} className={`${s.block} ${s.card} ${BLOCK[i % 3]} p-8`}>
                <Icon size={36} weight="bold" aria-hidden="true" />
                <p className="mt-10 font-[family-name:var(--u-head)] text-6xl">{stat.value}{stat.suffix}</p>
                <p className="mt-2 text-lg font-semibold">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className={s.snapRow}>
          {work.map((p) => (
            <Link key={p.slug} href={`/portfolio/${p.slug}`} className={`${s.block} ${s.workCard} group`}>
              <div className="relative aspect-[4/3] overflow-hidden border-b-4 border-[#0F172A]">
                <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 30vw, 80vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5 transition-colors duration-200 group-hover:bg-[#F1F5FD]">
                <span className="w-fit border-2 border-[#0F172A] bg-[#F1F5FD] px-2 py-0.5 text-sm font-semibold">{p.tag}</span>
                <h3 className="font-[family-name:var(--u-head)] text-2xl">{p.title}</h3>
                <p className="text-[#475569]">{noDash(p.summary)}</p>
                <p className="mt-auto pt-3 font-semibold">{p.size} · {p.deadline}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          {COUNTRIES.map((c, i) => (
            <span key={c.id} className={`${s.chip} ${i % 3 === 0 ? "bg-[#F1F5FD]" : "bg-white"}`}>
              <Image src={c.src} alt="" width={22} height={22} className="rounded-full" />
              {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* Шаги — ряд цветных блоков */}
      <section aria-labelledby="u-steps" className="mx-auto max-w-7xl px-5 py-24">
        <h2 id="u-steps" className="font-[family-name:var(--u-head)] text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.05]">How it works</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className={`${s.block} ${s.card} ${BLOCK[i % 3]} flex flex-col gap-3 p-6`}>
              <span className="font-[family-name:var(--u-head)] text-5xl">{i + 1}</span>
              <h3 className="font-[family-name:var(--u-head)] text-xl">{step.title}</h3>
              <p className="font-medium">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TESTIMONIALS + CTA после них */}
      <section aria-labelledby="u-reviews" className="bg-[#F1F5FD] py-24">
        <div className="mx-auto max-w-7xl px-5">
          <h2 id="u-reviews" className="font-[family-name:var(--u-head)] text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.05]">What clients say</h2>
          <Carousel reviews={reviews.map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))} />
          <div className="mt-12">
            <Link href={HERO.primary.href} className={`${s.btn} ${s.btnBig} bg-[#EC4899] text-black`}>
              {HERO.primary.label} <ArrowRight size={20} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Тарифы */}
      <section aria-labelledby="u-plans" className="mx-auto max-w-7xl px-5 py-24">
        <h2 id="u-plans" className="font-[family-name:var(--u-head)] text-[clamp(2.25rem,4.5vw,3.75rem)] leading-[1.05]">Build library</h2>
        <p className="mt-4 text-xl text-[#475569]">{PLANS_NOTE}</p>
        <div className="mt-12 grid gap-4 md:grid-cols-5">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className={`${s.block} ${s.card} flex flex-col gap-4 p-6 ${plan.name === "Lifetime" ? "bg-[#7C3AED] text-white" : "bg-white"}`}>
              <p className="font-[family-name:var(--u-head)] text-xl">{plan.name}</p>
              <p className="font-[family-name:var(--u-head)] text-3xl">{plan.price}</p>
              <p className={plan.name === "Lifetime" ? "text-white/85" : "text-[#475569]"}>{plan.text}</p>
              <span className="sr-only">Plan {i + 1} of {PLANS.length}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Финальная CTA */}
      <section className="px-5 pb-16">
        <div className={`${s.block} ${s.stripesPink} mx-auto flex max-w-7xl flex-col items-start gap-8 bg-[#EC4899] p-10 text-black md:p-16`}>
          <h2 className="font-[family-name:var(--u-head)] text-[clamp(2.5rem,6vw,5rem)] leading-[1]">Tell me what you want built</h2>
          <div className="flex flex-wrap gap-4">
            <Link href={HERO.primary.href} className={`${s.btn} ${s.btnBig} bg-[#0F172A] text-white`}>{HERO.primary.label}</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnBig} bg-white text-[#0F172A]`}>Discord</a>
          </div>
        </div>
      </section>

      <footer className="border-t-4 border-[#0F172A]">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-5 py-8 font-semibold">
          <span className="font-[family-name:var(--u-head)]">SOUCAMPUS BUILDS</span>
          <ul className="flex flex-wrap gap-5">
            {SOCIALS.map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[#7C3AED]">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
