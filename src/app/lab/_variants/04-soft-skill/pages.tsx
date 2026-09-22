import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { DISCORD_INVITE, HERO, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE, labHref } from "../../_shared/pages";
import type { Project } from "@/lib/projects";
import { Reveal } from "./client";
import { AgencyEstimator } from "./estimator";
import { Bezel, EASE, Eyebrow, IslandButton, SLUG, Shell } from "./shell";

// Страницы студии в варианте Agency (soft-skill). Всё то же, что на
// лендинге: у каждой карточки двойная рамка, у каждой кнопки стрелка в
// своём кружке, всё входит в экран подъёмом с размытием, заголовки —
// массивный жирный гротеск с плотным трекингом, воздуха много.

const H1 = "mt-8 max-w-5xl text-[clamp(3rem,7.4vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.045em]";
const H2 = "text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]";
const MUTED = "text-[#5b606b]";

// ── Portfolio ───────────────────────────────────────────────────────────

// Асимметричная сетка на 12 колонок: пары 7+5 и 5+7 чередуются, каждая
// третья строка — три равные по 4. Никаких одинаковых рядов подряд —
// скилл запрещает «ровную сетку из трёх карточек» как шаблон.
const ROW_PATTERN = [
  ["md:col-span-7", "md:col-span-5"],
  ["md:col-span-4", "md:col-span-4", "md:col-span-4"],
  ["md:col-span-5", "md:col-span-7"],
];

function layoutRows(projects: Project[]) {
  const rows: { project: Project; span: string }[][] = [];
  let i = 0;
  let r = 0;
  while (i < projects.length) {
    const pattern = ROW_PATTERN[r % ROW_PATTERN.length];
    const slice = projects.slice(i, i + pattern.length);
    // Неполный последний ряд растягивается на всю ширину, а не оставляет дыру.
    const spans = slice.length === pattern.length ? pattern : slice.map(() => (slice.length === 1 ? "md:col-span-12" : "md:col-span-6"));
    rows.push(slice.map((project, k) => ({ project, span: spans[k] })));
    i += pattern.length;
    r += 1;
  }
  return rows;
}

export function AgencyPortfolio({ data }: { data: LabData }) {
  const featured = data.projects.filter((p) => p.isFeatured);
  const rest = data.projects.filter((p) => !p.isFeatured);

  return (
    <Shell page="portfolio">
      <section className="mx-auto flex min-h-[80dvh] max-w-6xl flex-col justify-center px-4 pb-16 pt-36 md:px-8">
        <Reveal>
          <Eyebrow>{PORTFOLIO.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h1 className={H1}>{PORTFOLIO.title}</h1>
        </Reveal>
        <Reveal delay={160}>
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className={`max-w-md text-lg leading-relaxed ${MUTED}`}>
              {data.projects.length} worlds on order, from spawns and castles to cities and RPG maps. {PORTFOLIO.lede}
            </p>
            <IslandButton href={labHref(SLUG, "contact")} label={HERO.primary.label} dark />
          </div>
        </Reveal>
      </section>

      {/* Избранное — тот же каскад по оси Z, что на лендинге. */}
      <section aria-labelledby="s-featured" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
        <Reveal>
          <h2 id="s-featured" className={`max-w-3xl ${H2}`}>Featured, laid out on the table</h2>
        </Reveal>
        <div className="mt-16 flex flex-col gap-6 md:mt-24 md:gap-0">
          {featured.map((p, i) => (
            <Reveal
              key={p.slug}
              delay={60}
              className={`md:w-[62%] ${i % 2 ? "md:ml-auto md:rotate-[2.5deg]" : "md:-rotate-[2deg]"} ${i > 0 ? "md:-mt-24" : ""}`}
              style={{ zIndex: i + 1 }}
            >
              <WorkCard project={p} shadow />
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="s-more" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow>{rest.length} more</Eyebrow>
          <h2 id="s-more" className={`mt-6 ${H2}`}>{PORTFOLIO.more}</h2>
        </Reveal>
        <div className="mt-14 flex flex-col gap-5">
          {layoutRows(rest).map((row, r) => (
            <div key={r} className="grid gap-5 md:grid-cols-12">
              {row.map(({ project, span }, k) => (
                <Reveal key={project.slug} delay={k * 90} className={span}>
                  <WorkCard project={project} compact />
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </section>

      <FinalCall title="Your world could be the next one here" />
    </Shell>
  );
}

// У компактной карточки высота картинки задана числом, а не пропорцией:
// в ряду 7+5 пропорция дала бы две разные высоты, и под узкой карточкой
// оставалась бы пустая белая полоса.
function WorkCard({ project, shadow = false, compact = false }: { project: Project; shadow?: boolean; compact?: boolean }) {
  return (
    <Bezel shadow={shadow} className="h-full">
      <Link href={`/portfolio/${project.slug}`} className="group flex h-full flex-col">
        <div className={`relative overflow-hidden rounded-[calc(2rem-0.5rem)] rounded-b-none ${compact ? "h-64 md:h-80" : "aspect-[16/10]"}`}>
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes={compact ? "(min-width: 768px) 45vw, 100vw" : "(min-width: 768px) 60vw, 100vw"}
            className={`object-cover transition-transform duration-1000 ${EASE} group-hover:scale-[1.04]`}
          />
        </div>
        <div className="flex flex-1 items-start justify-between gap-6 p-6">
          <div>
            <h3 className={`${compact ? "text-xl" : "text-2xl"} font-extrabold tracking-[-0.03em]`}>{project.title}</h3>
            <p className={`mt-1 max-w-md ${MUTED}`}>
              {compact ? `${project.size} · ${project.deadline}` : noDash(project.summary)}
            </p>
          </div>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/5 transition-transform duration-500 ${EASE} group-hover:-translate-y-[2px] group-hover:translate-x-1`}>
            <ArrowUpRight size={18} weight="light" />
          </span>
        </div>
      </Link>
    </Bezel>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function AgencyContact() {
  return (
    <Shell page="contact">
      <section className="mx-auto grid min-h-[90dvh] max-w-6xl items-center gap-14 px-4 pb-16 pt-36 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div>
          <Reveal>
            <Eyebrow>{CONTACT.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 text-[clamp(3rem,6.4vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              {CONTACT.titleStart} {CONTACT.titleAccent}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className={`mt-8 max-w-md text-lg leading-relaxed ${MUTED}`}>{CONTACT.lede}</p>
            <div className="mt-10">
              <IslandButton href={DISCORD_INVITE} label={CONTACT.primary} external dark />
            </div>
          </Reveal>
        </div>
        <Reveal delay={240}>
          <AgencyEstimator />
        </Reveal>
      </section>

      <section aria-label="Ways to start" className="mx-auto grid max-w-6xl gap-5 px-4 py-24 md:grid-cols-2 md:px-8 md:py-32">
        <Reveal>
          <Bezel className="h-full">
            <div className="flex h-full flex-col justify-between gap-12 p-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-[-0.03em]">{CONTACT.chatTitle}</h2>
                <p className={`mt-3 max-w-sm ${MUTED}`}>{CONTACT.chatText}</p>
              </div>
              <IslandButton href={DISCORD_INVITE} label={CONTACT.chatCta} external />
            </div>
          </Bezel>
        </Reveal>
        <Reveal delay={90}>
          <Bezel className="h-full">
            <div className="flex h-full flex-col justify-between gap-12 p-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-[-0.03em]">{CONTACT.answersTitle}</h2>
                <p className={`mt-3 max-w-sm ${MUTED}`}>{CONTACT.answersText}</p>
              </div>
              <IslandButton href="#faq" label="See the questions" />
            </div>
          </Bezel>
        </Reveal>
      </section>

      {/* FAQ: заголовок липнет слева, как «Five steps» на лендинге;
          вопросы — отдельные рамки. Плюс в кружке поворачивается в ×. */}
      <section id="faq" aria-labelledby="s-faq" className="mx-auto grid max-w-6xl scroll-mt-28 gap-12 px-4 py-24 md:grid-cols-[1fr_1.4fr] md:px-8 md:py-32">
        <Reveal>
          <h2 id="s-faq" className={`${H2} md:sticky md:top-32`}>{CONTACT.faqTitle}</h2>
        </Reveal>
        <div className="flex flex-col gap-4">
          {FAQ.map((item, i) => (
            <Reveal key={item.question} delay={(i % 4) * 60}>
              <Bezel>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-6 [&::-webkit-details-marker]:hidden">
                    <span className="text-lg font-extrabold tracking-[-0.02em]">{item.question}</span>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5 transition-transform duration-500 ${EASE} group-open:rotate-45`}>
                      <Plus size={16} weight="light" />
                    </span>
                  </summary>
                  <p className={`px-6 pb-6 leading-relaxed ${MUTED}`}>{item.answer}</p>
                </details>
              </Bezel>
            </Reveal>
          ))}
        </div>
      </section>

      <FinalCall title="Tell me what you want built" />
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function AgencyAbout({ data }: { data: LabData }) {
  const cover = data.projects.find((p) => p.isFeatured) ?? data.projects[0];

  return (
    <Shell page="about">
      <section className="mx-auto flex min-h-[85dvh] max-w-6xl flex-col justify-center px-4 pb-16 pt-36 md:px-8">
        <Reveal>
          <Eyebrow>{ABOUT.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={80}>
          <h1 className={H1}>{ABOUT.title}</h1>
        </Reveal>
        <Reveal delay={160}>
          <p className={`mt-10 max-w-xl text-lg leading-relaxed ${MUTED}`}>
            <strong className="font-semibold text-[#16181d]">{ABOUT.leadStrong}</strong> {ABOUT.lead}
          </p>
        </Reveal>
      </section>

      {/* Цифры: крупная карточка с постройкой слева, три цифры и студии
          справа — асимметричное bento, как «In numbers» на лендинге. */}
      <section aria-label="In numbers" className="mx-auto grid max-w-6xl gap-5 px-4 py-16 md:grid-cols-12 md:px-8">
        {cover && (
          <Reveal className="md:col-span-6 md:row-span-2">
            <Bezel shadow className="h-full">
              <div className="relative h-full min-h-[22rem]">
                <Image src={cover.image} alt={cover.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            </Bezel>
          </Reveal>
        )}
        {ABOUT.facts.map((fact, i) => (
          <Reveal key={fact.label} delay={90 * (i + 1)} className={i === 0 ? "md:col-span-6" : "md:col-span-3"}>
            <Bezel className="h-full">
              <div className="flex h-full flex-col justify-between gap-8 p-7">
                <p className={MUTED}>{fact.label}</p>
                <p className={`font-extrabold leading-none tracking-[-0.05em] tabular-nums ${i === 0 ? "text-[clamp(4rem,8vw,7rem)]" : "text-6xl"}`}>{fact.value}</p>
              </div>
            </Bezel>
          </Reveal>
        ))}
        <Reveal delay={360} className="md:col-span-12">
          <Bezel dark>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 p-6">
              <span className="text-white/60">Built with</span>
              {STUDIOS.map((studio) => (
                <span key={studio} className="text-xl font-extrabold tracking-[-0.02em]">{studio}</span>
              ))}
            </div>
          </Bezel>
        </Reveal>
      </section>

      {/* История — липкий заголовок слева, этапы справа в рамках. */}
      <section aria-labelledby="s-story" className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:grid-cols-[1fr_1.4fr] md:px-8 md:py-40">
        <Reveal>
          <h2 id="s-story" className={`${H2} md:sticky md:top-32`}>Fifteen years, seven turns</h2>
        </Reveal>
        <ol className="flex flex-col gap-4">
          {TIMELINE.map((item, i) => (
            <li key={item.age}>
              <Reveal delay={(i % 3) * 70}>
                <Bezel>
                  <div className="p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-2xl font-extrabold tracking-[-0.03em]">{item.title}</h3>
                      <span className="rounded-full bg-[#16181d] px-3 py-1 text-sm font-semibold text-white">{item.age}</span>
                    </div>
                    <p className={`mt-4 leading-relaxed ${MUTED}`}>{item.text}</p>
                  </div>
                </Bezel>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="s-skills" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
        <Reveal>
          <Eyebrow>{ABOUT.skillsEyebrow}</Eyebrow>
          <h2 id="s-skills" className={`mt-6 ${H2}`}>{ABOUT.skillsTitle}</h2>
          <p className={`mt-4 max-w-xl text-lg ${MUTED}`}>{ABOUT.skillsLede}</p>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
          <SkillGroup title="Tools" items={SKILLS.tools} dark />
          <SkillGroup title="Craft" items={SKILLS.craft} delay={90} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-24 md:px-8">
        <Reveal>
          <p className="text-[clamp(1.5rem,2.6vw,2.25rem)] font-semibold leading-[1.3] tracking-[-0.02em]">{ABOUT.closing[0]}</p>
        </Reveal>
        <Reveal delay={90}>
          <p className={`mt-10 max-w-2xl text-lg leading-relaxed ${MUTED}`}>{ABOUT.closing[1]}</p>
        </Reveal>
      </section>

      <FinalCall title="Let's build yours next" />
    </Shell>
  );
}

function SkillGroup({ title, items, dark = false, delay = 0 }: { title: string; items: readonly string[]; dark?: boolean; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <Bezel dark={dark} className="h-full">
        <div className="p-7">
          <p className={dark ? "text-white/60" : MUTED}>{title}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {items.map((item) => (
              <li
                key={item}
                className={`rounded-full px-4 py-2 font-medium ${dark ? "bg-white/10 text-white" : "bg-[#eceef1] text-[#16181d]"}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Bezel>
    </Reveal>
  );
}

// ── Общий финал — тёмная рамка, как на лендинге ─────────────────────────

function FinalCall({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 md:px-8 md:pt-32">
      <Reveal>
        <Bezel dark>
          <div className="flex flex-col items-start gap-10 px-8 py-20 md:px-16 md:py-28">
            <h2 className="max-w-3xl text-[clamp(2.75rem,6.5vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">{title}</h2>
            <div className="flex flex-wrap gap-3">
              <IslandButton href={DISCORD_INVITE} label={CONTACT.primary} external light />
              <IslandButton href={labHref(SLUG, "portfolio")} label={HERO.secondary.label} ghostDark />
            </div>
          </div>
        </Bezel>
      </Reveal>
    </section>
  );
}
