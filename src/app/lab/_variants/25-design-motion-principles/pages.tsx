import Image from "next/image";
import Link from "next/link";
import { DISCORD_INVITE, type LabData } from "../../_shared/content";
import { ABOUT, CONTACT, FAQ, PORTFOLIO, SKILLS, STUDIOS, TIMELINE, labHref } from "../../_shared/pages";
import { CopyInvite, Enter } from "./client";
import { SLUG, Shell } from "./shell";
import { Faq, SkillHover, SlabEstimator, WorkFilter } from "./studio";
import s from "./styles.module.css";

// Страницы студии в варианте Lenses (design-motion-principles). Веса линз
// те же, что у лендинга («Marketing / landing page»): Jakub главный, Jhey
// вторичный, Emil — точечно. На каждой странице по одной «игрушке» Jhey
// и полировка Jakub на всём остальном; навигация и формы не двигаются.
//
//   Portfolio → Jakub: фильтр с общей подложкой и layout-перестановкой
//   Contact   → Jhey: блок травы вытягивается в плиту размера карты;
//               Jakub: цифры меняются проявлением; аккордеон без рывков
//   About     → Jhey: линия пути заполняется скроллом на чистом CSS;
//               Jakub: подсветка навыков переезжает за указателем

// ── Portfolio ───────────────────────────────────────────────────────────

export function LensesPortfolio({ data }: { data: LabData }) {
  return (
    <Shell page="portfolio">
      <section className={s.intro}>
        <Enter>
          <p className={s.eyebrow}>{PORTFOLIO.eyebrow}</p>
          <h1 className={s.h1}>{PORTFOLIO.title}</h1>
        </Enter>
        <Enter i={1}>
          <p className={s.lede}>
            {data.projects.length} builds. {PORTFOLIO.lede}
          </p>
        </Enter>
        <Enter i={2}>
          <WorkFilter works={data.projects.map((p) => ({ slug: p.slug, title: p.title, tag: p.tag, image: p.image, size: p.size }))} />
        </Enter>
      </section>
      <FinalCall title="Tell me what you want built" />
    </Shell>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────

export function LensesContact() {
  return (
    <Shell page="contact">
      <section className={s.intro}>
        <Enter>
          <p className={s.eyebrow}>{CONTACT.eyebrow}</p>
          <h1 className={s.h1}>
            {CONTACT.titleStart} <span style={{ color: "var(--accent)" }}>{CONTACT.titleAccent}</span>
          </h1>
        </Enter>
        <Enter i={1}>
          <p className={s.lede}>{CONTACT.lede}</p>
        </Enter>
        <Enter i={2} className={s.actions}>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.glow}>
            <span>{CONTACT.primary}</span>
          </a>
          <CopyInvite />
        </Enter>
      </section>

      <section aria-label={CONTACT.estimateTitle} className={s.section} style={{ paddingTop: 48 }}>
        <Enter>
          <SlabEstimator />
        </Enter>
      </section>

      <section aria-label="Ways to start" className={s.section}>
        <div className={s.reviews} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Enter className={s.review}>
            <h2 className={s.h2} style={{ fontSize: 26 }}>{CONTACT.chatTitle}</h2>
            <p className={s.muted}>{CONTACT.chatText}</p>
          </Enter>
          <Enter i={1} className={s.review}>
            <h2 className={s.h2} style={{ fontSize: 26 }}>{CONTACT.answersTitle}</h2>
            <p className={s.muted}>{CONTACT.answersText}</p>
          </Enter>
        </div>
      </section>

      <section aria-labelledby="l-faq" className={s.section}>
        <Enter>
          <h2 id="l-faq" className={s.h2}>{CONTACT.faqTitle}</h2>
        </Enter>
        <Faq items={FAQ} />
      </section>

      <FinalCall title="Tell me what you want built" />
    </Shell>
  );
}

// ── About ───────────────────────────────────────────────────────────────

export function LensesAbout({ data }: { data: LabData }) {
  const cover = data.projects.find((p) => p.isFeatured) ?? data.projects[0];

  return (
    <Shell page="about">
      <section className={`${s.intro} ${s.aboutHero}`}>
        <div>
          <Enter>
            <p className={s.eyebrow}>{ABOUT.eyebrow}</p>
            <h1 className={s.h1}>{ABOUT.title}</h1>
          </Enter>
          <Enter i={1}>
            <p className={s.lede}>
              <b style={{ color: "var(--ink)" }}>{ABOUT.leadStrong}</b> {ABOUT.lead}
            </p>
          </Enter>
        </div>
        {/* Jhey: тот же блок травы, что на лендинге, — подпись автора. */}
        <div className={s.scene} aria-hidden="true">
          <div className={s.cube}>
            <span className={`${s.face} ${s.top}`} />
            <span className={`${s.face} ${s.bottom}`} />
            <span className={`${s.face} ${s.front}`} />
            <span className={`${s.face} ${s.back}`} />
            <span className={`${s.face} ${s.left}`} />
            <span className={`${s.face} ${s.right}`} />
          </div>
          <div className={s.shadow} />
        </div>
      </section>

      <section aria-label="In numbers" className={s.stats}>
        {ABOUT.facts.map((fact, i) => (
          <Enter key={fact.label} i={i} className={s.stat}>
            <b>{fact.value}</b>
            <span className={s.muted}>{fact.label}</span>
          </Enter>
        ))}
      </section>

      <section aria-labelledby="l-path" className={s.section}>
        <Enter>
          <h2 id="l-path" className={s.h2}>Fifteen years, step by step</h2>
          <p className={s.muted}>Built with {STUDIOS.join(", ")}.</p>
        </Enter>
        <div className={s.pathWrap}>
          <span className={s.pathFill} aria-hidden="true" />
          <ol className={s.path}>
          {TIMELINE.map((item) => (
            <li key={item.age} className={s.stage}>
              <Enter className={s.stageCard}>
                <span className={s.stageAge}>{item.age}</span>
                <h3>{item.title}</h3>
                <p className={s.muted}>{item.text}</p>
              </Enter>
            </li>
          ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="l-skills" className={s.section}>
        <Enter>
          <h2 id="l-skills" className={s.h2}>{ABOUT.skillsTitle}</h2>
          <p className={s.muted}>{ABOUT.skillsLede}</p>
        </Enter>
        <SkillHover
          groups={[
            { title: "Tools", items: SKILLS.tools },
            { title: "Craft", items: SKILLS.craft },
          ]}
        />
      </section>

      <section className={s.section}>
        <div className={s.slabWrap}>
          <Enter>
            {ABOUT.closing.map((text, i) => (
              <p key={text.slice(0, 16)} className={i === 0 ? undefined : s.muted} style={{ margin: i === 0 ? 0 : "16px 0 0" }}>
                {text}
              </p>
            ))}
          </Enter>
          {cover && (
            <Enter i={1}>
              <Link href={`/portfolio/${cover.slug}`} className={s.card}>
                <span className={s.cardImg}>
                  <Image src={cover.image} alt={cover.title} fill sizes="(min-width: 860px) 45vw, 100vw" />
                </span>
                <span className={s.cardTitle}>{cover.title}</span>
              </Link>
            </Enter>
          )}
        </div>
      </section>

      <FinalCall title="Let's build yours next" />
    </Shell>
  );
}

// ── Общий финал ─────────────────────────────────────────────────────────

function FinalCall({ title }: { title: string }) {
  return (
    <section className={`${s.section} ${s.final}`}>
      <Enter>
        <h2 className={s.h1}>{title}</h2>
      </Enter>
      <Enter i={1} className={s.actions}>
        <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={s.glow}>
          <span>{CONTACT.primary}</span>
        </a>
        <Link href={labHref(SLUG, "portfolio")} className={s.ghost}>See what I&apos;ve built</Link>
      </Enter>
    </section>
  );
}
