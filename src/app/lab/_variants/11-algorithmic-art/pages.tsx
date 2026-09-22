import Image from "next/image";
import Link from "next/link";
import { DISCORD_INVITE, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE } from "../../_shared/pages";
import { Atlas, Island, PlotEstimator } from "./atlas";
import { FinalCall, LEGEND, Shell, newSeed } from "./shell";

// Страницы студии в варианте Seed (algorithmic-art). Правило скилла —
// «90% алгоритма, 10% параметров» — держится и здесь: на каждой странице
// главное изображение не выбрано, а сгенерировано тем же алгоритмом, что
// карта на первом экране лендинга, из одного числа.
//
//   Portfolio → атлас: новый мир на каждый визит, работы расставлены по суше
//   Contact   → остров, который растёт с введённым размером карты
//   About     → семь островов, по одному на этап; с возрастом они крупнее
//
// Остальное нарочно тихое, цвета — только из палитры биомов.

const H1 = "text-[clamp(2.5rem,5.4vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]";
const H2 = "text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em]";
const MUTED = "text-[#e7eee8]/65";

// ── Portfolio ───────────────────────────────────────────────────────────

export function SeedPortfolio({ data }: { data: LabData }) {
  const { projects } = data;

  return (
    <Shell page="portfolio">
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <p className="text-sm text-[#e7d9a0]">{PORTFOLIO.eyebrow}</p>
        <h1 className={`${H1} mt-3 max-w-3xl`}>An atlas of {projects.length} built worlds</h1>
        <p className={`mt-5 max-w-2xl text-[17px] leading-relaxed ${MUTED}`}>{PORTFOLIO.lede}</p>
        <div className="mt-10">
          <Atlas initialSeed={newSeed()} places={projects.map((p) => ({ slug: p.slug, title: p.title, tag: p.tag }))} />
        </div>
      </section>

      {/* Указатель атласа: номер совпадает с меткой на карте. */}
      <section aria-labelledby="a-index" className="mx-auto max-w-6xl px-5 py-16">
        <h2 id="a-index" className={H2}>Index of places</h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/portfolio/${p.slug}`} className="group block">
                <div
                  className="relative aspect-[16/10] overflow-hidden rounded-xl ring-4"
                  style={{ ["--tw-ring-color" as string]: LEGEND[(i % 5) + 2] }}
                >
                  <Image src={p.image} alt={p.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 border-[#0d1210] bg-[#0d1210]/85 text-xs font-bold tabular-nums">
                    {i + 1}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="shrink-0 text-sm tabular-nums text-[#e7eee8]/55">{p.size}</p>
                </div>
                <p className={`mt-1 text-[15px] ${MUTED}`}>{noDash(p.summary)}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <FinalCall title="Tell me what world you want built" />
    </Shell>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function SeedContact() {
  return (
    <Shell page="contact">
      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div>
          <p className="text-sm text-[#e7d9a0]">{CONTACT.eyebrow}</p>
          <h1 className={`${H1} mt-3`}>
            {CONTACT.titleStart} <span className="text-[#e7d9a0]">{CONTACT.titleAccent}</span>
          </h1>
          <p className={`mt-5 max-w-md text-[17px] leading-relaxed ${MUTED}`}>{CONTACT.lede}</p>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="mt-8 inline-block rounded-full bg-[#e7d9a0] px-7 py-3.5 font-semibold text-[#0d1210] transition-transform active:scale-[0.98]">
            {CONTACT.primary}
          </a>
        </div>
        <dl className="grid gap-6 border-t border-[#e7eee8]/15 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div>
            <dt className="font-semibold">{CONTACT.chatTitle}</dt>
            <dd className={`mt-1 ${MUTED}`}>{CONTACT.chatText}</dd>
          </div>
          <div>
            <dt className="font-semibold">{CONTACT.answersTitle}</dt>
            <dd className={`mt-1 ${MUTED}`}>
              {CONTACT.answersText}{" "}
              <a href="#faq" className="text-[#e7d9a0] underline underline-offset-4">See the questions</a>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label={CONTACT.estimateTitle} className="mx-auto max-w-6xl px-5 py-12">
        <PlotEstimator seed={newSeed()} />
      </section>

      <section id="faq" aria-labelledby="a-faq" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-16">
        <h2 id="a-faq" className={H2}>{CONTACT.faqTitle}</h2>
        <div className="mt-8 grid gap-x-10 md:grid-cols-2">
          {FAQ.map((item, i) => (
            <details key={item.question} className="group border-t border-[#e7eee8]/15 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full transition-transform group-open:scale-150" style={{ background: LEGEND[(i % 5) + 2] }} />
                {item.question}
              </summary>
              <p className={`mt-3 pl-5 leading-relaxed ${MUTED}`}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <FinalCall title="Tell me what world you want built" />
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

// Остров этапа растёт с возрастом в трёх измерениях: клеток больше (от 14
// до 56), рамка на странице крупнее (от 72 до 168 px), а края опускаются
// слабее — суши становится больше, от островка до почти материка.
const ISLAND_MIN = 14;
const ISLAND_STEP = 7;
const FRAME_MIN = 72;
const FRAME_STEP = 16;
const EDGE_FIRST = 0.95;
const EDGE_LAST = 0.45;

export function SeedAbout() {
  const seed = newSeed();

  return (
    <Shell page="about">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-sm text-[#e7d9a0]">{ABOUT.eyebrow}</p>
          <h1 className={`${H1} mt-3`}>{ABOUT.title}</h1>
          <p className={`mt-5 max-w-xl text-[17px] leading-relaxed ${MUTED}`}>
            <strong className="font-semibold text-[#e7eee8]">{ABOUT.leadStrong}</strong> {ABOUT.lead}
          </p>
        </div>
        <div className="aspect-square w-full max-w-sm justify-self-center rounded-2xl bg-[#243f8a]/40 p-6 md:justify-self-end">
          <Island seed={seed} cells={72} label="A generated island, new on every visit" />
        </div>
      </section>

      <section aria-label="In numbers" className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
          {LEGEND.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
        </div>
        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          {ABOUT.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[#e7eee8]/60">{fact.label}</dt>
              <dd className="mt-2 text-6xl font-semibold tracking-[-0.04em] tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-10 ${MUTED}`}>
          Built with {STUDIOS.slice(0, -1).join(", ")} and {STUDIOS[STUDIOS.length - 1]}.
        </p>
      </section>

      {/* Этапы: у каждого свой остров из зерна визита плюс номер этапа.
          Острова растут — это не иллюстрация, а число: размер задаёт
          порядковый номер, как опыт задаёт масштаб построек. */}
      <section aria-labelledby="a-story" className="mx-auto max-w-6xl px-5 py-16">
        <h2 id="a-story" className={H2}>The world grows with the builder</h2>
        <ol className="mt-12">
          {TIMELINE.map((item, i) => {
            const frame = FRAME_MIN + i * FRAME_STEP;
            return (
              <li key={item.age} className="grid gap-6 border-t border-[#e7eee8]/15 py-10 md:grid-cols-[180px_1fr] md:gap-10">
                <div className="flex items-center justify-center md:justify-start">
                  <div className="rounded-xl bg-[#243f8a]/40 p-2" style={{ width: frame, height: frame }}>
                    <Island
                      seed={seed + i * 101}
                      cells={ISLAND_MIN + i * ISLAND_STEP}
                      edge={EDGE_FIRST + ((EDGE_LAST - EDGE_FIRST) * i) / (TIMELINE.length - 1)}
                      label={`Island for ${item.age}`}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm tabular-nums" style={{ color: LEGEND[(i % 5) + 2] }}>{item.age}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{item.title}</h3>
                  <p className={`mt-3 max-w-2xl leading-relaxed ${MUTED}`}>{item.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="a-skills" className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm text-[#e7d9a0]">{ABOUT.skillsEyebrow}</p>
        <h2 id="a-skills" className={`${H2} mt-3`}>{ABOUT.skillsTitle}</h2>
        <p className={`mt-3 max-w-2xl ${MUTED}`}>{ABOUT.skillsLede}</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {[
            { title: "Tools", items: SKILLS.tools },
            { title: "Craft", items: SKILLS.craft },
          ].map((group, g) => (
            <div key={group.title}>
              <h3 className="font-semibold">{group.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item, i) => (
                  <li key={item} className="flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-[15px]">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: LEGEND[((i + g * 3) % 5) + 2] }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16">
        {ABOUT.closing.map((text, i) => (
          <p key={text.slice(0, 16)} className={i === 0 ? "text-xl leading-relaxed" : `mt-6 text-lg leading-relaxed ${MUTED}`}>
            {text}
          </p>
        ))}
      </section>

      <FinalCall title="Let's grow your world next" />
    </Shell>
  );
}
