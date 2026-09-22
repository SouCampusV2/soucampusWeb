import Image from "next/image";
import Link from "next/link";
import {
  Armchair,
  Buildings,
  ChatsCircle,
  Cube,
  FrameCorners,
  House,
  Lightning,
  MagicWand,
  MapTrifold,
  Mountains,
  PaintBrushHousehold,
  PaintBrush,
  PaintRoller,
  Selection,
  Target,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { DISCORD_INVITE, HERO, noDash, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, TIMELINE, labHref } from "../../_shared/pages";
import { EvolvedEstimator } from "./estimator";
import { SLUG, Shell } from "./shell";
import s from "./styles.module.css";

// Страницы студии в варианте Evolved (redesign-skill). Как и лендинг, они
// НЕ начинают с нуля: это живые /portfolio, /contact и /about после аудита
// скилла. Порядок секций и тексты сохранены (§ Preservation). Исправлено:
//
//   • все три страницы на одном акценте — оранжевом. На живых /contact
//     синий, на /about лайм: «More than one accent color. Pick one.»
//   • заглушки-скелеты («Photo coming soon», пустые прямоугольники на
//     /contact) заменены настоящими постройками: пустое место обещает то,
//     чего нет, и выглядит поломкой;
//   • публичных счётчиков просмотров нет (решение 2026-07-24);
//   • градиентный текст возраста на /about → сплошной цвет: он плохо
//     читается и нарушает контраст на светлой теме;
//   • таймлайн по центру → колонка «возраст | рассказ»: абзацы по центру
//     длиннее трёх строк читать тяжело;
//   • аккордеон на Motion → нативный details с плавной высотой.

const H1 = `${s.display} text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.035em] [text-wrap:balance]`;
const H2 = `${s.display} text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em]`;
const EYEBROW = "text-sm font-semibold text-[var(--accent-text)]";

// ── Portfolio ───────────────────────────────────────────────────────────

// Bento. Узор живого /portfolio (шесть карточек по кругу) на 6 колонках
// при dense-укладке оставляет пустые клетки справа — аудит скилла это
// ловит первым делом. Новый узор — группы по пять, каждая закрывает ровно
// три ряда: 4×2 + 2×1 + 2×1 (два ряда) и 3×1 + 3×1 (третий). Хвост из 1–4
// карточек получает свой узор, тоже без дыр.
const GROUP = [
  "lg:col-span-4 lg:row-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-3",
  "lg:col-span-3",
];

const TAIL: Record<number, string[]> = {
  1: ["lg:col-span-6"],
  2: ["lg:col-span-3", "lg:col-span-3"],
  3: GROUP.slice(0, 3),
  4: [...GROUP.slice(0, 3), "lg:col-span-6"],
};

function spanFor(index: number, total: number) {
  const tail = total % GROUP.length;
  const tailStart = total - tail;
  return index >= tailStart ? TAIL[tail][index - tailStart] : GROUP[index % GROUP.length];
}

export function EvolvedPortfolio({ data }: { data: LabData }) {
  const featured = data.projects.filter((p) => p.isFeatured).slice(0, 5);
  const rest = data.projects.filter((p) => !featured.includes(p));

  return (
    <Shell page="portfolio">
      <section className="relative mx-auto max-w-6xl px-5 pb-12 pt-16 md:pt-24">
        <div className={s.glow} aria-hidden="true" />
        <p className={EYEBROW}>{PORTFOLIO.eyebrow}</p>
        <h1 className={`${H1} mt-3 max-w-3xl`}>{PORTFOLIO.title}</h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)]">
          {data.projects.length} builds on order and for myself. {PORTFOLIO.lede}
        </p>

        {/* Панели раскрываются наведением и Tab, первая открыта, пока ни
            одна не выбрана. На телефоне — столбик, всё раскрыто. */}
        <div className={`${s.panels} mt-12`}>
          {featured.map((p, i) => (
            <Link key={p.slug} href={`/portfolio/${p.slug}`} className={`${s.panel} group`}>
              <Image src={p.image} alt={p.title} fill priority={i === 0} sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className={`${s.panelText} absolute inset-x-0 bottom-0 p-6 text-white`}>
                <p className="text-sm text-white/75">{p.tag} · {p.size}</p>
                <h2 className={`${s.display} mt-1 text-2xl font-bold`}>{p.title}</h2>
                <p className="mt-2 max-w-md text-white/80">{noDash(p.summary)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="r-more" className="mx-auto max-w-6xl border-t border-[var(--line)] px-5 py-20">
        <h2 id="r-more" className={H2}>{PORTFOLIO.more}</h2>
        <p className="mt-2 text-[var(--muted)]">{PORTFOLIO.lede}</p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-flow-dense lg:auto-rows-[220px] lg:grid-cols-6">
          {rest.map((p, i) => (
            <Link
              key={p.slug}
              href={`/portfolio/${p.slug}`}
              className={`group relative block min-h-[220px] overflow-hidden rounded-2xl ${spanFor(i, rest.length)}`}
            >
              <Image src={p.image} alt={p.title} fill sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {/* Чип тега — нейтральный. На живом сайте он лаймовый: второй
                  акцент, спорящий с заголовком работы за внимание. */}
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1c1917]">{p.tag}</span>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                <h3 className={`${s.display} text-lg font-bold`}>{p.title}</h3>
                <p className="shrink-0 text-sm tabular-nums text-white/80">{p.size}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function EvolvedContact({ data }: { data: LabData }) {
  const [a, b] = data.projects.filter((p) => p.isFeatured);

  return (
    <Shell page="contact">
      <section className="relative mx-auto grid max-w-6xl items-start gap-10 px-5 pb-16 pt-16 md:grid-cols-2 md:pt-24">
        <div className={s.glow} aria-hidden="true" />
        <div>
          <p className={EYEBROW}>{CONTACT.eyebrow}</p>
          <h1 className={`${H1} mt-3`}>
            {CONTACT.titleStart} <span className="text-[var(--accent-text)]">{CONTACT.titleAccent}</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-[var(--muted)]">{CONTACT.lede}</p>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnAccent} mt-8 h-12 px-6`}>
            {CONTACT.primary}
          </a>
        </div>
        <EvolvedEstimator />
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 border-t border-[var(--line)] px-5 py-16 md:grid-cols-2 md:gap-12 md:py-20">
        {a && (
          <div className="relative aspect-video overflow-hidden rounded-2xl">
            <Image src={a.image} alt={a.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
        <div>
          <h2 className={H2}>{CONTACT.chatTitle}</h2>
          <p className="mt-3 max-w-[46ch] text-[var(--muted)]">{CONTACT.chatText}</p>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="mt-6 inline-block font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">
            {CONTACT.chatCta}
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 border-t border-[var(--line)] px-5 py-16 md:grid-cols-2 md:gap-12 md:py-20">
        <div>
          <h2 className={H2}>{CONTACT.answersTitle}</h2>
          <p className="mt-3 max-w-[46ch] text-[var(--muted)]">{CONTACT.answersText}</p>
          <a href="#faq" className="mt-6 inline-block font-semibold underline decoration-[var(--accent)] decoration-2 underline-offset-[6px]">
            See the questions
          </a>
        </div>
        {b && (
          <div className="relative order-first aspect-video overflow-hidden rounded-2xl md:order-none">
            <Image src={b.image} alt={b.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </section>

      <section id="faq" aria-labelledby="r-faq" className="mx-auto max-w-6xl scroll-mt-8 border-t border-[var(--line)] px-5 py-16 md:py-20">
        <h2 id="r-faq" className={H2}>{CONTACT.faqTitle}</h2>
        <div className={`${s.faq} mt-8 max-w-3xl`}>
          {FAQ.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p className="max-w-[65ch] pb-6 leading-relaxed text-[var(--muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

// Иконки навыков — те же, что на живом /about (там выбор каждой объяснён
// в комментарии), чтобы проверялась вёрстка, а не новый набор картинок.
const SKILL_ICONS: Record<string, Icon> = {
  WorldEdit: Selection,
  VoxelSniper: Target,
  Axiom: MagicWand,
  Arceon: Cube,
  GoBrush: PaintBrush,
  GoPaint: PaintRoller,
  EzEdit: Lightning,
  "Communication with client": ChatsCircle,
  "Level design": MapTrifold,
  Composition: FrameCorners,
  Texturing: PaintBrushHousehold,
  Landscape: Mountains,
  Architecture: Buildings,
  Interior: Armchair,
  Exterior: House,
};

export function EvolvedAbout({ data }: { data: LabData }) {
  const cover = data.projects.find((p) => p.isFeatured) ?? data.projects[0];

  return (
    <Shell page="about">
      {/* Блок автора со скином — тот же, что открывает живой /about. */}
      <section className="relative mx-auto max-w-6xl px-5 pb-12 pt-16 md:pt-24">
        <div className={s.glow} aria-hidden="true" />
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-[var(--card)] p-8 md:grid-cols-[auto_1fr] md:p-14">
          <div className={s.skin}>
            <Image src="/aboutme/soucampusModel.png" alt="SouCampus, my Minecraft skin" width={276} height={368} priority className="relative h-auto w-[180px] [image-rendering:pixelated] md:w-[220px]" />
          </div>
          <div>
            <p className={EYEBROW}>{ABOUT.eyebrow}</p>
            <h1 className={`${H1} mt-3`}>{ABOUT.title}</h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[var(--muted)]">
              <b className="font-semibold text-[var(--ink)]">{ABOUT.leadStrong}</b> {ABOUT.lead}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="In numbers" className="border-y border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl divide-y divide-[var(--line)] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {ABOUT.facts.map((fact) => (
            <div key={fact.label} className="px-2 py-10 text-center sm:px-6">
              <p className={`${s.display} text-[clamp(2.5rem,5vw,3.75rem)] font-extrabold tabular-nums tracking-[-0.04em]`}>{fact.value}</p>
              <p className="mt-2 text-[var(--muted)]">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="r-story" className="mx-auto max-w-6xl px-5 py-20">
        <h2 id="r-story" className={H2}>How I got here</h2>
        <ol className="mt-10 border-t border-[var(--line)]">
          {TIMELINE.map((item) => (
            <li key={item.age} className="grid gap-3 border-b border-[var(--line)] py-8 md:grid-cols-[200px_1fr] md:gap-10">
              <p className={`${s.display} text-2xl font-extrabold tracking-[-0.03em] text-[var(--accent-text)]`}>{item.age}</p>
              <div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 max-w-[65ch] leading-relaxed text-[var(--muted)]">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="r-skills" className="mx-auto max-w-6xl px-5 py-20">
        <p className={EYEBROW}>{ABOUT.skillsEyebrow}</p>
        <h2 id="r-skills" className={`${H2} mt-3`}>{ABOUT.skillsTitle}</h2>
        <p className="mt-3 max-w-[60ch] text-[var(--muted)]">{ABOUT.skillsLede}</p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <SkillList title="Tools" items={SKILLS.tools} />
          <SkillList title="Craft" items={SKILLS.craft} />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 border-t border-[var(--line)] px-5 py-20 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5">
          {ABOUT.closing.map((text) => (
            <p key={text.slice(0, 16)} className="max-w-[60ch] text-lg leading-relaxed text-[var(--muted)]">{text}</p>
          ))}
          <Link href={labHref(SLUG, "contact")} className={`${s.btn} ${s.btnAccent} mt-2 h-12 w-fit px-6`}>{HERO.primary.label}</Link>
        </div>
        {/* Вместо «Photo coming soon» — настоящая постройка. Пустой
            прямоугольник на странице «о себе» выглядит поломкой. */}
        {cover && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image src={cover.image} alt={cover.title} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          </div>
        )}
      </section>
    </Shell>
  );
}

function SkillList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 flex flex-wrap gap-2.5">
        {items.map((label) => {
          const Icon = SKILL_ICONS[label];
          return (
            <li key={label} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium">
              {Icon && <Icon size={18} className="shrink-0 text-[var(--accent-text)]" />}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
