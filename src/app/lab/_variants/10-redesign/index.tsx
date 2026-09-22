import Image from "next/image";
import Link from "next/link";
import { Unbounded } from "next/font/google";
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
import s from "./styles.module.css";

// Вариант 10 — redesign-skill «redesign-existing-projects» (Leonxlnx).
//
// Единственный вариант, который НЕ начинает с нуля: скилл так устроен —
// «апгрейд существующего сайта без поломки функций». Поэтому здесь
// сохранено то, что делает главную узнаваемой (§ Preservation):
//   порядок секций живой главной (Hero → цифры → работы → страны →
//   отзывы → шаги → автор → тарифы → подвал), шрифт Unbounded в
//   заголовках, Plus Jakarta Sans в тексте, оранжевый, блок «Hi! My
//   name is Eugene» со скином.
//
// Что исправлено по аудиту скилла (Design Audit):
//   • три акцента (оранжевый, лайм, синий) → один оранжевый («More than
//     one accent color. Pick one.»);
//   • разноцветные отдельные слова в заголовке hero убраны;
//   • цифры — табличные, заголовки плотнее, абзацы не шире 65 знаков;
//   • ряд одинаковых карточек работ → асимметричная сетка;
//   • перетаскиваемая карусель отзывов → нативная прокрутка с
//     прилипанием (работает пальцем, колесом и клавиатурой без JS);
//   • текст на оранжевом — тёмный: белый на #F97316 даёт 2.8:1.
// Компоненты сайта НЕ импортируются: всё написано заново в этой папке.
const unbounded = Unbounded({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--r-display", preload: false });

export function Redesign({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 3);

  return (
    <div className={`${unbounded.variable} ${s.root}`}>
      <header className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link href="/" className={`${s.display} text-lg font-bold`}>SouCampus</Link>
        <nav aria-label="Main" className="hidden gap-7 text-[15px] text-[var(--muted)] md:flex">
          <Link href="/portfolio" className="hover:text-[var(--ink)]">Portfolio</Link>
          <Link href="/about" className="hover:text-[var(--ink)]">About me</Link>
          <Link href="/marketplace" className="hover:text-[var(--ink)]">Marketplace</Link>
        </nav>
        <Link href={HERO.primary.href} className={`${s.btn} ${s.btnAccent} h-10 px-4 text-sm`}>{HERO.primary.label}</Link>
      </header>

      {/* 1. Hero — тот же текст и те же две кнопки. */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-20 text-center md:pt-28">
        <div className={s.glow} aria-hidden="true" />
        <h1 className={`${s.display} max-w-4xl text-[clamp(2.4rem,6vw,4.75rem)] font-extrabold leading-[1.04] tracking-[-0.035em] [text-wrap:balance]`}>
          {HERO.title}
        </h1>
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)]">{HERO.lede}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href={HERO.secondary.href} className={`${s.btn} ${s.btnAccent} h-12 px-6`}>{HERO.secondary.label}</Link>
          <Link href={HERO.primary.href} className={`${s.btn} ${s.btnLine} h-12 px-6`}>{HERO.primary.label}</Link>
        </div>
      </section>

      {/* 2. Цифры — одна линия акцента вместо трёхцветной полосы. */}
      <section aria-label="In numbers" className="border-y border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl divide-y divide-[var(--line)] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.id} className="px-2 py-10 text-center sm:px-6">
              <p className={`${s.display} text-[clamp(2.5rem,5vw,3.75rem)] font-extrabold tabular-nums tracking-[-0.04em]`}>
                {stat.value}<span className="text-[var(--accent-text)]">{stat.suffix}</span>
              </p>
              <p className="mt-2 text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Работы — асимметричная сетка вместо ряда одинаковых. */}
      <section aria-labelledby="r-work" className="mx-auto max-w-6xl px-5 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="r-work" className={`${s.display} text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`}>A few recent projects</h2>
            <p className="mt-2 text-[var(--muted)]">See the full catalog in Portfolio.</p>
          </div>
          <Link href="/portfolio" className="font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">Portfolio</Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-6 md:grid-rows-[repeat(2,minmax(0,280px))]">
          {work.map((p, i) => (
            <Link
              key={p.slug}
              href={`/portfolio/${p.slug}`}
              className={`group relative min-h-[240px] overflow-hidden rounded-2xl md:col-span-3 ${i === 0 ? "md:row-span-2" : ""}`}
            >
              <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                <div>
                  <p className="text-sm text-white/75">{p.tag}</p>
                  <h3 className={`${s.display} text-lg font-bold`}>{p.title}</h3>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-white/80">{p.size}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Страны — бегущая строка, но останавливается при наведении. */}
      <section aria-label="Clients from ten countries" className={s.marquee}>
        <div className={s.track}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-10 pr-10">
              {COUNTRIES.map((c) => (
                <li key={c.id} className="flex items-center gap-3 whitespace-nowrap font-medium">
                  <Image src={c.src} alt="" width={28} height={28} className="rounded-full" />
                  {c.label}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* 5. Отзывы */}
      <section aria-labelledby="r-reviews" className="py-24">
        <h2 id="r-reviews" className={`${s.display} mx-auto max-w-6xl px-5 text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`}>
          Hear from clients working with me
        </h2>
        <ul className={s.reviews}>
          {reviews.map((r) => (
            <li key={r.slug} className="flex w-[min(86vw,380px)] shrink-0 snap-start flex-col justify-between gap-6 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6">
              <p className="leading-relaxed">{noDash(r.text)}</p>
              <p className="text-sm">
                <span className="font-semibold">{r.flag} {r.name}</span>
                <span className="block text-[var(--muted)]">{r.role}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Как это работает */}
      <section aria-labelledby="r-steps" className="mx-auto max-w-6xl px-5 py-24">
        <h2 id="r-steps" className={`${s.display} text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`}>How it works</h2>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 bg-[var(--card)] p-6">
              <span className={`${s.display} text-sm font-bold text-[var(--accent-text)] tabular-nums`}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-[var(--muted)]">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 7. Автор */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-[var(--card)] p-8 md:grid-cols-[auto_1fr] md:p-14">
          <div className={s.skin}>
            <Image src="/aboutme/soucampusModel.png" alt="SouCampus, my Minecraft skin" width={276} height={368} className="relative h-auto w-[180px] [image-rendering:pixelated] md:w-[220px]" />
          </div>
          <div>
            <h2 className={`${s.display} text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`}>Hi! My name is Eugene c:</h2>
            <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-[var(--muted)]">
              8 years building worlds in Minecraft professionally. My goal is to turn every idea into a map worth exploring.
            </p>
            <Link href="/about" className="mt-6 inline-block font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">About me</Link>
          </div>
        </div>
      </section>

      {/* 8. Тарифы — bento сохранено, но с одной выделенной ячейкой. */}
      <section aria-labelledby="r-plans" className="mx-auto max-w-6xl px-5 py-24">
        <h2 id="r-plans" className={`${s.display} text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`}>Plans</h2>
        <p className="mt-2 text-[var(--muted)]">{PLANS_NOTE}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          {PLANS.map((plan, i) => {
            const strong = plan.name === "Lifetime";
            return (
              <div
                key={plan.name}
                className={`flex flex-col justify-between gap-8 rounded-2xl p-6 ${i < 3 ? "md:col-span-2" : "md:col-span-3"} ${
                  strong ? "bg-[var(--accent)] text-[#1c1917]" : "border border-[var(--line)] bg-[var(--card)]"
                }`}
              >
                <p className={`${s.display} font-bold`}>{plan.name}</p>
                <div>
                  <p className={`${s.display} text-3xl font-extrabold tabular-nums tracking-[-0.03em]`}>{plan.price}</p>
                  <p className={`mt-2 text-[15px] leading-relaxed ${strong ? "text-[#1c1917]/80" : "text-[var(--muted)]"}`}>{plan.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Подвал */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className={`${s.display} text-xl font-bold`}>SouCampus</p>
            <p className="mt-3 max-w-xs text-[var(--muted)]">Custom Minecraft builds on order: castles, spawns, cities, and everything in between.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={HERO.primary.href} className={`${s.btn} ${s.btnAccent} h-11 px-5`}>{HERO.primary.label}</Link>
              <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnLine} h-11 px-5`}>Discord</a>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-[var(--muted)]">
            <li className="font-semibold text-[var(--ink)]">Studio</li>
            <li><Link href="/portfolio" className="hover:text-[var(--ink)]">Portfolio</Link></li>
            <li><Link href="/about" className="hover:text-[var(--ink)]">About me</Link></li>
            <li><Link href="/contact" className="hover:text-[var(--ink)]">Contact</Link></li>
          </ul>
          <ul className="flex flex-col gap-2 text-[var(--muted)]">
            <li className="font-semibold text-[var(--ink)]">Follow</li>
            {SOCIALS.slice(1, 5).map((l) => (
              <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer" className="hover:text-[var(--ink)]">{l.label}</a></li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
