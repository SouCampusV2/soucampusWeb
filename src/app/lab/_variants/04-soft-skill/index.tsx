import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
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
import { labLink } from "../../_shared/pages";
import { Reveal } from "./client";
import { Bezel, EASE, IslandButton, SLUG, Shell } from "./shell";

// Вариант 4 — soft-skill «high-end-visual-design» (Leonxlnx). design-lab.
//
// Variance Engine (§3), выбрано под бриф «портфолио»:
//   Vibe   — Soft Structuralism: серебристо-белый фон, массивный жирный
//            гротеск, воздушные элементы с очень мягкими тенями.
//   Layout — Z-Axis Cascade: работы лежат внахлёст, как карточки на
//            столе, с поворотом −2°/3° (на телефоне повороты сняты).
// Обязательное из скилла:
//   • «Double-Bezel» у каждой карточки: внешняя оправа + внутреннее ядро
//     с концентрическим радиусом (§4.A);
//   • кнопка «button-in-button»: стрелка в своём кружке у правого края,
//     при наведении едет по диагонали (§4.B, §5.B);
//   • остров-навбар, гамбургер, который морфится в X, меню на весь экран
//     со ступенчатым появлением ссылок (§5.A);
//   • всё входит в экран тяжёлым подъёмом с размытием, через
//     IntersectionObserver (§5.C); кривые только свои, не ease-in-out.

export function SoftSkill({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 5);

  return (
    <Shell page="home">
      {/* Hero */}
      <section className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 pb-24 pt-36 md:px-8">
        <Reveal>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5b606b] ring-1 ring-black/5">
            Minecraft builds on order
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-8 max-w-5xl text-[clamp(3rem,7.4vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            SouCampus crafts your ideas and dreams
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-lg leading-relaxed text-[#5b606b]">{HERO.lede}</p>
            <div className="flex flex-wrap gap-3">
              <IslandButton href={labLink(SLUG, HERO.primary.href)} label={HERO.primary.label} dark />
              <IslandButton href={labLink(SLUG, HERO.secondary.href)} label={HERO.secondary.label} />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Цифры — асимметричное bento в двойных рамках. */}
      <section aria-label="In numbers" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
        <div className="grid gap-5 md:grid-cols-12">
          {stats.map((stat, i) => (
            <Reveal key={stat.id} delay={i * 90} className={i === 0 ? "md:col-span-6 md:row-span-2" : "md:col-span-6"}>
              <Bezel className="h-full">
                <div className={`flex h-full flex-col justify-between gap-10 p-8 ${i === 0 ? "md:min-h-[26rem]" : ""}`}>
                  <p className="text-[#5b606b]">{stat.label}</p>
                  <p className={`font-extrabold tracking-[-0.05em] tabular-nums ${i === 0 ? "text-[clamp(4rem,9vw,8rem)] leading-none" : "text-6xl"}`}>
                    {stat.value}
                    {stat.suffix}
                  </p>
                </div>
              </Bezel>
            </Reveal>
          ))}
          <Reveal delay={270} className="md:col-span-12">
            <Bezel>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-6 text-[#5b606b]">
                <span className="text-[#16181d]">Clients from</span>
                {COUNTRIES.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-2">
                    <Image src={c.src} alt="" width={18} height={18} className="rounded-full" />
                    {c.label}
                  </span>
                ))}
              </div>
            </Bezel>
          </Reveal>
        </div>
      </section>

      {/* Работы — каскад по оси Z. */}
      <section aria-labelledby="s-work" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-40">
        <Reveal>
          <h2 id="s-work" className="max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
            Recent builds, laid out on the table
          </h2>
        </Reveal>
        <div className="mt-16 flex flex-col gap-6 md:mt-24 md:gap-0">
          {work.map((p, i) => (
            <Reveal
              key={p.slug}
              delay={60}
              className={`md:w-[62%] ${i % 2 ? "md:ml-auto md:rotate-[2.5deg]" : "md:-rotate-[2deg]"} ${i > 0 ? "md:-mt-24" : ""}`}
              style={{ zIndex: i + 1 }}
            >
              <Bezel shadow>
                <Link href={`/portfolio/${p.slug}`} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(2rem-0.5rem)] rounded-b-none">
                    <Image src={p.image} alt={p.title} fill sizes="(min-width: 768px) 60vw, 100vw" className={`object-cover transition-transform duration-1000 ${EASE} group-hover:scale-[1.04]`} />
                  </div>
                  <div className="flex items-start justify-between gap-6 p-6">
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-[-0.03em]">{p.title}</h3>
                      <p className="mt-1 max-w-md text-[#5b606b]">{noDash(p.summary)}</p>
                    </div>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/5 transition-transform duration-500 ${EASE} group-hover:-translate-y-[2px] group-hover:translate-x-1`}>
                      <ArrowUpRight size={18} weight="light" />
                    </span>
                  </div>
                </Link>
              </Bezel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Отзывы — колонки-масонри в двойных рамках. */}
      <section aria-labelledby="s-reviews" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-40">
        <Reveal>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5b606b] ring-1 ring-black/5">Clients</span>
          <h2 id="s-reviews" className="mt-6 text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">In their words</h2>
        </Reveal>
        <div className="mt-14 columns-1 gap-5 md:columns-2 lg:columns-3">
          {reviews.map((r, i) => (
            <Reveal key={r.slug} delay={(i % 3) * 90} className="mb-5 break-inside-avoid">
              <Bezel>
                <figure className="p-7">
                  <blockquote className="text-lg leading-relaxed">{noDash(r.text)}</blockquote>
                  <figcaption className="mt-6 text-sm text-[#5b606b]">
                    <span className="font-semibold text-[#16181d]">{r.flag} {r.name}</span>
                    <br />
                    {r.role}
                  </figcaption>
                </figure>
              </Bezel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Шаги */}
      <section aria-labelledby="s-steps" className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:grid-cols-[1fr_1.3fr] md:px-8 md:py-40">
        <Reveal>
          <h2 id="s-steps" className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em] md:sticky md:top-32">
            Five steps, no surprises
          </h2>
        </Reveal>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 70}>
              <Bezel>
                <div className="flex gap-6 p-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#16181d] text-sm font-semibold text-white">{i + 1}</span>
                  <div>
                    <h3 className="text-xl font-extrabold tracking-[-0.02em]">{step.title}</h3>
                    <p className="mt-1 text-[#5b606b]">{step.text}</p>
                  </div>
                </div>
              </Bezel>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Тарифы */}
      <section aria-labelledby="s-plans" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-40">
        <Reveal>
          <h2 id="s-plans" className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">The build library</h2>
          <p className="mt-4 max-w-lg text-lg text-[#5b606b]">{PLANS_NOTE}</p>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-6">
          {PLANS.map((plan, i) => {
            const dark = plan.name === "Lifetime";
            return (
              <Reveal key={plan.name} delay={i * 70} className={i < 3 ? "md:col-span-2" : "md:col-span-3"}>
                <Bezel dark={dark} className="h-full">
                  <div className="flex h-full flex-col justify-between gap-12 p-7">
                    <p className={dark ? "text-white/60" : "text-[#5b606b]"}>{plan.name}</p>
                    <div>
                      <p className="text-4xl font-extrabold tracking-[-0.04em]">{plan.price}</p>
                      <p className={`mt-3 ${dark ? "text-white/70" : "text-[#5b606b]"}`}>{plan.text}</p>
                    </div>
                  </div>
                </Bezel>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Финал */}
      <section className="mx-auto max-w-6xl px-4 pt-24 md:px-8 md:pt-40">
        <Reveal>
          <Bezel dark>
            <div className="flex flex-col items-start gap-10 px-8 py-20 md:px-16 md:py-28">
              <h2 className="max-w-3xl text-[clamp(2.75rem,6.5vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                Tell me what you want built
              </h2>
              <div className="flex flex-wrap gap-3">
                <IslandButton href={labLink(SLUG, HERO.primary.href)} label={HERO.primary.label} light />
                <IslandButton href={DISCORD_INVITE} label="Discord" external ghostDark />
              </div>
            </div>
          </Bezel>
        </Reveal>
      </section>
    </Shell>
  );
}
